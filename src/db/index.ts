import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  if (!process.env.DATABASE_URL) throw new Error("Connect your Neon database to save your studies.");
  return drizzle(neon(process.env.DATABASE_URL), { schema });
}
let instance: ReturnType<typeof createDb> | undefined;
export function getDb() { return instance ??= createDb(); }
