import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  Brief,
  Cma,
  HotlistEntry,
  InsertBrief,
  InsertCma,
  InsertHotlistEntry,
  InsertMatch,
  Match,
  User,
  briefs,
  cmas,
  hotlist,
  matches,
  users,
} from "../drizzle/schema";

type PostgresClient = ReturnType<typeof postgres>;

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
// POSTGRES_URL takes priority (set in Railway). Falls back to DATABASE_URL if it's a postgres:// URL.
function getConnectionUrl(): string | undefined {
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
  if (process.env.DATABASE_URL?.startsWith("postgres")) return process.env.DATABASE_URL;
  return undefined;
}

function shouldRequireSsl(url: string): boolean {
  return !/localhost|127\.0\.0\.1|host\.docker\.internal/.test(url);
}

const productionSchemaStatements = [
  `DO $$ BEGIN
    CREATE TYPE "public"."purchase_intent" AS ENUM('live', 'invest', 'both');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "briefs" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "suburbs" text,
    "type" varchar(50),
    "beds" varchar(50),
    "baths" varchar(50),
    "parking" varchar(50),
    "budget_display" varchar(50),
    "budget" integer,
    "purchase_intent" "purchase_intent" DEFAULT 'live' NOT NULL,
    "flex" text,
    "non_negotiables" text,
    "needs" text,
    "wants" text,
    "nice_to_haves" text,
    "story" text,
    "finance" text,
    "timeline" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  );`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "user_id" integer;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "suburbs" text;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "type" varchar(50);`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "beds" varchar(50);`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "baths" varchar(50);`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "parking" varchar(50);`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "budget_display" varchar(50);`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "budget" integer;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "purchase_intent" "purchase_intent" DEFAULT 'live' NOT NULL;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "flex" text;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "non_negotiables" text;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "needs" text;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "wants" text;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "nice_to_haves" text;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "story" text;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "finance" text;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "timeline" text;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;`,
  `DO $$ BEGIN
    ALTER TABLE "briefs" ADD CONSTRAINT "briefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "public"."brief_status" AS ENUM('active', 'paused', 'completed');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "public"."cma_confidence" AS ENUM('high', 'medium', 'low', 'insufficient_data');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "public"."hotlist_status" AS ENUM('active', 'stale', 'under_offer', 'sold', 'removed');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "public"."listing_status" AS ENUM('active', 'price_drop', 'under_offer', 'off_market', 'sold');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "public"."match_status" AS ENUM('new', 'hotlisted', 'rejected', 'purchased');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "radius_km" integer;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "land_min_m2" integer;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "finance_status" text;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "status" "brief_status" DEFAULT 'active' NOT NULL;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "tier" "tier" DEFAULT 'free' NOT NULL;`,
  `ALTER TABLE "briefs" ADD COLUMN IF NOT EXISTS "last_run_at" timestamp;`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notifications" jsonb;`,
  `CREATE TABLE IF NOT EXISTS "matches" (
    "id" serial PRIMARY KEY NOT NULL,
    "brief_id" integer NOT NULL,
    "found_at" timestamp DEFAULT now() NOT NULL,
    "address" text NOT NULL,
    "suburb" text,
    "state" text,
    "postcode" text,
    "property_type" text,
    "bedrooms" integer,
    "bathrooms" integer,
    "parking" text,
    "land_size_m2" integer,
    "price" integer,
    "price_display" text,
    "days_on_market" integer,
    "listing_status" "listing_status" DEFAULT 'active' NOT NULL,
    "listing_url" text,
    "score" integer DEFAULT 0 NOT NULL,
    "score_breakdown" jsonb,
    "liam_note" text,
    "raw_json" jsonb,
    "status" "match_status" DEFAULT 'new' NOT NULL,
    "notified_at" timestamp
  );`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "brief_id" integer;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "found_at" timestamp DEFAULT now() NOT NULL;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "address" text;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "suburb" text;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "state" text;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "postcode" text;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "property_type" text;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "bedrooms" integer;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "bathrooms" integer;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "parking" text;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "land_size_m2" integer;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "price" integer;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "price_display" text;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "days_on_market" integer;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "listing_status" "listing_status" DEFAULT 'active' NOT NULL;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "listing_url" text;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "score" integer DEFAULT 0 NOT NULL;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "score_breakdown" jsonb;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "liam_note" text;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "raw_json" jsonb;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "status" "match_status" DEFAULT 'new' NOT NULL;`,
  `ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "notified_at" timestamp;`,
  `CREATE TABLE IF NOT EXISTS "hotlist" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "match_id" integer NOT NULL,
    "added_at" timestamp DEFAULT now() NOT NULL,
    "status" "hotlist_status" DEFAULT 'active' NOT NULL,
    "stale_reason" text,
    "inspection_note" text,
    "liam_suggestion" text,
    "suggested_price" integer,
    "cma_id" integer,
    "tier3_requested" boolean DEFAULT false NOT NULL,
    "tier3_max_price" integer,
    "tier2_requested" boolean DEFAULT false NOT NULL,
    "last_price" integer
  );`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "user_id" integer;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "match_id" integer;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "added_at" timestamp DEFAULT now() NOT NULL;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "status" "hotlist_status" DEFAULT 'active' NOT NULL;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "stale_reason" text;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "inspection_note" text;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "liam_suggestion" text;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "suggested_price" integer;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "cma_id" integer;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "tier3_requested" boolean DEFAULT false NOT NULL;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "tier3_max_price" integer;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "tier2_requested" boolean DEFAULT false NOT NULL;`,
  `ALTER TABLE "hotlist" ADD COLUMN IF NOT EXISTS "last_price" integer;`,
  `CREATE TABLE IF NOT EXISTS "cmas" (
    "id" serial PRIMARY KEY NOT NULL,
    "hotlist_id" integer NOT NULL,
    "address" text NOT NULL,
    "suburb_slug" text NOT NULL,
    "address_slug" text NOT NULL,
    "generated_at" timestamp DEFAULT now() NOT NULL,
    "cma_data" jsonb NOT NULL,
    "confidence" "cma_confidence" DEFAULT 'medium' NOT NULL
  );`,
  `ALTER TABLE "cmas" ADD COLUMN IF NOT EXISTS "hotlist_id" integer;`,
  `ALTER TABLE "cmas" ADD COLUMN IF NOT EXISTS "address" text;`,
  `ALTER TABLE "cmas" ADD COLUMN IF NOT EXISTS "suburb_slug" text;`,
  `ALTER TABLE "cmas" ADD COLUMN IF NOT EXISTS "address_slug" text;`,
  `ALTER TABLE "cmas" ADD COLUMN IF NOT EXISTS "generated_at" timestamp DEFAULT now() NOT NULL;`,
  `ALTER TABLE "cmas" ADD COLUMN IF NOT EXISTS "cma_data" jsonb;`,
  `ALTER TABLE "cmas" ADD COLUMN IF NOT EXISTS "rendered_html" text;`,
  `ALTER TABLE "cmas" ADD COLUMN IF NOT EXISTS "confidence" "cma_confidence" DEFAULT 'medium' NOT NULL;`,
  `DO $$ BEGIN
    ALTER TABLE "matches" ADD CONSTRAINT "matches_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,
  `DO $$ BEGIN
    ALTER TABLE "hotlist" ADD CONSTRAINT "hotlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,
  `DO $$ BEGIN
    ALTER TABLE "hotlist" ADD CONSTRAINT "hotlist_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,
  `DO $$ BEGIN
    ALTER TABLE "cmas" ADD CONSTRAINT "cmas_hotlist_id_hotlist_id_fk" FOREIGN KEY ("hotlist_id") REFERENCES "public"."hotlist"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;`,
];

async function runProductionSchemaStatements(client: PostgresClient): Promise<void> {
  for (const statement of productionSchemaStatements) {
    await client.unsafe(statement);
  }
}

export async function ensureProductionSchema(): Promise<void> {
  const url = getConnectionUrl();
  if (!url) {
    console.warn("[Database] Cannot verify production schema: database not available");
    return;
  }

  const client = postgres(url, shouldRequireSsl(url) ? { ssl: "require", max: 1 } : { max: 1 });
  try {
    await runProductionSchemaStatements(client);
    console.log("[Database] Production schema verified");
  } catch (error) {
    console.error("[Database] Failed to verify production schema:", error);
    throw error;
  } finally {
    await client.end();
  }
}

function toBrief(row: Record<string, unknown>): Brief {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    suburbs: (row.suburbs as string | null) ?? null,
    type: (row.type as string | null) ?? null,
    beds: (row.beds as string | null) ?? null,
    baths: (row.baths as string | null) ?? null,
    parking: (row.parking as string | null) ?? null,
    budgetDisplay: (row.budget_display as string | null) ?? null,
    budget: row.budget === null || row.budget === undefined ? null : Number(row.budget),
    purchaseIntent: ((row.purchase_intent as Brief["purchaseIntent"] | null) ?? "live"),
    flex: (row.flex as string | null) ?? null,
    radiusKm: row.radius_km === null || row.radius_km === undefined ? null : Number(row.radius_km),
    nonNegotiables: (row.non_negotiables as string | null) ?? null,
    needs: (row.needs as string | null) ?? null,
    wants: (row.wants as string | null) ?? null,
    niceToHaves: (row.nice_to_haves as string | null) ?? null,
    landMinM2: row.land_min_m2 === null || row.land_min_m2 === undefined ? null : Number(row.land_min_m2),
    story: (row.story as string | null) ?? null,
    finance: (row.finance as string | null) ?? null,
    financeStatus: (row.finance_status as string | null) ?? null,
    timeline: (row.timeline as string | null) ?? null,
    status: ((row.status as Brief["status"] | null) ?? "active"),
    tier: ((row.tier as Brief["tier"] | null) ?? "free"),
    lastRunAt: (row.last_run_at as Date | null) ?? null,
    createdAt: (row.created_at as Date | null) ?? new Date(),
    updatedAt: (row.updated_at as Date | null) ?? new Date(),
  };
}

async function withRawClient<T>(operation: (client: PostgresClient) => Promise<T>): Promise<T | null> {
  const url = getConnectionUrl();
  if (!url) return null;

  const client = postgres(url, shouldRequireSsl(url) ? { ssl: "require", max: 1 } : { max: 1 });
  try {
    return await operation(client);
  } finally {
    await client.end();
  }
}

async function createBriefLegacyFallback(data: InsertBrief): Promise<Brief | null> {
  return withRawClient(async (client) => {
    const rows = await client`
      INSERT INTO briefs (
        user_id,
        suburbs,
        type,
        beds,
        baths,
        parking,
        budget_display,
        budget,
        purchase_intent,
        flex,
        non_negotiables,
        needs,
        wants,
        nice_to_haves,
        story,
        finance,
        timeline,
        updated_at
      )
      VALUES (
        ${data.userId},
        ${data.suburbs ?? null},
        ${data.type ?? null},
        ${data.beds ?? null},
        ${data.baths ?? null},
        ${data.parking ?? null},
        ${data.budgetDisplay ?? null},
        ${data.budget ?? null},
        ${data.purchaseIntent ?? "live"},
        ${data.flex ?? null},
        ${data.nonNegotiables ?? null},
        ${data.needs ?? null},
        ${data.wants ?? null},
        ${data.niceToHaves ?? null},
        ${data.story ?? null},
        ${data.finance ?? data.financeStatus ?? null},
        ${data.timeline ?? null},
        now()
      )
      RETURNING
        id,
        user_id,
        suburbs,
        type,
        beds,
        baths,
        parking,
        budget_display,
        budget,
        purchase_intent,
        flex,
        non_negotiables,
        needs,
        wants,
        nice_to_haves,
        story,
        finance,
        timeline,
        created_at,
        updated_at
    `;

    return rows.length > 0 ? toBrief(rows[0]) : null;
  });
}

async function getBriefsLegacyFallback(userId: number, briefId?: number): Promise<Brief[]> {
  const rows = await withRawClient(async (client) => {
    if (briefId) {
      return client`
        SELECT
          id,
          user_id,
          suburbs,
          type,
          beds,
          baths,
          parking,
          budget_display,
          budget,
          purchase_intent,
          flex,
          non_negotiables,
          needs,
          wants,
          nice_to_haves,
          story,
          finance,
          timeline,
          created_at,
          updated_at
        FROM briefs
        WHERE id = ${briefId} AND user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 1
      `;
    }

    return client`
      SELECT
        id,
        user_id,
        suburbs,
        type,
        beds,
        baths,
        parking,
        budget_display,
        budget,
        purchase_intent,
        flex,
        non_negotiables,
        needs,
        wants,
        nice_to_haves,
        story,
        finance,
        timeline,
        created_at,
        updated_at
      FROM briefs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
  });

  return rows?.map((row) => toBrief(row)) ?? [];
}

