import { z } from "zod";
import { CREDIT_AREA_IDS, type CreditArea } from "./curriculum";

export const SPECIALIZATIONS = ["Computer Science", "Computer Science and Mathematics"] as const;
export const DEADLINE_KINDS = ["assignment", "project", "quiz", "other"] as const;
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}, "Enter a valid date.");
const optionalDate = z.union([dateSchema, z.literal("")]).transform(v => v || null);
export const admissionRequirementSchema = z.object({
  label: z.string().trim().min(1, "Name each admission requirement.").max(120),
  mode: z.enum(["percentage", "confirmation"]).default("percentage"),
  fulfilled: z.boolean().nullable().default(null),
  minimum: z.number().min(0).max(100),
  score: z.number().min(0).max(100).nullable(),
});
export type AdmissionRequirement = z.input<typeof admissionRequirementSchema>;
const admissionRequirementsSchema = z.preprocess(value => {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return value; }
}, z.array(admissionRequirementSchema).max(20).default([]));
export const courseSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]).optional(),
  name: z.string().trim().min(1, "Give your course a name.").max(160),
  credits: z.coerce.number().nonnegative().max(120),
  specialization: z.enum(SPECIALIZATIONS),
  semester: z.string().trim().max(60),
  status: z.enum(["planned", "in-progress", "completed"]),
  exam1: optionalDate, exam2: optionalDate,
  notes: z.string().trim().max(4000),
  admissionRequirements: admissionRequirementsSchema,
  area: z.enum(CREDIT_AREA_IDS).default("unassigned"),
  moduleId: z.string().regex(/^(\d{7})?$/, "Use a seven-digit module identifier.").default(""),
}).refine(c => c.area === "integrity" ? c.credits === 0 : c.credits > 0, { message: "Scientific Integrity has zero ECTS; other courses need positive credits.", path: ["credits"] });
export const deadlineSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]).optional(),
  courseId: z.uuid(),
  title: z.string().trim().min(1, "Give your deadline a title.").max(160),
  kind: z.enum(DEADLINE_KINDS),
  dueDate: dateSchema,
});
export type Course = {
  id: string; name: string; credits: number; specialization: typeof SPECIALIZATIONS[number];
  semester: string; status: "planned" | "in-progress" | "completed";
  exam1: string | null; exam2: string | null; notes: string;
  admissionRequirements: AdmissionRequirement[];
  area: CreditArea; moduleId: string;
};
export type Deadline = { id: string; courseId: string; title: string; kind: typeof DEADLINE_KINDS[number]; dueDate: string; done: boolean };
export type StudyEvent = { id: string; courseId: string; courseName: string; title: string; kind: string; date: string; deadlineId?: string };
export type StudyData = { courses: Course[]; deadlines: Deadline[]; connected: boolean; error?: string };

// All study dates are calendar dates in Aachen, never browser-dependent UTC instants.
export function todayInAachen(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function daysAway(date: string, today: string) {
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
}
export function formatDate(date: string | null, options?: Intl.DateTimeFormatOptions) {
  return date ? new Intl.DateTimeFormat("en-GB", options ?? { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`)) : "Not scheduled";
}
export function creditSummary(courses: Course[]) {
  const completed = courses.filter(c => c.status === "completed" && c.area !== "extra").reduce((sum, c) => sum + c.credits, 0);
  const active = courses.filter(c => c.status === "in-progress" && c.area !== "extra").reduce((sum, c) => sum + c.credits, 0);
  return { completed, active, remaining: Math.max(0, 120 - completed), percent: Math.min(100, completed / 120 * 100) };
}
export function studyEvents(courses: Course[], deadlines: Deadline[]): StudyEvent[] {
  const events: StudyEvent[] = [];
  for (const c of courses) {
    if (c.status !== "completed") {
      if (c.exam1) events.push({ id: `${c.id}-1`, courseId: c.id, courseName: c.name, title: "Exam 1", kind: "exam", date: c.exam1 });
      if (c.exam2) events.push({ id: `${c.id}-2`, courseId: c.id, courseName: c.name, title: "Exam 2", kind: "exam", date: c.exam2 });
    }
    for (const d of deadlines.filter(d => d.courseId === c.id && !d.done)) {
      events.push({ id: d.id, courseId: c.id, courseName: c.name, title: d.title, kind: d.kind, date: d.dueDate, deadlineId: d.id });
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

// Use UTC arithmetic for date-only grids so DST and browser timezones cannot shift cells.
export function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
export function calendarDays(month: string) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const leading = (first.getUTCDay() + 6) % 7;
  const count = Math.ceil((leading + last.getUTCDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(1 - leading + index);
    return date.toISOString().slice(0, 10);
  });
}

export function admissionSummary(requirements: AdmissionRequirement[]) {
  if (!requirements.length) return { state: "unset" as const, label: "Not set" };
  const met = requirements.filter(r => requirementState(r) === "met").length;
  if (met === requirements.length) return { state: "met" as const, label: "All requirements met" };
  if (requirements.some(r => requirementState(r) === "below")) {
    return { state: "below" as const, label: `${met}/${requirements.length} met · Not yet met` };
  }
  return { state: "pending" as const, label: `${met}/${requirements.length} met · Not yet confirmed` };
}

export function requirementState(r: AdmissionRequirement) {
  if (r.mode === "confirmation") return r.fulfilled == null ? "pending" : r.fulfilled ? "met" : "below";
  return r.score === null ? "pending" : r.score >= r.minimum ? "met" : "below";
}
export function requirementDetail(r: AdmissionRequirement) {
  return r.mode === "confirmation" ? `${r.label}: ${r.fulfilled == null ? "Not confirmed" : r.fulfilled ? "Passed / fulfilled" : "Not yet fulfilled"}` : `${r.label}: ${r.score === null ? "Score needed" : `${r.score}%`} · min. ${r.minimum}%`;
}
