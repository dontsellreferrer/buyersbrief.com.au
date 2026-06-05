import { readFileSync } from "node:fs";
import { join } from "node:path";
import { invokeLLM } from "../_core/llm";
import type { Match } from "../../drizzle/schema";

export type CmaConfidence = "high" | "medium" | "low" | "insufficient_data";

type CmaComparable = {
  rank: number;
  address: string;
  suburb: string | null;
  sale_price: number | null;
  sale_price_display: string;
  sale_date: string;
  bedrooms: number | null;
  bathrooms: number | null;
  land_size_m2: number | null;
  price_per_m2: number | null;
  distance_km: number | null;
  similarity: "high" | "medium" | "low";
  source_url: string | null;
  notes: string;
};

type CmaData = {
  cma_id: string;
  generated: string;
  protocol_version: string;
  subject: {
    address: string;
    suburb: string | null;
    state: string | null;
    postcode: string | null;
    property_type: string | null;
    bedrooms: number | null;
    bathrooms: number | null;
    parking: string | null;
    land_size_m2: number | null;
    asking_price: number | null;
    asking_display: string;
    days_on_market: number | null;
    listing_status: string;
    listing_source: string | null;
  };
  comparables: CmaComparable[];
  market_analysis: {
    suburb_median_12mo: number | null;
    suburb_median_display: string;
    suburb_median_source: string;
    comparables_median: number | null;
    comparables_median_display: string;
    avg_price_per_m2: number | null;
    days_on_market_avg: number | null;
    market_trend: "rising" | "flat" | "softening" | string;
    market_notes: string;
  };
  valuation: {
    conservative: number | null;
    conservative_display: string;
    midpoint: number | null;
    midpoint_display: string;
    optimistic: number | null;
    optimistic_display: string;
    asking_vs_midpoint: number | null;
    asking_vs_midpoint_pct: number | null;
    asking_assessment: string;
    confidence: CmaConfidence;
    confidence_reason: string;
  };
  liam_assessment: string;
  negotiating_note: string;
  search_notes: string;
  _review: {
    comps_count: number;
    comps_verified_settled: string;
    comps_within_12mo: string;
    comps_within_radius: string;
    no_asking_prices_used: string;
    subject_data_source: string;
  };
};

const SYSTEM_PROMPT_PATH = join(process.cwd(), "server/prompts/BuyersBrief_CMA_SystemPrompt_v1.txt");
const CMA_TEMPLATE_PATH = join(process.cwd(), "client/src/pages/cma.html");

function readText(path: string, fallback: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    console.warn(`[CMA] Failed to read ${path}; using fallback`, error);
    return fallback;
  }
}

const CMA_SYSTEM_PROMPT = readText(
  SYSTEM_PROMPT_PATH,
  "You are Liam, the BuyersBrief comparative market analysis analyst. Return only valid JSON in the requested schema.",
);

const CMA_HTML_TEMPLATE = readText(CMA_TEMPLATE_PATH, "");

function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `$${Math.round(value).toLocaleString("en-AU")}`;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }
  return null;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanJsonText(text: string): string {
  return text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function cmaIdFor(address: string): string {
  const prefix = address
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18) || "PROPERTY";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `CMA-${prefix}-${date}`;
}

function matchToSubject(match: Match, addressOverride?: string): CmaData["subject"] {
  return {
    address: addressOverride?.trim() || match.address,
    suburb: match.suburb,
    state: match.state,
    postcode: match.postcode,
    property_type: match.propertyType,
    bedrooms: match.bedrooms,
    bathrooms: match.bathrooms,
    parking: match.parking,
    land_size_m2: match.landSizeM2,
    asking_price: match.price,
    asking_display: match.priceDisplay || formatCurrency(match.price),
    days_on_market: match.daysOnMarket,
    listing_status: match.listingStatus,
    listing_source: match.listingUrl,
  };
}