export function getDb() {
  if (!_db) {
    const url = getConnectionUrl();
    if (!url) {
      console.warn("[Database] No valid PostgreSQL connection URL found");
      return null;
    }
    try {
      const client = postgres(url, shouldRequireSsl(url) ? { ssl: "require" } : {});
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  mobile?: string | null;
}): Promise<User | null> {
  const db = getDb();
  if (!db) {
    console.warn("[Database] Cannot create user: database not available");
    return null;
  }

  try {
    const result = await db.insert(users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      mobile: data.mobile ?? null,
      notifications: {
        dailyEmail: true,
        hotSms: false,
        priceDrop: true,
        statusChange: true,
        weeklyDigest: true,
      },
      lastSignedIn: new Date(),
    }).returning();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create user:", error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserById(id: number): Promise<User | null> {
  const db = getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return null;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateLastSignedIn(userId: number): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.update(users).set({ lastSignedIn: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function createBrief(data: InsertBrief): Promise<Brief | null> {
  const db = getDb();
  if (!db) {
    console.warn("[Database] Cannot create brief: database not available");
    return null;
  }

  try {
    const result = await db.insert(briefs).values({
      ...data,
      updatedAt: new Date(),
    }).returning();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.warn("[Database] Brief insert failed; verifying schema and retrying once", error);
    await ensureProductionSchema();

    try {
      const result = await db.insert(briefs).values({
        ...data,
        updatedAt: new Date(),
      }).returning();

      return result.length > 0 ? result[0] : null;
    } catch (retryError) {
      console.error("[Database] Brief insert still failed after schema verification; using legacy insert fallback", retryError);
      const fallback = await createBriefLegacyFallback(data);
      if (fallback) return fallback;
      throw retryError;
    }
  }
}

export async function updateBrief(id: number, userId: number, data: Partial<InsertBrief>): Promise<Brief | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db
    .update(briefs)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(briefs.id, id), eq(briefs.userId, userId)))
    .returning();

  return result.length > 0 ? result[0] : null;
}

export async function updateBriefLastRunAt(id: number): Promise<void> {
  const db = getDb();
  if (!db) return;

  await db.update(briefs).set({ lastRunAt: new Date(), updatedAt: new Date() }).where(eq(briefs.id, id));
}

export async function getBriefById(id: number, userId?: number): Promise<Brief | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const where = userId ? and(eq(briefs.id, id), eq(briefs.userId, userId)) : eq(briefs.id, id);
    const result = await db.select().from(briefs).where(where).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    if (!userId) throw error;
    console.warn("[Database] Full brief select failed; using legacy select fallback", error);
    const result = await getBriefsLegacyFallback(userId, id);
    return result.length > 0 ? result[0] : null;
  }
}

