import type { Course } from "./study";

export const PROGRAM_SOURCE = "https://sc.informatik.rwth-aachen.de/de/studium/master/master-data-science/program-structure/";
export const FOCUS_SOURCE = "https://sc.informatik.rwth-aachen.de/wp-content/uploads/2024/04/Intro-DS-SS24-1.pdf";
export const HANDBOOK_SOURCE = "https://online.rwth-aachen.de/RWTHonline/pl/ui/$ctx;design=pl;header=max;lang=de/wbModhbReport.downloadPublicMHBVersion?pDocNr=16183543&pOrgNr=14194&pStpStpNr=1690";
export const CREDIT_AREAS = [
  { id: "unassigned", label: "Not allocated yet" },
  { id: "core-cs", label: "Core · Computer Science" },
  { id: "core-math", label: "Core · Mathematics" },
  { id: "core-ethics", label: "Core · Ethics" },
  { id: "focus-cs", label: "Specialization · CS catalogue" },
  { id: "focus-math", label: "Specialization · Mathematics catalogue" },
  { id: "focus-other", label: "Specialization · Other catalogue" },
  { id: "seminar", label: "Seminar" },
  { id: "practical", label: "Practical course" },
  { id: "thesis", label: "Master’s thesis" },
  { id: "additional-language", label: "Additional · Language" },
  { id: "additional-nontechnical", label: "Additional · Non-technical" },
  { id: "additional-bridge", label: "Additional · Approved bridge course" },
  { id: "integrity", label: "Scientific Integrity · 0 ECTS" },
  { id: "extra", label: "Additional coursework · Outside degree" },
] as const;
export const CREDIT_AREA_IDS = CREDIT_AREAS.map(a => a.id) as [CreditArea, ...CreditArea[]];
export type CreditArea = typeof CREDIT_AREAS[number]["id"];

// Selected verified modules, not the full catalogue. Handbook revision 2026-10-01.
export const HANDBOOK_MODULES = [
  { id: "1216861", name: "Introduction to Data Science", credits: 6, area: "core-cs", page: 22, mandatory: true, admission: "Successful evaluation of the assignment; details are announced in the lecture." },
  { id: "1117157", name: "Mathematics of Data Science", credits: 9, area: "core-math", page: 44, mandatory: true, admission: "No admission prerequisite is stated in this module entry." },
  { id: "7017528", name: "Ethics, technology, and data", credits: 4, area: "core-ethics", page: 50, mandatory: true, admission: "Assessment details are announced at the beginning of the semester." },
  { id: "9033432", name: "Scientific Integrity", credits: 0, area: "integrity", page: 969, mandatory: true, admission: "No ECTS. The current handbook specifies 60% to pass the assessment." },
  { id: "1212703", name: "Master Thesis", credits: 30, area: "thesis", page: 966, mandatory: false, admission: "At least 60 CP must be achieved before the thesis topic is assigned." },
  { id: "1215744", name: "Machine Learning", credits: 6, area: "core-cs", page: 28, mandatory: false, admission: "Written homework must be passed; details are announced in the lecture." },
  { id: "1212675", name: "Knowledge Graphs", credits: 4, area: "core-cs", page: 25, mandatory: false, admission: "Written homework must be passed." },
  { id: "1216838", name: "Concepts and Models for Parallel and Data-centric Programming", credits: 6, area: "core-cs", page: 27, mandatory: false, admission: "Written homework must be passed." },
  { id: "1212650", name: "Probabilistic Programming", credits: 6, area: "core-cs", page: 33, mandatory: false, admission: "Written homework must be passed." },
] as const;
export function areaLabel(id: CreditArea) { return CREDIT_AREAS.find(a => a.id === id)?.label ?? "Not allocated yet"; }

