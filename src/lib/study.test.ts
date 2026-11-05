import { test } from "node:test";
import { curriculumProgress } from "./curriculum";
import assert from "node:assert/strict";
import { calendarDays, shiftMonth, admissionSummary, courseSchema, creditSummary, dateSchema, daysAway, deadlineSchema, studyEvents, todayInAachen, type Course, type Deadline } from "./study";

const course: Course = { id: "bd2ea11a-7a96-42b3-b51f-7d08287a9299", name: "Machine Learning", credits: 6, specialization: "Computer Science", semester: "Winter 2026/27", status: "in-progress", exam1: "2027-02-10", exam2: "2027-03-10", notes: "", admissionRequirements: [], area: "unassigned", moduleId: "" };
test("only completed courses count toward the 120 ECTS goal", () => {
  const summary = creditSummary([course, { ...course, credits: 7.5, status: "completed" }, { ...course, credits: 9, status: "planned" }]);
  assert.deepEqual(summary, { completed: 7.5, active: 6, remaining: 112.5, percent: 6.25 });
  assert.equal(creditSummary([{ ...course, credits: 120, status: "completed" }, { ...course, credits: 6, status: "completed" }]).percent, 100);
});
test("online quizzes can occur more than once per course and completed tasks leave the schedule", () => {
  const base: Deadline = { id: "quiz1", courseId: course.id, title: "Quiz 1", kind: "quiz", dueDate: "2026-11-01", done: false };
  const events = studyEvents([course], [base, { ...base, id: "quiz2", title: "Quiz 2", dueDate: "2026-11-08" }, { ...base, id: "quiz3", done: true }]);
  assert.equal(events.length, 4);
  assert.deepEqual(events.map(e => e.title), ["Quiz 1", "Quiz 2", "Exam 1", "Exam 2"]);
  assert.equal(studyEvents([{ ...course, status: "completed" }], []).length, 0);
});
test("dates reject impossible calendar dates and handle Berlin daylight saving", () => {
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  assert.equal(dateSchema.safeParse("2026-13-01").success, false);
  assert.equal(dateSchema.safeParse("2028-02-29").success, true);
  assert.equal(daysAway("2026-10-26", "2026-10-24"), 2);
  assert.equal(todayInAachen(new Date("2026-10-21T23:30:00Z")), "2026-10-22");
});
test("course validation accepts blank exam dates and rejects negative credits", () => {
  const parsed = courseSchema.parse({ ...course, exam1: "", exam2: "" });
  assert.equal(parsed.exam1, null);
  assert.equal(parsed.exam2, null);
  assert.equal(courseSchema.safeParse({ ...course, credits: -1 }).success, false);
  assert.equal(courseSchema.safeParse({ ...course, name: "  " }).success, false);
  assert.equal(courseSchema.safeParse({ ...course, specialization: "Anything" }).success, false);
});
test("deadline validation requires a real course, title, type and calendar date", () => {
  assert.equal(deadlineSchema.safeParse({ courseId: course.id, title: "Weekly quiz", kind: "quiz", dueDate: "2026-11-01" }).success, true);
  assert.equal(deadlineSchema.safeParse({ courseId: "bad-id", title: "Quiz", kind: "quiz", dueDate: "2026-11-01" }).success, false);
  assert.equal(deadlineSchema.safeParse({ courseId: course.id, title: "Quiz", kind: "quiz", dueDate: "2026-02-30" }).success, false);
});

test("calendar uses Monday-first full weeks and handles leap years and year boundaries", () => {
  const october = calendarDays("2026-10");
  assert.equal(october[0], "2026-09-28");
  assert.equal(october.at(-1), "2026-11-01");
  assert.equal(october.length, 35);
  assert.equal(calendarDays("2028-02").filter(d => d.startsWith("2028-02")).length, 29);
  assert.equal(calendarDays("2026-02").length, 35);
  assert.equal(calendarDays("2026-03").length, 42);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2027-01", -1), "2026-12");
  for (const day of october) assert.equal(dateSchema.safeParse(day).success, true);
});

test("admission requires every recorded threshold, including the exact minimum", () => {
  const quiz = { label: "Quizzes", minimum: 50, score: 50 };
  assert.equal(admissionSummary([]).state, "unset");
  assert.equal(admissionSummary([quiz]).state, "met");
  assert.equal(admissionSummary([{ ...quiz, score: 49.99 }]).state, "below");
  assert.equal(admissionSummary([{ ...quiz, score: null }]).state, "pending");
  assert.equal(admissionSummary([quiz, { label: "Assignments", minimum: 60, score: null }]).state, "pending");
  assert.equal(admissionSummary([quiz, { label: "Assignments", minimum: 60, score: 0 }]).state, "below");
  assert.equal(admissionSummary([{ ...quiz, minimum: 0, score: 0 }]).state, "met");
});
test("admission requirements validate forms without treating missing scores as zero", () => {
  const requirement = { label: "Quizzes", minimum: 50, score: null };
  const parsed = courseSchema.parse({ ...course, admissionRequirements: JSON.stringify([requirement]) });
  assert.deepEqual(parsed.admissionRequirements, [{ ...requirement, mode: "percentage", fulfilled: null }]);
  assert.equal(courseSchema.safeParse({ ...course, admissionRequirements: "bad json" }).success, false);
  for (const invalid of [{ ...requirement, minimum: 101 }, { ...requirement, score: -1 }, { ...requirement, label: " " }, { ...requirement, score: "" }]) {
    assert.equal(courseSchema.safeParse({ ...course, admissionRequirements: [invalid] }).success, false);
  }
  const { admissionRequirements, ...legacy } = course;
  assert.deepEqual(courseSchema.parse(legacy).admissionRequirements, []);
});