export async function getBriefsByUserId(userId: number): Promise<Brief[]> {
  const db = getDb();
  if (!db) return [];

  try {
    return await db.select().from(briefs).where(eq(briefs.userId, userId)).orderBy(desc(briefs.createdAt));
  } catch (error) {
    console.warn("[Database] Full brief list select failed; using legacy select fallback", error);
    return getBriefsLegacyFallback(userId);
  }
}

export async function getLatestBriefByUserId(userId: number): Promise<Brief | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(briefs)
      .where(eq(briefs.userId, userId))
      .orderBy(desc(briefs.createdAt))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.warn("[Database] Latest brief select failed; using legacy select fallback", error);
    const result = await getBriefsLegacyFallback(userId);
    return result.length > 0 ? result[0] : null;
  }
}

export async function getActiveBriefs(limit = 100): Promise<Brief[]> {
  const db = getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(briefs)
      .where(eq(briefs.status, "active"))
      .orderBy(desc(briefs.updatedAt))
      .limit(limit);
  } catch (error) {
    console.warn("[Database] Active brief select failed; returning an empty scheduler set", error);
    return [];
  }
}

export type MatchNotificationCandidate = {
  user: User;
  brief: Brief;
  match: Match;
};

export async function getUnnotifiedMatchCandidates(limit = 500): Promise<MatchNotificationCandidate[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select({ user: users, brief: briefs, match: matches })
      .from(matches)
      .innerJoin(briefs, eq(matches.briefId, briefs.id))
      .innerJoin(users, eq(briefs.userId, users.id))
      .where(and(eq(briefs.status, "active"), eq(matches.status, "new"), isNull(matches.notifiedAt)))
      .orderBy(desc(matches.score), desc(matches.foundAt))
      .limit(limit);

    return rows;
  } catch (error) {
    console.warn("[Database] Unnotified match select failed; returning an empty notification set", error);
    return [];
  }
}

