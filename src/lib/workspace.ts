import { cookies } from "next/headers";
import { z } from "zod";

const key = "study_workspace";
export async function workspaceId(create = false) {
  const pinned = process.env.WORKSPACE_ID;
  if (pinned) {
    const fixed = z.uuid().safeParse(pinned);
    if (!fixed.success) throw new Error("WORKSPACE_ID must be a UUID.");
    return fixed.data;
  }
  const jar = await cookies();
  const parsed = z.uuid().safeParse(jar.get(key)?.value);
  if (parsed.success) return parsed.data;
  if (!create) return null;
  const id = crypto.randomUUID();
  jar.set(key, id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 * 5 });
  return id;
}
