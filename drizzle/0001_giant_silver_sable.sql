CREATE TYPE "public"."purchase_intent" AS ENUM('live', 'invest', 'both');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('free', 'tier1', 'tier2', 'tier3');--> statement-breakpoint
CREATE TABLE "briefs" (
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
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"mobile" varchar(20),
	"role" "role" DEFAULT 'user' NOT NULL,
	"tier" "tier" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"broker_referral" text,
	"sms_consent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;