CREATE TABLE "club_admin_identity" (
	"id" integer PRIMARY KEY,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_attempts" (
	"key" text PRIMARY KEY,
	"started" integer NOT NULL,
	"attempts" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_backups" (
	"id" text PRIMARY KEY,
	"revision" integer NOT NULL,
	"created_at" text NOT NULL,
	"reason" text NOT NULL,
	"data" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_platform" (
	"key" text PRIMARY KEY,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_state" (
	"id" integer PRIMARY KEY,
	"revision" integer DEFAULT 0 NOT NULL,
	"data" text NOT NULL
);
