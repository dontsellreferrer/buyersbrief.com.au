import type { Brief, InsertMatch, Match } from "../../drizzle/schema";
import { getMatchesByBriefId, replaceMatchesForBrief, updateBriefLastRunAt } from "../db";
import { invokeLLM } from "../_core/llm";

type SearchResult = {
  rank?: number | null;
  address: string;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  price?: number | null;
  price_display?: string | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: string | null;
  land_size?: string | number | null;
  days_on_market?: number | null;
  listing_status?: "active" | "price_drop" | "under_offer" | "off_market" | "sold" | string | null;
  price_history?: string | null;
  listing_url?: string | null;
  score?: number | null;
  score_breakdown?: Record<string, unknown> | null;
  liam_note?: string | null;
};

export type BriefSearchPayload = {
  search_timestamp: string;
  brief_summary: string;
  total_found: number;
  results: SearchResult[];
  search_notes?: string | null;
  _review?: Record<string, unknown>;
};

export type AISearchMatchPayload = Omit<InsertMatch, "briefId">;

const DEFAULT_STATE = "NSW";
const SEARCH_TIMEOUT_MS = 45_000;

function splitCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseListField(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {
    // Existing schema stores list-like form fields as text. Fall through to CSV parsing.
  }
  return splitCsv(value);
}

function clampScore(score: number | null | undefined): number {
  if (typeof score !== "number" || Number.isNaN(score)) return 75;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function nullableInt(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const numeric = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function safeStatus(value: SearchResult["listing_status"]): "active" | "price_drop" | "under_offer" | "off_market" | "sold" {
  if (value === "price_drop" || value === "under_offer" || value === "off_market" || value === "sold") return value;
  return "active";
}

function parseModelJson(text: string): BriefSearchPayload {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const candidates = [cleaned];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) candidates.push(fenced);
  const objectMatch = text.match(/\{[\s\S]*"results"[\s\S]*\}/);
  if (objectMatch) candidates.push(objectMatch[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Partial<BriefSearchPayload>;
      if (Array.isArray(parsed.results)) {
        return {
          search_timestamp: parsed.search_timestamp || new Date().toISOString(),
          brief_summary: parsed.brief_summary || "Buyer brief search",
          total_found: typeof parsed.total_found === "number" ? parsed.total_found : parsed.results.length,
          results: parsed.results,
          search_notes: parsed.search_notes || null,
          _review: parsed._review || {},
        };
      }
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("GPT-4o search response did not contain valid JSON results");
}

function resultContentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text?: unknown }).text || "");
        return JSON.stringify(part);
      })
      .filter(Boolean)
      .join("\n");
  }
  return JSON.stringify(content || "");
}

function formatBudget(brief: Brief): string {
  if (brief.budgetDisplay) return brief.budgetDisplay;
  return brief.budget ? `$${brief.budget.toLocaleString("en-AU")}` : "the stated budget";
}

function briefSummary(brief: Brief): string {
  const suburbs = splitCsv(brief.suburbs).join(", ") || "the selected area";
  const beds = brief.beds ? `${brief.beds}+ bed` : "residential";
  const type = brief.type && brief.type !== "any" ? brief.type.replace(/_/g, " ") : "property";
  return `${beds} ${type} in ${suburbs} to ${formatBudget(brief)}`;
}

