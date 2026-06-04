CREATE TYPE "public"."brief_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."cma_confidence" AS ENUM('high', 'medium', 'low', 'insufficient_data');--> statement-breakpoint
CREATE TYPE "public"."hotlist_status" AS ENUM('active', 'stale', 'under_offer', 'sold', 'removed');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'price_drop', 'under_offer', 'off_market', 'sold');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('new', 'hotlisted', 'rejected', 'purchased');--> statement-breakpoint
CREATE TABLE "cmas" (
	"id" serial PRIMARY KEY NOT NULL,
	"hotlist_id" integer NOT NULL,
	"address" text NOT NULL,
	"suburb_slug" text NOT NULL,
	"address_slug" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"cma_data" jsonb NOT NULL,
	"confidence" "cma_confidence" DEFAULT 'medium' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotlist" (
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
);
--> statement-breakpoint
CREATE TABLE "matches" (
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
);
--> statement-breakpoint
ALTER TABLE "briefs" ADD COLUMN "radius_km" integer;--> statement-breakpoint
ALTER TABLE "briefs" ADD COLUMN "land_min_m2" integer;--> statement-breakpoint
ALTER TABLE "briefs" ADD COLUMN "finance_status" text;--> statement-breakpoint
ALTER TABLE "briefs" ADD COLUMN "status" "brief_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "briefs" ADD COLUMN "tier" "tier" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "briefs" ADD COLUMN "last_run_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notifications" jsonb;--> statement-breakpoint
ALTER TABLE "cmas" ADD CONSTRAINT "cmas_hotlist_id_hotlist_id_fk" FOREIGN KEY ("hotlist_id") REFERENCES "public"."hotlist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotlist" ADD CONSTRAINT "hotlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotlist" ADD CONSTRAINT "hotlist_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE cascade ON UPDATE no action;