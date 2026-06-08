import "dotenv/config";
import { createMatchesForBrief, getActiveBriefs, getMatchesByBriefId, updateBriefLastRunAt } from "./db";
import { getListings, searchPayloadToMatchPayloads } from "./services/search";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEnvNumber(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function matchKey(value: { listingUrl?: string | null; address?: string | null }): string {
  const listingUrl = value.listingUrl?.trim().toLowerCase();
  if (listingUrl) return `url:${listingUrl}`;
  return `address:${(value.address || "").trim().toLowerCase()}`;
}

async function processBrief(briefId: number) {
  const briefs = await getActiveBriefs(500);
  const brief = briefs.find((item) => item.id === briefId);
  if (!brief) throw new Error(`Active brief ${briefId} was not found`);

  const payload = await getListings(brief);
  const candidates = searchPayloadToMatchPayloads(payload);
  const existing = await getMatchesByBriefId(brief.id);
  const existingKeys = new Set(existing.map(matchKey));
  const newMatches = candidates.filter((candidate) => !existingKeys.has(matchKey(candidate)));

  if (newMatches.length > 0) {
    await createMatchesForBrief(brief.id, newMatches);
  }
  await updateBriefLastRunAt(brief.id);

  return {
    briefId: brief.id,
    totalFound: payload.total_found,
    candidates: candidates.length,
    inserted: newMatches.length,
  };
}

async function main() {
  const startedAt = Date.now();
  const delayMs = getEnvNumber("SCHEDULER_DELAY_MS", 3000);
  const limit = getEnvNumber("SCHEDULER_BRIEF_LIMIT", 500);
  const briefs = await getActiveBriefs(limit);

  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ briefId: number; message: string }> = [];

  console.log(`[Scheduler] Starting GPT-4o daily search for ${briefs.length} active briefs`);

  for (const brief of briefs) {
    try {
      const result = await processBrief(brief.id);
      succeeded += 1;
      console.log(`[Scheduler] Brief ${brief.id}: ${result.inserted}/${result.candidates} new matches inserted`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ briefId: brief.id, message });
      console.error(`[Scheduler] Brief ${brief.id} failed: ${message}`);
    }

    if (delayMs > 0) await sleep(delayMs);
  }

  const durationMs = Date.now() - startedAt;
  console.log(JSON.stringify({
    event: "buyersbrief_daily_search_complete",
    briefs_run: briefs.length,
    briefs_succeeded: succeeded,
    briefs_failed: failed,
    duration_ms: durationMs,
    errors,
  }));

  if (failed > 0 && succeeded === 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[Scheduler] Fatal error", error);
  process.exitCode = 1;
});