export async function markMatchesNotified(matchIds: number[], notifiedAt = new Date()): Promise<number> {
  const db = getDb();
  if (!db || matchIds.length === 0) return 0;

  const result = await db
    .update(matches)
    .set({ notifiedAt })
    .where(inArray(matches.id, matchIds))
    .returning({ id: matches.id });

  return result.length;
}

export async function createMatchesForBrief(briefId: number, values: Omit<InsertMatch, "briefId">[]): Promise<Match[]> {
  const db = getDb();
  if (!db) return [];
  if (values.length === 0) return [];

  return db.insert(matches).values(values.map((value) => ({ ...value, briefId }))).returning();
}

export async function replaceMatchesForBrief(briefId: number, values: Omit<InsertMatch, "briefId">[]): Promise<Match[]> {
  const db = getDb();
  if (!db) return [];

  await db.delete(matches).where(eq(matches.briefId, briefId));
  if (values.length === 0) return [];
  return db.insert(matches).values(values.map((value) => ({ ...value, briefId }))).returning();
}

export async function getMatchesByBriefId(briefId: number, userId?: number): Promise<Match[]> {
  const db = getDb();
  if (!db) return [];

  if (userId) {
    const brief = await getBriefById(briefId, userId);
    if (!brief) return [];
  }

  try {
    return await db.select().from(matches).where(eq(matches.briefId, briefId)).orderBy(desc(matches.score), desc(matches.foundAt));
  } catch (error) {
    console.warn("[Database] Match list select failed; returning an empty match set", error);
    return [];
  }
}