export function curriculumProgress(courses: Course[], focus: string) {
  const sums = (ids: CreditArea[], list = courses) => {
    const matches = list.filter(c => ids.includes(c.area));
    const total = (status: Course["status"]) => matches.filter(c => c.status === status).reduce((n, c) => n + c.credits, 0);
    return { earned: total("completed"), active: total("in-progress"), planned: total("planned") };
  };
  const focusCourses = courses.filter(c => c.specialization === focus && c.area.startsWith("focus-"));
  const focusEarned = focusCourses.filter(c => c.status === "completed");
  const focusSum = sums(["focus-cs", "focus-math", "focus-other"], focusCourses);
  // The published exception allows a single final module to cross 22 CP.
  const focusException = focusSum.earned > 22 && focusEarned.some(c => focusSum.earned - c.credits <= 22);
  const rules: { id: string; label: string; ids: CreditArea[]; min: number; max: number; list?: Course[]; exception?: boolean }[] = [
    { id: "core", label: "Core area", ids: ["core-cs", "core-math", "core-ethics"], min: 44, max: 64 },
    { id: "core-cs", label: "Core · Computer Science", ids: ["core-cs"], min: 18, max: Infinity },
    { id: "core-math", label: "Core · Mathematics", ids: ["core-math"], min: 18, max: Infinity },
    { id: "core-ethics", label: "Core · Ethics", ids: ["core-ethics"], min: 4, max: 4 },
    { id: "focus", label: "Specialization (without thesis)", ids: ["focus-cs", "focus-math", "focus-other"], min: 14, max: 22, list: focusCourses, exception: focusException },
    { id: "seminar", label: "Seminar", ids: ["seminar"], min: 5, max: 5 },
    { id: "practical", label: "Practical course", ids: ["practical"], min: 7, max: 7 },
    { id: "thesis", label: "Master’s thesis", ids: ["thesis"], min: 30, max: 30 },
    { id: "additional", label: "Additional competences", ids: ["additional-language", "additional-nontechnical", "additional-bridge"], min: 0, max: 12 },
    { id: "language", label: "Additional · Language", ids: ["additional-language"], min: 0, max: 4 },
    { id: "nontechnical", label: "Additional · Non-technical", ids: ["additional-nontechnical"], min: 0, max: 6 },
  ];
  if (focus === "Computer Science") {
    rules.splice(5, 0,
      { id: "focus-cs", label: "Specialization · CS catalogue", ids: ["focus-cs"], min: 12, max: Infinity, list: focusCourses },
      { id: "focus-other", label: "Specialization · Other catalogues", ids: ["focus-math", "focus-other"], min: 0, max: 6, list: focusCourses });
  } else if (focus === "Computer Science and Mathematics") {
    rules.splice(5, 0,
      { id: "focus-cs", label: "Specialization · CS catalogue", ids: ["focus-cs"], min: 6, max: Infinity, list: focusCourses },
      { id: "focus-math", label: "Specialization · Mathematics catalogue", ids: ["focus-math"], min: 6, max: Infinity, list: focusCourses },
      { id: "focus-other", label: "Specialization · Other catalogues", ids: ["focus-other"], min: 0, max: 0, list: focusCourses });
  }
  const rows = rules.map(rule => {
    const totals = sums(rule.ids, rule.list);
    const state = totals.earned > rule.max ? rule.exception ? "exception" : "over" : totals.earned < rule.min ? "remaining" : "met";
    return { ...rule, ...totals, state };
  });
  const mandatory = HANDBOOK_MODULES.filter(m => m.mandatory).map(m => ({ ...m, completed: courses.some(c => c.status === "completed" && c.area === m.area && c.credits === m.credits && (c.moduleId === m.id || (!c.moduleId && c.name.trim().toLowerCase() === m.name.toLowerCase()))) }));
  const unassigned = courses.filter(c => c.area === "unassigned");
  return { rows, mandatory, unassigned, otherFocus: courses.filter(c => c.area.startsWith("focus-") && c.specialization !== focus), duplicateModules: courses.filter((c, i) => c.moduleId && courses.findIndex(other => other.moduleId === c.moduleId) !== i) };
}
