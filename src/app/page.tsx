import { loadStudies } from "./actions";
import { StudyApp } from "@/components/study-app";
import { todayInAachen } from "@/lib/study";

export const dynamic = "force-dynamic";
export default async function Page() {
  const data = await loadStudies();
  return <StudyApp initial={data} today={todayInAachen()} />;
}
