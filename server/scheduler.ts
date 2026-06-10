import "dotenv/config";
import {
  createMatchesForBrief,
  getActiveBriefs,
  getMatchesByBriefId,
  getUnnotifiedMatchCandidates,
  markMatchesNotified,
  type MatchNotificationCandidate,
  updateBriefLastRunAt,
} from "./db";
import { getListings, searchPayloadToMatchPayloads } from "./services/search";
import type { Match } from "../drizzle/schema";

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

function normalizeAustralianMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  const compact = input.replace(/[^0-9+]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("04")) return `+61${compact.slice(1)}`;
  if (compact.startsWith("4") && compact.length === 9) return `+61${compact}`;
  if (compact.startsWith("61")) return `+${compact}`;
  return compact.length > 0 ? compact : null;
}

function formatPrice(match: Pick<Match, "price" | "priceDisplay">): string {
  if (match.priceDisplay) return match.priceDisplay;
  if (match.price) return `$${match.price.toLocaleString("en-AU")}`;
  return "price not listed";
}

function formatAddress(match: Pick<Match, "address" | "suburb" | "state">): string {
  const location = [match.suburb, match.state].filter(Boolean).join(", ");
  return location ? `${match.address}, ${location}` : match.address;
}

function topMatches(matches: Match[], limit: number): Match[] {
  return [...matches].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
}

function buildEmailBody(firstName: string | null | undefined, matches: Match[]): string {
  const top = topMatches(matches, 10);
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const plural = matches.length === 1 ? "new property match" : "new property matches";
  const lines = top.map((match, index) => {
    const score = typeof match.score === "number" ? `${match.score}/100` : "not scored";
    const url = match.listingUrl ? `\n   ${match.listingUrl}` : "";
    return `${index + 1}. ${formatAddress(match)} — ${formatPrice(match)} — match score ${score}${url}`;
  });

  return [
    greeting,
    "",
    `Buyers Brief found ${matches.length} ${plural} for your active buyer brief this morning.`,
    "",
    ...lines,
    "",
    "Log in to Buyers Brief to review, hotlist, or reject these properties.",
    "",
    "Buyers Brief",
  ].join("\n");
}

function buildSmsBody(matches: Match[]): string {
  const top = topMatches(matches, 1)[0];
  if (!top) return "Buyers Brief found new property matches. Log in to review them.";
  const extra = matches.length > 1 ? ` plus ${matches.length - 1} more` : "";
  return `Buyers Brief: ${matches.length} new match${matches.length === 1 ? "" : "es"}${extra}. Top: ${formatAddress(top)} (${top.score}/100). Log in to review.`;
}

function getClickSendAuthToken(): string {
  const username = process.env.CLICKSEND_USERNAME || process.env.CLICKSEND_SUBACCOUNT_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;
  if (!username || !apiKey) {
    throw new Error("ClickSend notification dispatch is not configured. Set CLICKSEND_USERNAME and CLICKSEND_API_KEY in Railway.");
  }
  return Buffer.from(`${username}:${apiKey}`).toString("base64");
}

async function postClickSend(path: string, body: unknown) {
  const response = await fetch(`https://rest.clicksend.com/v3/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${getClickSendAuthToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let parsed: { response_code?: string; response_msg?: string } | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok || (parsed?.response_code && parsed.response_code !== "SUCCESS")) {
    throw new Error(parsed?.response_msg || text || response.statusText);
  }

  return parsed;
}

async function sendMatchEmail(toEmail: string, toName: string, matches: Match[]) {
  const fromName = process.env.CLICKSEND_EMAIL_FROM_NAME || process.env.CLICKSEND_FROM_NAME || "Buyers Brief";
  const fromAddressIdRaw = process.env.CLICKSEND_EMAIL_ADDRESS_ID || process.env.CLICKSEND_FROM_EMAIL_ADDRESS_ID || process.env.CLICKSEND_EMAIL_FROM_ID;
  const fromEmail = process.env.CLICKSEND_EMAIL_FROM || process.env.CLICKSEND_FROM_EMAIL || process.env.CLICKSEND_FROM || process.env.CLICKSEND_USERNAME;
  const from: Record<string, string | number> = { name: fromName };

  if (fromAddressIdRaw) {
    const fromAddressId = Number(fromAddressIdRaw);
    if (Number.isFinite(fromAddressId) && fromAddressId > 0) {
      from.email_address_id = fromAddressId;
    }
  }
  if (!from.email_address_id && fromEmail) {
    from.email = fromEmail;
  }

  await postClickSend("email/send", {
    to: [{ email: toEmail, name: toName }],
    from,
    subject: `Buyers Brief found ${matches.length} new property match${matches.length === 1 ? "" : "es"}`,
    body: buildEmailBody(toName, matches),
  });
}

async function sendMatchSms(toMobile: string, matches: Match[]) {
  const from = process.env.CLICKSEND_SMS_FROM || process.env.CLICKSEND_FROM_NAME || "BuyersBrief";
  await postClickSend("sms/send", {
    messages: [
      {
        source: "buyersbrief-scheduler",
        from,
        to: toMobile,
        body: buildSmsBody(matches),
      },
    ],
  });
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

async function runMatchScheduler() {
  const startedAt = Date.now();
  const delayMs = getEnvNumber("SCHEDULER_DELAY_MS", 3000);
  const limit = getEnvNumber("SCHEDULER_BRIEF_LIMIT", 500);
  const briefs = await getActiveBriefs(limit);

  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ briefId: number; message: string }> = [];

  console.log(`[Scheduler] Starting OpenAI daily search for ${briefs.length} active briefs`);

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
    event: "buyersbrief_daily_match_complete",
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

type NotificationGroup = {
  key: string;
  user: MatchNotificationCandidate["user"];
  brief: MatchNotificationCandidate["brief"];
  matches: Match[];
};

function groupNotificationCandidates(candidates: MatchNotificationCandidate[]): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();
  for (const candidate of candidates) {
    const key = `${candidate.user.id}:${candidate.brief.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.matches.push(candidate.match);
    } else {
      groups.set(key, {
        key,
        user: candidate.user,
        brief: candidate.brief,
        matches: [candidate.match],
      });
    }
  }
  return Array.from(groups.values());
}

