CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"credits" double precision NOT NULL,
	"specialization" text NOT NULL,
	"semester" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'in-progress' NOT NULL,
	"exam_1" date,
	"exam_2" date,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "credits_range" CHECK ("courses"."credits" > 0 and "courses"."credits" <= 120)
);
--> statement-breakpoint
CREATE TABLE "deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"due_date" date NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courses_workspace_idx" ON "courses" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "deadlines_course_idx" ON "deadlines" USING btree ("course_id");