function buildFallbackCmaData(match: Match, addressOverride?: string): CmaData {
  const subject = matchToSubject(match, addressOverride);
  const asking = subject.asking_price ?? 0;
  const midpoint = asking > 0 ? asking : null;
  const conservative = midpoint ? Math.round(midpoint * 0.94) : null;
  const optimistic = midpoint ? Math.round(midpoint * 1.06) : null;
  const suburb = subject.suburb || "the local market";

  return {
    cma_id: cmaIdFor(subject.address),
    generated: new Date().toISOString(),
    protocol_version: "2.0",
    subject,
    comparables: [],
    market_analysis: {
      suburb_median_12mo: midpoint,
      suburb_median_display: midpoint ? formatCurrency(midpoint) : "—",
      suburb_median_source: "Pending verified comparable-sales enrichment",
      comparables_median: midpoint,
      comparables_median_display: midpoint ? formatCurrency(midpoint) : "—",
      avg_price_per_m2: subject.land_size_m2 && midpoint ? Math.round(midpoint / subject.land_size_m2) : null,
      days_on_market_avg: subject.days_on_market,
      market_trend: "flat",
      market_notes: `Initial CMA archive generated for ${suburb}. Run enrichment with verified settled sales before relying on this as final offer guidance.`,
    },
    valuation: {
      conservative,
      conservative_display: formatCurrency(conservative),
      midpoint,
      midpoint_display: formatCurrency(midpoint),
      optimistic,
      optimistic_display: formatCurrency(optimistic),
      asking_vs_midpoint: null,
      asking_vs_midpoint_pct: null,
      asking_assessment: midpoint ? "aligned_with_available_listing_context" : "insufficient_data",
      confidence: "insufficient_data",
      confidence_reason: "No verified settled comparable-sales set was returned during generation, so confidence remains insufficient until enriched.",
    },
    liam_assessment: `This CMA has been archived for ${subject.address}. The current listing context is available, but verified comparable sales are required before setting a firm fair-value range.`,
    negotiating_note: "Use this archive as a holding report only until verified comparable sales are attached.",
    search_notes: "Generated from the hotlisted property context with no external comparable-sales enrichment available.",
    _review: {
      comps_count: 0,
      comps_verified_settled: "no — pending comparable-sales enrichment",
      comps_within_12mo: "unknown",
      comps_within_radius: "unknown",
      no_asking_prices_used: "no — listing context may have been used as the starting anchor",
      subject_data_source: "BuyersBrief hotlist match record",
    },
  };
}

function normalizeComparable(raw: unknown, rank: number, fallbackSuburb: string | null): CmaComparable {
  const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const salePrice = toNumber(item.sale_price ?? item.salePrice ?? item.price);
  const landSize = toNumber(item.land_size_m2 ?? item.landSizeM2);
  const pricePerM2 = toNumber(item.price_per_m2 ?? item.pricePerM2) ?? (salePrice && landSize ? Math.round(salePrice / landSize) : null);
  const similarity = item.similarity === "high" || item.similarity === "medium" || item.similarity === "low" ? item.similarity : "medium";

  return {
    rank: toNumber(item.rank) ?? rank,
    address: toNullableString(item.address) || (fallbackSuburb ? `${fallbackSuburb} comparable sale` : "Comparable sale"),
    suburb: toNullableString(item.suburb) || fallbackSuburb,
    sale_price: salePrice,
    sale_price_display: toNullableString(item.sale_price_display ?? item.salePriceDisplay) || formatCurrency(salePrice),
    sale_date: toNullableString(item.sale_date ?? item.saleDate) || "Date not supplied",
    bedrooms: toNumber(item.bedrooms),
    bathrooms: toNumber(item.bathrooms),
    land_size_m2: landSize,
    price_per_m2: pricePerM2,
    distance_km: toNumber(item.distance_km ?? item.distanceKm),
    similarity,
    source_url: toNullableString(item.source_url ?? item.sourceUrl),
    notes: toNullableString(item.notes) || "Comparable sale returned by the CMA generation model.",
  };
}