async function dispatchNotificationGroup(group: NotificationGroup) {
  const notifications = group.user.notifications || {};
  const emailEnabled = notifications.dailyEmail !== false;
  const smsEnabled = notifications.hotSms === true;
  const displayName = [group.user.firstName, group.user.lastName].filter(Boolean).join(" ") || group.user.email;
  const sentChannels: string[] = [];

  if (emailEnabled && group.user.email) {
    await sendMatchEmail(group.user.email, displayName, group.matches);
    sentChannels.push("email");
  }

  if (smsEnabled && group.user.smsConsent === 1) {
    const mobile = normalizeAustralianMobile(group.user.mobile);
    if (mobile) {
      await sendMatchSms(mobile, group.matches);
      sentChannels.push("sms");
    }
  }

  if (sentChannels.length === 0) {
    return { sentChannels, skipped: true, reason: "No enabled notification channel for user" };
  }

  await markMatchesNotified(group.matches.map((match) => match.id));
  return { sentChannels, skipped: false, reason: null };
}

async function runNotificationScheduler() {
  const startedAt = Date.now();
  const limit = getEnvNumber("SCHEDULER_NOTIFY_LIMIT", 1000);
  const candidates = await getUnnotifiedMatchCandidates(limit);
  const groups = groupNotificationCandidates(candidates);

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let marked = 0;
  const errors: Array<{ userId: number; briefId: number; message: string }> = [];

  console.log(`[Scheduler] Starting ClickSend notification dispatch for ${groups.length} user brief groups`);

  for (const group of groups) {
    try {
      const result = await dispatchNotificationGroup(group);
      if (result.skipped) {
        skipped += 1;
        console.log(`[Scheduler] User ${group.user.id}, brief ${group.brief.id}: skipped (${result.reason})`);
      } else {
        succeeded += 1;
        marked += group.matches.length;
        console.log(`[Scheduler] User ${group.user.id}, brief ${group.brief.id}: sent ${result.sentChannels.join("+")} for ${group.matches.length} matches`);
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ userId: group.user.id, briefId: group.brief.id, message });
      console.error(`[Scheduler] User ${group.user.id}, brief ${group.brief.id} notification failed: ${message}`);
    }
  }

  const durationMs = Date.now() - startedAt;
  console.log(JSON.stringify({
    event: "buyersbrief_daily_notify_complete",
    groups_run: groups.length,
    groups_succeeded: succeeded,
    groups_skipped: skipped,
    groups_failed: failed,
    matches_marked_notified: marked,
    duration_ms: durationMs,
    errors,
  }));

  if (failed > 0 && succeeded === 0 && groups.length > 0) {
    process.exitCode = 1;
  }
}

async function main() {
  const mode = (process.argv[2] || "match").toLowerCase();
  if (mode === "match") {
    await runMatchScheduler();
    return;
  }
  if (mode === "notify") {
    await runNotificationScheduler();
    return;
  }
  if (mode === "all") {
    await runMatchScheduler();
    if (process.exitCode && process.exitCode !== 0) return;
    await runNotificationScheduler();
    return;
  }
  throw new Error(`Unknown scheduler mode "${mode}". Use match, notify, or all.`);
}

main().catch((error) => {
  console.error("[Scheduler] Fatal error", error);
  process.exitCode = 1;
});
