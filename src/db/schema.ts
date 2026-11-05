import { sql } from "drizzle-orm";
import { pgTable, uuid, text, doublePrecision, date, timestamp, boolean, index, check, jsonb } from "drizzle-orm/pg-core";

import type { CreditArea } from "@/lib/curriculum";
import type { AdmissionRequirement } from "@/lib/study";

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  name: text("name").notNull(),
  credits: doublePrecision("credits").notNull(),
  specialization: text("specialization", { enum: ["Computer Science", "Computer Science and Mathematics"] }).notNull(),
  semester: text("semester").notNull().default(""),
  status: text("status", { enum: ["planned", "in-progress", "completed"] }).notNull().default("in-progress"),
  exam1: date("exam_1"),
  exam2: date("exam_2"),
  notes: text("notes").notNull().default(""),
  area: text("area").$type<CreditArea>().notNull().default("unassigned"),
  moduleId: text("module_id").notNull().default(""),
  admissionRequirements: jsonb("admission_requirements").$type<AdmissionRequirement[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("courses_workspace_idx").on(t.workspaceId), check("credits_range", sql`${t.credits} >= 0 and ${t.credits} <= 120 and ((${t.credits} > 0 and ${t.area} <> 'integrity') or (${t.credits} = 0 and ${t.area} = 'integrity'))`)]);

export const deadlines = pgTable("deadlines", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  kind: text("kind", { enum: ["assignment", "project", "quiz", "other"] }).notNull(),
  dueDate: date("due_date").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("deadlines_course_idx").on(t.courseId)]);