function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function normalizeCmaData(raw: unknown, match: Match, addressOverride?: string): CmaData {
  const fallback = buildFallbackCmaData(match, addressOverride);
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const subjectInput = data.subject && typeof data.subject === "object" ? data.subject as Record<string, unknown> : {};
  const subject = {
    ...fallback.subject,
    address: toNullableString(subjectInput.address) || fallback.subject.address,
    suburb: toNullableString(subjectInput.suburb) || fallback.subject.suburb,
    state: toNullableString(subjectInput.state) || fallback.subject.state,
    postcode: toNullableString(subjectInput.postcode) || fallback.subject.postcode,
    property_type: toNullableString(subjectInput.property_type ?? subjectInput.propertyType) || fallback.subject.property_type,
    bedrooms: toNumber(subjectInput.bedrooms) ?? fallback.subject.bedrooms,
    bathrooms: toNumber(subjectInput.bathrooms) ?? fallback.subject.bathrooms,
    parking: toNullableString(subjectInput.parking) || fallback.subject.parking,
    land_size_m2: toNumber(subjectInput.land_size_m2 ?? subjectInput.landSizeM2) ?? fallback.subject.land_size_m2,
    asking_price: toNumber(subjectInput.asking_price ?? subjectInput.askingPrice) ?? fallback.subject.asking_price,
    asking_display: toNullableString(subjectInput.asking_display ?? subjectInput.askingDisplay) || fallback.subject.asking_display,
    days_on_market: toNumber(subjectInput.days_on_market ?? subjectInput.daysOnMarket) ?? fallback.subject.days_on_market,
    listing_status: toNullableString(subjectInput.listing_status ?? subjectInput.listingStatus) || fallback.subject.listing_status,
    listing_source: toNullableString(subjectInput.listing_source ?? subjectInput.listingSource) || fallback.subject.listing_source,
  };

  const comparables = Array.isArray(data.comparables)
    ? data.comparables.map((item, index) => normalizeComparable(item, index + 1, subject.suburb)).slice(0, 8)
    : fallback.comparables;
  const comparableMedian = median(comparables.map((item) => item.sale_price).filter((price): price is number => typeof price === "number"));
  const midpoint = toNumber((data.valuation as Record<string, unknown> | undefined)?.midpoint) ?? comparableMedian ?? fallback.valuation.midpoint;
  const conservative = toNumber((data.valuation as Record<string, unknown> | undefined)?.conservative) ?? (midpoint ? Math.round(midpoint * 0.94) : fallback.valuation.conservative);
  const optimistic = toNumber((data.valuation as Record<string, unknown> | undefined)?.optimistic) ?? (midpoint ? Math.round(midpoint * 1.06) : fallback.valuation.optimistic);
  const marketInput = data.market_analysis && typeof data.market_analysis === "object" ? data.market_analysis as Record<string, unknown> : {};
  const valuationInput = data.valuation && typeof data.valuation === "object" ? data.valuation as Record<string, unknown> : {};
  const reviewInput = data._review && typeof data._review === "object" ? data._review as Record<string, unknown> : {};
  const confidence = valuationInput.confidence === "high" || valuationInput.confidence === "medium" || valuationInput.confidence === "low" || valuationInput.confidence === "insufficient_data"
    ? valuationInput.confidence
    : (comparables.length >= 3 ? "medium" : fallback.valuation.confidence);

  return {
    cma_id: toNullableString(data.cma_id ?? data.cmaId) || fallback.cma_id,
    generated: toNullableString(data.generated) || new Date().toISOString(),
    protocol_version: toNullableString(data.protocol_version ?? data.protocolVersion) || "2.0",
    subject,
    comparables,
    market_analysis: {
      suburb_median_12mo: toNumber(marketInput.suburb_median_12mo ?? marketInput.suburbMedian12mo) ?? comparableMedian ?? fallback.market_analysis.suburb_median_12mo,
      suburb_median_display: toNullableString(marketInput.suburb_median_display ?? marketInput.suburbMedianDisplay) || formatCurrency(toNumber(marketInput.suburb_median_12mo) ?? comparableMedian),
      suburb_median_source: toNullableString(marketInput.suburb_median_source ?? marketInput.suburbMedianSource) || fallback.market_analysis.suburb_median_source,
      comparables_median: toNumber(marketInput.comparables_median ?? marketInput.comparablesMedian) ?? comparableMedian,
      comparables_median_display: toNullableString(marketInput.comparables_median_display ?? marketInput.comparablesMedianDisplay) || formatCurrency(comparableMedian),
      avg_price_per_m2: toNumber(marketInput.avg_price_per_m2 ?? marketInput.avgPricePerM2) ?? median(comparables.map((item) => item.price_per_m2).filter((price): price is number => typeof price === "number")),
      days_on_market_avg: toNumber(marketInput.days_on_market_avg ?? marketInput.daysOnMarketAvg) ?? fallback.market_analysis.days_on_market_avg,
      market_trend: toNullableString(marketInput.market_trend ?? marketInput.marketTrend) || fallback.market_analysis.market_trend,
      market_notes: toNullableString(marketInput.market_notes ?? marketInput.marketNotes) || fallback.market_analysis.market_notes,
    },
    valuation: {
      conservative,
      conservative_display: toNullableString(valuationInput.conservative_display ?? valuationInput.conservativeDisplay) || formatCurrency(conservative),
      midpoint,
      midpoint_display: toNullableString(valuationInput.midpoint_display ?? valuationInput.midpointDisplay) || formatCurrency(midpoint),
      optimistic,
      optimistic_display: toNullableString(valuationInput.optimistic_display ?? valuationInput.optimisticDisplay) || formatCurrency(optimistic),
      asking_vs_midpoint: toNumber(valuationInput.asking_vs_midpoint ?? valuationInput.askingVsMidpoint),
      asking_vs_midpoint_pct: toNumber(valuationInput.asking_vs_midpoint_pct ?? valuationInput.askingVsMidpointPct),
      asking_assessment: toNullableString(valuationInput.asking_assessment ?? valuationInput.askingAssessment) || fallback.valuation.asking_assessment,
      confidence,
      confidence_reason: toNullableString(valuationInput.confidence_reason ?? valuationInput.confidenceReason) || fallback.valuation.confidence_reason,
    },
    liam_assessment: toNullableString(data.liam_assessment ?? data.liamAssessment) || fallback.liam_assessment,
    negotiating_note: toNullableString(data.negotiating_note ?? data.negotiatingNote) || fallback.negotiating_note,
    search_notes: toNullableString(data.search_notes ?? data.searchNotes) || fallback.search_notes,
    _review: {
      comps_count: toNumber(reviewInput.comps_count ?? reviewInput.compsCount) ?? comparables.length,
      comps_verified_settled: toNullableString(reviewInput.comps_verified_settled ?? reviewInput.compsVerifiedSettled) || (comparables.length ? "model returned comparable-sales set; verify source URLs before unconditional reliance" : fallback._review.comps_verified_settled),
      comps_within_12mo: toNullableString(reviewInput.comps_within_12mo ?? reviewInput.compsWithin12mo) || fallback._review.comps_within_12mo,
      comps_within_radius: toNullableString(reviewInput.comps_within_radius ?? reviewInput.compsWithinRadius) || fallback._review.comps_within_radius,
      no_asking_prices_used: toNullableString(reviewInput.no_asking_prices_used ?? reviewInput.noAskingPricesUsed) || fallback._review.no_asking_prices_used,
      subject_data_source: toNullableString(reviewInput.subject_data_source ?? reviewInput.subjectDataSource) || fallback._review.subject_data_source,
    },
  };
}