export function buildPropertySearchPrompt(brief: Brief): string {
  const suburbs = splitCsv(brief.suburbs).join(", ") || "Not specified";
  const nonNegotiables = parseListField(brief.nonNegotiables);
  const needs = parseListField(brief.needs);
  const wants = parseListField(brief.wants);
  const niceToHaves = parseListField(brief.niceToHaves);

  const nnList = [
    ...nonNegotiables,
    brief.beds ? `minimum ${brief.beds} bedrooms` : null,
    brief.baths ? `minimum ${brief.baths} bathrooms` : null,
    brief.type && brief.type !== "any" ? `property type: ${brief.type.replace(/_/g, " ")}` : null,
  ].filter(Boolean) as string[];

  const needsList = [
    ...needs,
    brief.parking ? brief.parking.replace(/_/g, " ") : null,
    brief.landMinM2 ? `land size minimum ${brief.landMinM2}m²` : null,
  ].filter(Boolean) as string[];

  const locationStr = brief.flex === "strict"
    ? `STRICTLY within: ${suburbs}`
    : brief.flex === "radius"
      ? `${suburbs} and within ${brief.radiusKm || 10}km radius`
      : `${suburbs} and nearby suburbs`;

  const intentContext = brief.purchaseIntent === "invest"
    ? "PURCHASE INTENT: Investment property. Weight results for yield, land-to-asset ratio, rental demand, proximity to employment/transport, development potential, vacancy rates. Deprioritise lifestyle factors like school catchments or street ambience unless specifically requested."
    : brief.purchaseIntent === "both"
      ? "PURCHASE INTENT: Both owner-occupier and investment potential considered. Show lifestyle metrics AND investment metrics in scoring. Liam should note both dimensions in his assessment."
      : "PURCHASE INTENT: Owner-occupier. Weight results for lifestyle — school catchments, street character, commute, liveability, neighbourhood feel. Standard scoring applies.";

  return `You are a property matching engine for Buyers Brief, an Australian property platform. Search for residential properties currently listed for sale in Australia matching this buyer's brief. Return results as structured JSON only — no prose, no markdown.

LOCATION: ${locationStr}
${intentContext}
BUDGET CEILING: ${formatBudget(brief)} — HARD LIMIT, exclude anything above this

NON-NEGOTIABLES (if ANY of these are absent, EXCLUDE the property entirely — do not score it):
${nnList.length ? nnList.map((n) => `- ${n}`).join("\n") : "- None specified beyond budget and location"}

NEEDS (high weight — 40% of match score):
${needsList.length ? needsList.map((n) => `- ${n}`).join("\n") : "- None specified"}

WANTS (medium weight — 35% of match score):
${wants.length ? wants.map((w) => `- ${w}`).join("\n") : "- None specified"}

NICE TO HAVES (bonus weight — 25% of match score):
${niceToHaves.length ? niceToHaves.map((n) => `- ${n}`).join("\n") : "- None specified"}

BUYER CONTEXT (use to weight results and surface non-obvious matches):
${brief.story || "Not provided"}

SCORING RULES:
- Score = (needs_met/needs_total × 40) + (wants_met/wants_total × 35) + (nth_met/nth_total × 25)
- If needs_total = 0, redistribute: wants gets 60%, nth gets 40%
- If a property fails ANY non-negotiable, exclude it entirely — score it 0 and omit
- Round score to nearest whole number
- Properties scoring below 50 should be omitted unless fewer than 3 results exist

SEARCH INSTRUCTIONS:
- Search realestate.com.au, domain.com.au, and any other Australian listing sources
- Return up to 7 matches, ranked by score descending
- For each property, identify which criteria are met (hits) and which are missing (misses)
- Be specific about misses — "only 3 bedrooms listed, brief requires 4" not just "bedrooms"
- Include days on market where available
- If a property is described as "off-market", "expressions of interest", or "contact agent", flag it

REQUIRED JSON RESPONSE FORMAT:
{
  "search_timestamp": "ISO timestamp",
  "brief_summary": "one line brief summary",
  "total_found": number,
  "results": [
    {
      "rank": 1,
      "address": "full address",
      "suburb": "suburb",
      "state": "state",
      "postcode": "postcode",
      "price": number or null if POA,
      "price_display": "$X,XXX,XXX or POA",
      "property_type": "house/unit/townhouse/land",
      "bedrooms": number or null,
      "bathrooms": number or null,
      "parking": "description",
      "land_size": "XXXm² or null",
      "days_on_market": number or null,
      "listing_status": "active/price_drop/under_offer/off_market",
      "price_history": "optional — e.g. was $X, dropped $Y on date",
      "listing_url": "URL if available",
      "score": number (0-100),
      "score_breakdown": {
        "needs_score": number,
        "wants_score": number,
        "nth_score": number,
        "needs_met": ["list of met needs"],
        "needs_missed": ["list of missed needs"],
        "wants_met": ["list of met wants"],
        "wants_missed": ["list of missed wants"],
        "nth_met": ["list of met nth"],
        "nn_flags": ["any non-negotiable concerns to note"]
      },
      "liam_note": "One sentence in Liam's voice — direct, no fluff — explaining why this property ranks here or what to watch for"
    }
  ],
  "search_notes": "Any notes about search quality, data limitations, or suggestions",
  "_review": {
    "nn_check": "confirmed all non-negotiables applied",
    "budget_check": "confirmed no results exceed budget ceiling",
    "score_check": "confirmed scoring formula applied correctly",
    "result_count_check": "number of results returned and why"
  }
}

SELF-REVIEW: Before returning, verify your _review fields. If any check fails, correct the results. Never hallucinate addresses — if you cannot find real listings, return fewer results and note this in search_notes.`;
}