export async function getLatestMatchesByUserId(userId: number): Promise<Match[]> {
  const latestBrief = await getLatestBriefByUserId(userId);
  if (!latestBrief) return [];
  return getMatchesByBriefId(latestBrief.id, userId);
}

export async function getMatchById(id: number, userId?: number): Promise<Match | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
  const match = result.length > 0 ? result[0] : null;
  if (!match) return null;

  if (userId) {
    const brief = await getBriefById(match.briefId, userId);
    if (!brief) return null;
  }

  return match;
}

export async function createHotlistEntry(data: InsertHotlistEntry): Promise<HotlistEntry | null> {
  const db = getDb();
  if (!db) return null;

  const existing = await db
    .select()
    .from(hotlist)
    .where(and(eq(hotlist.userId, data.userId), eq(hotlist.matchId, data.matchId)))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const result = await db.insert(hotlist).values(data).returning();
  if (result.length > 0) {
    await db.update(matches).set({ status: "hotlisted" }).where(eq(matches.id, data.matchId));
    return result[0];
  }
  return null;
}

export async function getHotlistByUserId(userId: number): Promise<Array<{ hotlist: HotlistEntry; match: Match | null; cma: Cma | null }>> {
  const db = getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select({ hotlist, match: matches, cma: cmas })
      .from(hotlist)
      .leftJoin(matches, eq(hotlist.matchId, matches.id))
      .leftJoin(cmas, eq(hotlist.cmaId, cmas.id))
      .where(eq(hotlist.userId, userId))
      .orderBy(desc(hotlist.addedAt));

    return rows;
  } catch (error) {
    console.warn("[Database] Hotlist select failed; returning an empty hotlist", error);
    return [];
  }
}

