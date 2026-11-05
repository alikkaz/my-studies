"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { courses, deadlines } from "@/db/schema";
import { courseSchema, deadlineSchema, type StudyData } from "@/lib/study";
import { workspaceId } from "@/lib/workspace";

export async function loadStudies(): Promise<StudyData> {
  if (!process.env.DATABASE_URL) return { courses: [], deadlines: [], connected: false };
  const owner = await workspaceId();
  if (!owner) return { courses: [], deadlines: [], connected: true };
  try {
    const db = getDb();
    const list = await db.select().from(courses).where(eq(courses.workspaceId, owner)).orderBy(courses.createdAt);
    const dates = list.length ? await db.select().from(deadlines).where(inArray(deadlines.courseId, list.map(c => c.id))) : [];
    return {
      courses: list.map(c => ({ id: c.id, name: c.name, credits: c.credits, specialization: c.specialization, semester: c.semester, status: c.status, exam1: c.exam1, exam2: c.exam2, notes: c.notes, admissionRequirements: c.admissionRequirements, area: c.area, moduleId: c.moduleId })),
      deadlines: dates.map(d => ({ id: d.id, courseId: d.courseId, title: d.title, kind: d.kind, dueDate: d.dueDate, done: d.done })),
      connected: true,
    };
  } catch (error) {
    console.error("Study database read failed", error instanceof Error ? error.name : "unknown");
    return { courses: [], deadlines: [], connected: true, error: "Your studies could not be loaded. Check your database connection and run the migrations, then retry." };
  }
}

async function ownsCourse(id: string, owner: string) {
  const [course] = await getDb().select({ id: courses.id }).from(courses).where(and(eq(courses.id, id), eq(courses.workspaceId, owner)));
  if (!course) throw new Error("Course not found in your study space.");
}
async function mutate(work: () => Promise<void>) {
  try { await work(); revalidatePath("/"); return { success: true as const }; }
  catch (error) {
    if (error instanceof z.ZodError) return { success: false as const, error: error.issues[0]?.message ?? "Check your entries." };
    console.error("Study update failed", error instanceof Error ? error.name : "unknown");
    return { success: false as const, error: process.env.DATABASE_URL ? "Could not save this change. Check your connection and try again." : "Connect Neon before saving your studies." };
  }
}
export async function saveCourse(input: unknown) {
  return mutate(async () => {
    const { id, ...values } = courseSchema.parse(input);
    const owner = (await workspaceId(true))!;
    if (id) {
      await ownsCourse(id, owner);
      await getDb().update(courses).set(values).where(and(eq(courses.id, id), eq(courses.workspaceId, owner)));
    } else await getDb().insert(courses).values({ ...values, workspaceId: owner });
  });
}
export async function deleteCourse(id: string) {
  return mutate(async () => {
    z.uuid().parse(id);
    const owner = (await workspaceId(true))!;
    await getDb().delete(courses).where(and(eq(courses.id, id), eq(courses.workspaceId, owner)));
  });
}
export async function saveDeadline(input: unknown) {
  return mutate(async () => {
    const { id, ...values } = deadlineSchema.parse(input);
    const owner = (await workspaceId(true))!;
    await ownsCourse(values.courseId, owner);
    if (id) await getDb().update(deadlines).set(values).where(and(eq(deadlines.id, id), eq(deadlines.courseId, values.courseId)));
    else await getDb().insert(deadlines).values(values);
  });
}
export async function updateDeadline(id: string, operation: "complete" | "reopen" | "delete") {
  return mutate(async () => {
    z.uuid().parse(id);
    z.enum(["complete", "reopen", "delete"]).parse(operation);
    const owner = (await workspaceId(true))!;
    const [deadline] = await getDb().select().from(deadlines).where(eq(deadlines.id, id));
    if (!deadline) throw new Error("Deadline not found.");
    await ownsCourse(deadline.courseId, owner);
    if (operation === "delete") await getDb().delete(deadlines).where(eq(deadlines.id, id));
    else await getDb().update(deadlines).set({ done: operation === "complete" }).where(eq(deadlines.id, id));
  });
}
