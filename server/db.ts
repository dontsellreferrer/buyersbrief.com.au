import { and, desc, eq } from "drizzle-orm";
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

  const result = await db.insert(briefs).values({
    ...data,
    updatedAt: new Date(),
  }).returning();

  return result.length > 0 ? result[0] : null;
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

  const where = userId ? and(eq(briefs.id, id), eq(briefs.userId, userId)) : eq(briefs.id, id);
  const result = await db.select().from(briefs).where(where).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getBriefsByUserId(userId: number): Promise<Brief[]> {
  const db = getDb();
  if (!db) return [];

  return db.select().from(briefs).where(eq(briefs.userId, userId)).orderBy(desc(briefs.createdAt));
}

export async function getLatestBriefByUserId(userId: number): Promise<Brief | null> {
  const db = getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(briefs)
    .where(eq(briefs.userId, userId))
    .orderBy(desc(briefs.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
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

  return db.select().from(matches).where(eq(matches.briefId, briefId)).orderBy(desc(matches.score), desc(matches.foundAt));
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

export async function getHotlistByUserId(userId: number): Promise<Array<{ hotlist: HotlistEntry; match: Match | null }>> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({ hotlist, match: matches })
    .from(hotlist)
    .leftJoin(matches, eq(hotlist.matchId, matches.id))
    .where(eq(hotlist.userId, userId))
    .orderBy(desc(hotlist.addedAt));

  return rows;
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