export function renderCmaHtml(cmaData: Record<string, unknown>): string {
  if (!CMA_HTML_TEMPLATE) return `<!doctype html><html><body><pre>${JSON.stringify(cmaData, null, 2)}</pre></body></html>`;

  const serialized = JSON.stringify(cmaData, null, 2).replace(/</g, "\\u003c");
  return CMA_HTML_TEMPLATE.replace(
    /const CMA_DATA = [\s\S]*?;\s*\n\s*function fmt/,
    `const CMA_DATA = ${serialized};\n\nfunction fmt`,
  );
}

export async function generateCmaForMatch(match: Match, addressOverride?: string): Promise<{ cmaData: Record<string, unknown>; renderedHtml: string; confidence: CmaConfidence }> {
  const fallback = buildFallbackCmaData(match, addressOverride);
  const userPayload = {
    instruction: "Generate the full BuyersBrief CMA JSON for this property. Return only valid JSON matching the attached renderer schema. Do not wrap in markdown.",
    required_schema_summary: {
      cma_id: "string",
      generated: "ISO datetime string",
      protocol_version: "2.0",
      subject: "property details",
      comparables: "array of verified or clearly caveated comparable settled sales",
      market_analysis: "suburb and comparable-sales metrics",
      valuation: "conservative/midpoint/optimistic range and confidence",
      liam_assessment: "buyer-facing assessment",
      negotiating_note: "buyer-facing negotiation guidance",
      search_notes: "data source and caveat notes",
      _review: "internal quality checks",
    },
    subject_property: fallback.subject,
    existing_match_context: {
      price: match.price,
      priceDisplay: match.priceDisplay,
      score: match.score,
      scoreBreakdown: match.scoreBreakdown,
      liamNote: match.liamNote,
      rawJson: match.rawJson,
    },
  };

  let normalized = fallback;
  try {
    const result = await invokeLLM({
      maxTokens: 8192,
      responseFormat: { type: "json_object" },
      messages: [
        { role: "system", content: CMA_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(userPayload, null, 2) },
      ],
    });
    const content = result.choices[0]?.message.content;
    const text = typeof content === "string" ? content : JSON.stringify(content || "");
    normalized = normalizeCmaData(JSON.parse(cleanJsonText(text)), match, addressOverride);
  } catch (error) {
    console.error("[CMA] OpenAI CMA generation failed; storing fallback archive", error);
    normalized = fallback;
  }

  return {
    cmaData: normalized as unknown as Record<string, unknown>,
    renderedHtml: renderCmaHtml(normalized as unknown as Record<string, unknown>),
    confidence: normalized.valuation.confidence,
  };
}