test("degree areas distinguish core from specialization and never count planned credits as earned", () => {
  const core: Course = { ...course, area: "core-cs", status: "completed", credits: 18 };
  const maths: Course = { ...course, id: "math", area: "core-math", status: "completed", credits: 18 };
  const ethics: Course = { ...course, id: "ethics", area: "core-ethics", status: "completed", credits: 4 };
  const plan: Course = { ...course, id: "plan", area: "core-cs", status: "planned", credits: 6 };
  const unassigned: Course = { ...course, status: "completed", credits: 100 };
  const result = curriculumProgress([core, maths, ethics, plan, unassigned], "Computer Science");
  const area = result.rows.find(r => r.id === "core")!;
  assert.equal(area.earned, 40);
  assert.equal(area.planned, 6);
  assert.equal(area.state, "remaining");
  assert.equal(result.rows.find(r => r.id === "focus")!.earned, 0);
  assert.equal(result.unassigned.length, 1);
});
test("specialization checks isolate tracks and handle one-module overflow", () => {
  const focused = Array.from({ length: 4 }, (_, i): Course => ({ ...course, id: String(i), status: "completed", area: "focus-cs", credits: 6 }));
  const other: Course = { ...course, specialization: "Computer Science and Mathematics", status: "completed", area: "focus-math", credits: 9 };
  let result = curriculumProgress([...focused, other], "Computer Science");
  assert.equal(result.rows.find(r => r.id === "focus")!.earned, 24);
  assert.equal(result.rows.find(r => r.id === "focus")!.state, "exception");
  assert.equal(result.otherFocus.length, 1);
  result = curriculumProgress([...focused, { ...focused[0], id: "5" }], "Computer Science");
  assert.equal(result.rows.find(r => r.id === "focus")!.state, "over");
  const combined = curriculumProgress([{ ...other, credits: 14 }], "Computer Science and Mathematics");
  assert.equal(combined.rows.find(r => r.id === "focus")!.state, "met");
  assert.equal(combined.rows.find(r => r.id === "focus-cs")!.state, "remaining");
});
test("optional additional competences enforce both total and category caps", () => {
  const languages: Course = { ...course, status: "completed", area: "additional-language", credits: 5 };
  const nontechnical: Course = { ...course, status: "completed", area: "additional-nontechnical", credits: 8 };
  const result = curriculumProgress([languages, nontechnical], "Computer Science");
  for (const id of ["additional", "language", "nontechnical"]) assert.equal(result.rows.find(r => r.id === id)!.state, "over");
  assert.equal(curriculumProgress([], "Computer Science").rows.find(r => r.id === "additional")!.state, "met");
  assert.equal(creditSummary([{ ...course, area: "extra", status: "completed" }]).completed, 0);
});
test("mandatory modules need the right credit allocation and Scientific Integrity carries zero credits", () => {
  const intro: Course = { ...course, moduleId: "1216861", area: "core-cs", status: "completed", credits: 6 };
  assert.equal(curriculumProgress([intro], "Computer Science").mandatory.find(m => m.id === intro.moduleId)!.completed, true);
  assert.equal(curriculumProgress([{ ...intro, area: "focus-cs" }], "Computer Science").mandatory.find(m => m.id === intro.moduleId)!.completed, false);
  assert.equal(courseSchema.safeParse({ ...course, area: "integrity", credits: 0 }).success, true);
  assert.equal(courseSchema.safeParse({ ...course, area: "integrity", credits: 6 }).success, false);
  assert.equal(courseSchema.safeParse({ ...course, credits: 0 }).success, false);
});
test("passed homework confirmations are independent of percentage thresholds", () => {
  const base = { label: "Pass written homework", mode: "confirmation" as const, minimum: 50, score: null };
  assert.equal(admissionSummary([base]).state, "pending");
  assert.equal(admissionSummary([{ ...base, fulfilled: false }]).state, "below");
  assert.equal(admissionSummary([{ ...base, fulfilled: true }]).state, "met");
  assert.equal(admissionSummary([{ ...base, fulfilled: true }, { label: "Quizzes", minimum: 50, score: 40 }]).state, "below");
});
