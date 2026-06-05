import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Core user table backing JWT auth flow.
 * Users sign up with email/password.
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const tierEnum = pgEnum("tier", ["free", "tier1", "tier2", "tier3"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  mobile: varchar("mobile", { length: 20 }),
  role: roleEnum("role").default("user").notNull(),
  tier: tierEnum("tier").default("free").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  brokerReferral: text("broker_referral"),
  smsConsent: integer("sms_consent").default(0).notNull(),
  notifications: jsonb("notifications").$type<{
    dailyEmail?: boolean;
    hotSms?: boolean;
    priceDrop?: boolean;
    statusChange?: boolean;
    weeklyDigest?: boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Briefs table — stores property search briefs from users.
 */
export const intentEnum = pgEnum("purchase_intent", ["live", "invest", "both"]);
export const briefStatusEnum = pgEnum("brief_status", ["active", "paused", "completed"]);

export const briefs = pgTable("briefs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  suburbs: text("suburbs"),
  type: varchar("type", { length: 50 }),
  beds: varchar("beds", { length: 50 }),
  baths: varchar("baths", { length: 50 }),
  parking: varchar("parking", { length: 50 }),
  budgetDisplay: varchar("budget_display", { length: 50 }),
  budget: integer("budget"),
  purchaseIntent: intentEnum("purchase_intent").default("live").notNull(),
  flex: text("flex"),
  radiusKm: integer("radius_km"),
  nonNegotiables: text("non_negotiables"),
  needs: text("needs"),
  wants: text("wants"),
  niceToHaves: text("nice_to_haves"),
  landMinM2: integer("land_min_m2"),
  story: text("story"),
  finance: text("finance"),
  financeStatus: text("finance_status"),
  timeline: text("timeline"),
  status: briefStatusEnum("status").default("active").notNull(),
  tier: tierEnum("tier").default("free").notNull(),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Brief = typeof briefs.$inferSelect;
export type InsertBrief = typeof briefs.$inferInsert;

/**
 * Search matches returned by the AI-powered matching workflow.
 */
export const listingStatusEnum = pgEnum("listing_status", [
  "active",
  "price_drop",
  "under_offer",
  "off_market",
  "sold",
]);
export const matchStatusEnum = pgEnum("match_status", ["new", "hotlisted", "rejected", "purchased"]);

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  briefId: integer("brief_id")
    .notNull()
    .references(() => briefs.id, { onDelete: "cascade" }),
  foundAt: timestamp("found_at").defaultNow().notNull(),
  address: text("address").notNull(),
  suburb: text("suburb"),
  state: text("state"),
  postcode: text("postcode"),
  propertyType: text("property_type"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  parking: text("parking"),
  landSizeM2: integer("land_size_m2"),
  price: integer("price"),
  priceDisplay: text("price_display"),
  daysOnMarket: integer("days_on_market"),
  listingStatus: listingStatusEnum("listing_status").default("active").notNull(),
  listingUrl: text("listing_url"),
  score: integer("score").default(0).notNull(),
  scoreBreakdown: jsonb("score_breakdown").$type<{
    needsMet?: string[];
    needsMissed?: string[];
    wantsMet?: string[];
    wantsMissed?: string[];
    niceToHavesMet?: string[];
    nnFlags?: string[];
    rationale?: string;
  }>(),
  liamNote: text("liam_note"),
  rawJson: jsonb("raw_json").$type<Record<string, unknown>>(),
  status: matchStatusEnum("status").default("new").notNull(),
  notifiedAt: timestamp("notified_at"),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

/**
 * Buyer hotlist entries, notes, offer guidance, and tier-up intent.
 */
export const hotlistStatusEnum = pgEnum("hotlist_status", [
  "active",
  "stale",
  "under_offer",
  "sold",
  "removed",
]);

export const hotlist = pgTable("hotlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  status: hotlistStatusEnum("status").default("active").notNull(),
  staleReason: text("stale_reason"),
  inspectionNote: text("inspection_note"),
  liamSuggestion: text("liam_suggestion"),
  suggestedPrice: integer("suggested_price"),
  cmaId: integer("cma_id"),
  tier3Requested: boolean("tier3_requested").default(false).notNull(),
  tier3MaxPrice: integer("tier3_max_price"),
  tier2Requested: boolean("tier2_requested").default(false).notNull(),
  lastPrice: integer("last_price"),
});

export type HotlistEntry = typeof hotlist.$inferSelect;
export type InsertHotlistEntry = typeof hotlist.$inferInsert;

/**
 * Comparative market analysis reports generated for hotlisted properties.
 */
export const cmaConfidenceEnum = pgEnum("cma_confidence", ["high", "medium", "low", "insufficient_data"]);

export const cmas = pgTable("cmas", {
  id: serial("id").primaryKey(),
  hotlistId: integer("hotlist_id")
    .notNull()
    .references(() => hotlist.id, { onDelete: "cascade" }),
  address: text("address").notNull(),
  suburbSlug: text("suburb_slug").notNull(),
  addressSlug: text("address_slug").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  cmaData: jsonb("cma_data").$type<Record<string, unknown>>().notNull(),
  renderedHtml: text("rendered_html"),
  confidence: cmaConfidenceEnum("confidence").default("medium").notNull(),
});

export type Cma = typeof cmas.$inferSelect;
export type InsertCma = typeof cmas.$inferInsert;