export async function removeHotlistEntry(id: number, userId: number): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const result = await db
    .update(hotlist)
    .set({ status: "removed" })
    .where(and(eq(hotlist.id, id), eq(hotlist.userId, userId)))
    .returning();

  return result.length > 0;
}

export async function updateHotlistEntry(
  id: number,
  userId: number,
  data: Partial<InsertHotlistEntry>,
): Promise<HotlistEntry | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db
    .update(hotlist)
    .set(data)
    .where(and(eq(hotlist.id, id), eq(hotlist.userId, userId)))
    .returning();

  return result.length > 0 ? result[0] : null;
}

export async function getHotlistEntryWithMatch(
  hotlistId: number,
  userId: number,
): Promise<{ hotlist: HotlistEntry; match: Match | null } | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({ hotlist, match: matches })
    .from(hotlist)
    .leftJoin(matches, eq(hotlist.matchId, matches.id))
    .where(and(eq(hotlist.id, hotlistId), eq(hotlist.userId, userId)))
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

export async function getCmaByHotlistId(hotlistId: number, userId: number): Promise<Cma | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({ cma: cmas })
    .from(cmas)
    .innerJoin(hotlist, eq(cmas.hotlistId, hotlist.id))
    .where(and(eq(cmas.hotlistId, hotlistId), eq(hotlist.userId, userId)))
    .orderBy(desc(cmas.generatedAt))
    .limit(1);

  return rows.length > 0 ? rows[0].cma : null;
}

export async function createCma(data: InsertCma): Promise<Cma | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db.insert(cmas).values(data).returning();
  if (result.length === 0) return null;

  await db.update(hotlist).set({ cmaId: result[0].id }).where(eq(hotlist.id, data.hotlistId));
  return result[0];
}

export async function getCmaBySlug(suburbSlug: string, addressSlug: string): Promise<Cma | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(cmas)
    .where(and(eq(cmas.suburbSlug, suburbSlug), eq(cmas.addressSlug, addressSlug)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateUserTier(
  userId: number,
  tier: "free" | "tier1" | "tier2" | "tier3",
): Promise<User | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db
    .update(users)
    .set({ tier, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return result.length > 0 ? result[0] : null;
}

export async function updateUserNotificationPrefs(
  userId: number,
  notifications: NonNullable<User["notifications"]>,
): Promise<User | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db
    .update(users)
    .set({ notifications, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return result.length > 0 ? result[0] : null;
}