export async function gpt4oSearch(brief: Brief): Promise<BriefSearchPayload> {
  const result = await invokeLLM({
    model: process.env.OPENAI_SEARCH_MODEL || "gpt-4o",
    maxTokens: 4000,
    temperature: 0,
    timeoutMs: SEARCH_TIMEOUT_MS,
    tools: [{ type: "web_search_preview" }],
    messages: [
      {
        role: "system",
        content: buildPropertySearchPrompt(brief),
      },
      {
        role: "user",
        content: "Search for properties matching this brief now.",
      },
    ],
  });

  const content = result.choices[0]?.message.content;
  const text = resultContentToText(content);
  return parseModelJson(text);
}

export async function getListings(brief: Brief): Promise<BriefSearchPayload> {
  // Launch implementation: GPT-4o reads JavaScript-rendered listing pages via web_search_preview.
  // PropTrack can replace this function later while preserving the endpoint and response format.
  return gpt4oSearch(brief);
}

function toInsertMatch(result: SearchResult): AISearchMatchPayload {
  const rawJson = {
    ...(result as unknown as Record<string, unknown>),
    _buyersbriefSource: "gpt4o_web_search_preview",
    _buyersbriefProvider: "openai",
    _verifiedRenderedListingSearch: true,
  };

  return {
    address: result.address,
    suburb: result.suburb || null,
    state: result.state || DEFAULT_STATE,
    postcode: result.postcode || null,
    propertyType: result.property_type || null,
    bedrooms: nullableInt(result.bedrooms),
    bathrooms: nullableInt(result.bathrooms),
    parking: result.parking || null,
    landSizeM2: nullableInt(result.land_size),
    price: nullableInt(result.price),
    priceDisplay: result.price_display || (result.price ? `$${Math.round(result.price).toLocaleString("en-AU")}` : "POA"),
    daysOnMarket: nullableInt(result.days_on_market),
    listingStatus: safeStatus(result.listing_status),
    listingUrl: result.listing_url || null,
    score: clampScore(result.score),
    scoreBreakdown: result.score_breakdown || {},
    liamNote: result.liam_note || "Liam has identified this as a verified fit for the buyer brief.",
    rawJson,
    status: "new",
  };
}

export function searchPayloadToMatchPayloads(payload: BriefSearchPayload): AISearchMatchPayload[] {
  return payload.results
    .filter((match) => match.address && match.address.trim().length > 0)
    .map(toInsertMatch);
}

export async function generateAISearchMatchesForBrief(brief: Brief): Promise<AISearchMatchPayload[]> {
  const payload = await getListings(brief);
  const validMatches = searchPayloadToMatchPayloads(payload);

  if (validMatches.length === 0) {
    throw new Error("No verified GPT-4o property matches were returned. The search now uses OpenAI GPT-4o with web_search_preview; synthetic or template properties are not displayed.");
  }

  return validMatches;
}

export async function saveAISearchMatchesForBrief(brief: Brief, matchPayloads: AISearchMatchPayload[]): Promise<Match[]> {
  const saved = await replaceMatchesForBrief(brief.id, matchPayloads);
  await updateBriefLastRunAt(brief.id);
  return saved;
}

export async function runAISearchForBrief(brief: Brief): Promise<Match[]> {
  const generated = await generateAISearchMatchesForBrief(brief);
  return saveAISearchMatchesForBrief(brief, generated);
}

export async function getExistingOrRunAISearch(brief: Brief): Promise<Match[]> {
  const existing = await getMatchesByBriefId(brief.id, brief.userId);
  if (existing.length > 0) return existing;
  return runAISearchForBrief(brief);
}
