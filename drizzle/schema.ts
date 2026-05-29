import { integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Briefs table — stores property search briefs from users
 */
export const intentEnum = pgEnum("purchase_intent", ["live", "invest", "both"]);

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
  nonNegotiables: text("non_negotiables"),
  needs: text("needs"),
  wants: text("wants"),
  niceToHaves: text("nice_to_haves"),
  story: text("story"),
  finance: text("finance"),
  timeline: text("timeline"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Brief = typeof briefs.$inferSelect;
export type InsertBrief = typeof briefs.$inferInsert;

// TODO: Add matches, hotlist, cmas tables here
