ALTER TABLE "courses" DROP CONSTRAINT "credits_range";--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "area" text DEFAULT 'unassigned' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "module_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "credits_range" CHECK ("courses"."credits" >= 0 and "courses"."credits" <= 120 and (("courses"."credits" > 0 and "courses"."area" <> 'integrity') or ("courses"."credits" = 0 and "courses"."area" = 'integrity')));