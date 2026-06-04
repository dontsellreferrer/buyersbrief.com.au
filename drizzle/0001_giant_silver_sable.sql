DO $$ BEGIN
	CREATE TYPE "public"."purchase_intent" AS ENUM('live', 'invest', 'both');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "briefs" (
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
DO $$ BEGIN
	ALTER TABLE "briefs" ADD CONSTRAINT "briefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
