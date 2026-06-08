import type { Express, Request, Response } from "express";
import type { Brief } from "../drizzle/schema";
import { getListings } from "./services/search";

type RestBriefInput = Record<string, unknown>;

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asStringArrayText(value: unknown): string | null {
  if (Array.isArray(value)) {
    const cleaned = value.map((item) => String(item).trim()).filter(Boolean);
    return cleaned.length ? JSON.stringify(cleaned) : null;
  }
  return asString(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const numeric = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function makePreviewBrief(input: RestBriefInput): Brief {
  const now = new Date();
  const budget = asNumber(input.budget ?? input.budget_display ?? input.budgetDisplay);
  const rawRadius = asNumber(input.radius ?? input.radiusKm);
  const rawLand = asNumber(input.land ?? input.landMinM2);
  const purchaseIntent = asString(input.purchase_intent ?? input.purchaseIntent ?? input.intent);

  return {
    id: 0,
    userId: 0,
    suburbs: asString(input.suburbs ?? input.suburb),
    type: asString(input.type ?? input.propertyType),
    beds: asString(input.beds),
    baths: asString(input.baths),
    parking: asString(input.parking),
    budgetDisplay: asString(input.budget_display ?? input.budgetDisplay) || (budget ? `$${budget.toLocaleString("en-AU")}` : null),
    budget,
    purchaseIntent: purchaseIntent === "invest" || purchaseIntent === "both" ? purchaseIntent : "live",
    flex: asString(input.flex),
    radiusKm: rawRadius,
    nonNegotiables: asStringArrayText(input.nonNegotiables),
    needs: asStringArrayText(input.needs),
    wants: asStringArrayText(input.wants),
    niceToHaves: asStringArrayText(input.niceToHaves),
    story: asString(input.story ?? input.buyerStory),
    finance: asString(input.finance ?? input.financeStatus),
    financeStatus: asString(input.financeStatus ?? input.finance),
    timeline: asString(input.timeline),
    landMinM2: rawLand,
    status: "active",
    tier: "free",
    lastRunAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function registerSearchApi(app: Express) {
  app.post("/api/search", async (req: Request, res: Response) => {
    try {
      const body = req.body as { brief?: RestBriefInput } | RestBriefInput | undefined;
      const input = body && "brief" in body && body.brief ? body.brief : body;
      if (!input || typeof input !== "object") {
        return res.status(400).json({
          error: "A brief object is required.",
          content: [{ type: "text", text: JSON.stringify({ results: [], total_found: 0 }) }],
        });
      }

      const brief = makePreviewBrief(input as RestBriefInput);
      const payload = await getListings(brief);

      return res.json({
        content: [{ type: "text", text: JSON.stringify(payload) }],
        search_timestamp: payload.search_timestamp,
        total_found: payload.total_found,
        results: payload.results,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Search API] GPT-4o search failed", error);
      return res.status(500).json({
        error: message,
        content: [{
          type: "text",
          text: JSON.stringify({
            search_timestamp: new Date().toISOString(),
            brief_summary: "Search failed",
            total_found: 0,
            results: [],
            search_notes: message,
          }),
        }],
      });
    }
  });
}
