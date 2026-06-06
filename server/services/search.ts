import { Brief, InsertMatch, Match } from "../../drizzle/schema";
import { getMatchesByBriefId, replaceMatchesForBrief, updateBriefLastRunAt } from "../db";
import { invokeLLM } from "../_core/llm";

type GeneratedMatch = {
  address: string;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: string | null;
  landSizeM2?: number | null;
  price?: number | null;
  priceDisplay?: string | null;
  daysOnMarket?: number | null;
  listingStatus?: "active" | "price_drop" | "under_offer" | "off_market" | "sold";
  listingUrl?: string | null;
  score?: number | null;
  scoreBreakdown?: Record<string, unknown> | null;
  liamNote?: string | null;
};

type GeneratedPayload = {
  matches: GeneratedMatch[];
};

export type AISearchMatchPayload = Omit<InsertMatch, "briefId">;

const DEFAULT_STATE = "NSW";

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
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // Existing schema stores list-like form fields as text. Fall through to CSV parsing.
  }
  return splitCsv(value);
}

function clampScore(score: number | null | undefined): number {
  if (typeof score !== "number" || Number.isNaN(score)) return 75;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function nullableInt(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.round(value);
}

function extractJsonObject(text: string): GeneratedPayload {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const direct = JSON.parse(cleaned) as GeneratedPayload;
  if (!Array.isArray(direct.matches)) {
    throw new Error("AI search response did not contain a matches array");
  }
  return direct;
}

function briefToPrompt(brief: Brief): string {
  const suburbs = splitCsv(brief.suburbs);
  const nonNegotiables = parseListField(brief.nonNegotiables);
  const needs = parseListField(brief.needs);
  const wants = parseListField(brief.wants);
  const niceToHaves = parseListField(brief.niceToHaves);

  return JSON.stringify({
    suburbs,
    propertyType: brief.type,
    beds: brief.beds,
    baths: brief.baths,
    parking: brief.parking,
    budgetDisplay: brief.budgetDisplay,
    budget: brief.budget,
    purchaseIntent: brief.purchaseIntent,
    flex: brief.flex,
    radiusKm: brief.radiusKm,
    nonNegotiables,
    needs,
    wants,
    niceToHaves,
    story: brief.story,
    financeStatus: brief.financeStatus || brief.finance,
    timeline: brief.timeline,
  }, null, 2);
}

function toInsertMatch(match: GeneratedMatch): AISearchMatchPayload {
  const rawJson = {
    ...(match as unknown as Record<string, unknown>),
    _buyersbriefSource: "anthropic_verified_source_only",
    _buyersbriefProvider: "anthropic",
    _verifiedSourceRecordsRequired: true,
  };
  return {
    address: match.address,
    suburb: match.suburb || null,
    state: match.state || DEFAULT_STATE,
    postcode: match.postcode || null,
    propertyType: match.propertyType || null,
    bedrooms: nullableInt(match.bedrooms),
    bathrooms: nullableInt(match.bathrooms),
    parking: match.parking || null,
    landSizeM2: nullableInt(match.landSizeM2),
    price: nullableInt(match.price),
    priceDisplay: match.priceDisplay || (match.price ? `$${Math.round(match.price).toLocaleString("en-AU")}` : "POA"),
    daysOnMarket: nullableInt(match.daysOnMarket),
    listingStatus: match.listingStatus || "active",
    listingUrl: match.listingUrl || null,
    score: clampScore(match.score),
    scoreBreakdown: match.scoreBreakdown || {},
    liamNote: match.liamNote || "Liam has identified this as a plausible fit for the buyer brief.",
    rawJson,
    status: "new",
  };
}

export async function generateAISearchMatchesForBrief(brief: Brief): Promise<AISearchMatchPayload[]> {
  const userPrompt = briefToPrompt(brief);

  const result = await invokeLLM({
    maxTokens: 4096,
    requireAnthropic: true,
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Liam, the BuyersBrief property matching analyst for Australian residential buyers. You must not invent, synthesize, approximate, or fabricate property listings, addresses, prices, days-on-market, listing statuses, or listing URLs. Only return matches from verified listing source records supplied by the application in the user payload. If no verified listing source records are supplied, return exactly {"matches":[]} rather than creating plausible-looking properties. Respect non-negotiables as hard filters and score each returned verified listing from 0 to 100. Return exactly this JSON object shape: {"matches":[{"address":"string","suburb":"string","state":"NSW|VIC|QLD|SA|WA|TAS|ACT|NT","postcode":"string","propertyType":"string","bedrooms":number,"bathrooms":number,"parking":"string","landSizeM2":number|null,"price":number|null,"priceDisplay":"string","daysOnMarket":number,"listingStatus":"active|price_drop|under_offer|off_market","listingUrl":string|null,"score":number,"scoreBreakdown":{"needsMet":["string"],"needsMissed":["string"],"wantsMet":["string"],"wantsMissed":["string"],"niceToHavesMet":["string"],"nnFlags":["string"],"rationale":"string"},"liamNote":"string"}]}. please output .json file only - no other output required.`,
      },
      {
        role: "user",
        content: `Buyer brief JSON:\n${userPrompt}`,
      },
    ],
  });

  const content = result.choices[0]?.message.content;
  const text = typeof content === "string" ? content : JSON.stringify(content || "");
  const parsed = extractJsonObject(text);
  const validMatches = parsed.matches.filter((match) => match.address && match.address.trim().length > 0);

  if (validMatches.length === 0) {
    throw new Error("No verified property matches were returned. The brief search now requires Anthropic plus verified listing source records; synthetic or template properties are not displayed.");
  }

  return validMatches.map(toInsertMatch);
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
