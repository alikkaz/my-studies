# Studyspace

A personal MSc Data Science study tracker for RWTH Aachen, built with Next.js App Router, React, TypeScript, pnpm, Drizzle ORM and Neon Postgres.

- Add, edit and delete courses, with credit points, semester and notes.
- Group courses under **Computer Science** or **Computer Science and Mathematics**.
- Plan both exam sittings independently; view in-progress courses in the exam table and export them as CSV.
- Browse a Monday-first monthly calendar of exams and unfinished deadlines; select a date to edit events or add a deadline, and filter by course, specialization or status.
- Track per-course exam admission requirements with minimum and manually entered overall percentages for quizzes, assignments or other criteria. See threshold progress in course cards, the exam table and CSV export. All listed requirements must be met; blank scores remain unknown.
- Add unlimited assignments, projects, **online quizzes**, and other deadlines per course.
- Edit dates, complete and reopen deadlines, and see overdue tasks.
- See earned ECTS out of **120**, active course credits and remaining credits. Only completed courses count toward earned ECTS.
- Dashboard shows upcoming exams and deadlines and a count of events in the next seven days.
- Responsive interface, keyboard accessible dialogs and reduced motion support.

## Run locally

Use Node.js 22 or later and pnpm.

```bash
pnpm install
cp .env.example .env.local
```

Create a Neon database and replace the example `DATABASE_URL` in `.env.local` with its pooled Postgres connection string. Keep this file private. Then:

```bash
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000. With no `DATABASE_URL`, the interface opens in a clearly marked setup state; writes are disabled. There is no fake database or seeded personal progress. The Neon project is not provisioned by this repository.

The in-app **About your study space** button also contains setup instructions.

## Database workflow

```bash
pnpm db:generate  # after changing src/db/schema.ts
pnpm db:migrate  # apply committed migrations
pnpm db:studio   # inspect data locally
```

`drizzle.config.ts` loads `.env.local` for CLI commands. Courses and deadlines are stored in Postgres; deleting a course cascades to its deadlines. A connection is initialized lazily, so builds do not require a live database.

## No login

An HTTP-only, SameSite browser cookie holds a randomly generated study-space identifier. Every course query and mutation is scoped to that identifier; deadline mutations also verify ownership of their course. The database stores the same identifier on courses. No browser-exposed database credentials are used.

To use one plan from any browser or address, set `WORKSPACE_ID` in `.env.local` (or `.env`) to an existing study-space UUID. It overrides the cookie for every visitor, so only use it for a private, single-user deployment.

Return using the same browser to access the same plan. Clearing the cookie, switching browsers or switching domains creates a separate space. This is intentionally a personal, browser-bound tracker, without account recovery or cross-device synchronization. The identifier acts as a bearer credential: keep it private. Use HTTPS for a hosted deployment. Exam CSV export is available, but is not a complete backup of courses and deadlines.

## Dates and credits

Dates are calendar dates, without time-of-day. The current day is calculated in `Europe/Berlin`, including daylight saving time. Course completion removes its exams from upcoming events; unfinished assignments, projects and quizzes remain actionable. Both exam sittings are displayed as scheduled until the course is marked completed.

The two course groups are kept separate from degree credit areas. The degree overview checks recorded allocations against the published area ranges; it does not register you for exams or certify official credit allocation.

## Checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

Tests cover credit accounting, multiple quizzes, event completion, invalid dates, optional exam dates and Aachen timezone boundaries.

## Exam admission tracking

In the course editor, select **Add requirement** under **Exam admission requirements**. Name the criterion (for example Quizzes), choose either passed/fulfilled confirmation (the default) or a minimum overall percentage, and record your current status or score. A 50% percentage is an editable example, not a universal RWTH rule. Add separate criteria when both quizzes and assignments are required. Scores are entered manually, not inferred from deadline completion. A score equal to the minimum meets the threshold. Missing scores remain unknown, and a course with no recorded requirements shows **Not set** rather than implying admission. This tracks personal progress; official admission remains with the course staff.

Existing installations should run `pnpm db:migrate` for the new `admission_requirements` column before using this version. Existing courses start with an empty list.

## RWTH curriculum checks

The Degree progress page checks core 44–64 ECTS (CS at least 18, mathematics at least 18, Ethics 4), specialization 14–22 excluding the thesis, seminar 5, practical course 7, thesis 30, and optional additional competences 0–12. Language credits have a 4-credit cap; non-technical credits have a 6-credit cap. Earned, active and planned totals stay separate. Aggregate rows already include their subrows.

The specialization preview supports the two existing personal course groups: Computer Science and Computer Science and Mathematics. It does not combine credits across these groups. The former needs at least 12 catalogue CS credits and at most 6 from other catalogues; the latter needs at least 6 each from CS and mathematics. A possible one-module overflow above 22 is flagged for review. Additional competences require appropriate approval and cannot be used to relabel core/specialization modules. Surplus coursework has its own area and is excluded from the recorded degree-credit counter.

Existing courses default to **Not allocated yet**, retaining their previous course group and scores. Allocate them in the course editor; no credits are automatically reclassified. The introductory modules and Ethics are checked by module ID (or exact name), credits and core area. Scientific Integrity is tracked separately with zero credits. The dashboard is a planning checklist, not an official graduation decision. It flags duplicate module IDs but does not silently remove or reallocate records.

A small set of verified handbook entries supplies names, credits, areas and admission guidance; this is not a complete imported catalogue. Selecting a module ID shows a source link, and **Use module name, credits & area** explicitly fills those fields. It does not replace saved admission requirements. Confirmation supports passed homework or attendance without inventing a percentage; semester-specific thresholds remain editable.

Sources checked on 2026-10-21:

- [Current RWTH program structure](https://sc.informatik.rwth-aachen.de/de/studium/master/master-data-science/program-structure/) for the main ranges and core/additional rules. The supplied central study-program URL returned 404.
- [RWTH introductory meeting, summer 2024](https://sc.informatik.rwth-aachen.de/wp-content/uploads/2024/04/Intro-DS-SS24-1.pdf), slides 11 and 18, for the two specialization catalogue splits.
- [RWTHonline module handbook, PO 2018, winter 2026/27](https://online.rwth-aachen.de/RWTHonline/pl/ui/%24ctx%3Bdesign%3Dpl%3Bheader%3Dmax%3Blang%3Dde/wbModhbReport.downloadPublicMHBVersion?pDocNr=16183543&pOrgNr=14194&pStpStpNr=1690), revision 2026-10-01, for selected module guidance. The supplied document ID 12220186 was unavailable; the current edition was found via the university’s handbook index.

Run `pnpm db:migrate` to add credit area/module ID fields and support the zero-credit Scientific Integrity entry.

## Navigation

- **Overview** shows upcoming dates, overdue tasks and admission requirements to check.
- **Courses** includes All courses and Exam schedule; the exam schedule remains limited to in-progress courses.
- **Calendar** includes Month and Deadline list, including completed tasks and reopening.
- **Degree progress** holds credit ranges, required modules and allocation checks. Detailed breakdowns and source notes expand on demand.

The course editor starts with name, credits, status and credit area. Exam dates, admission requirements, specialization/handbook, and semester/notes expand separately. Existing values remain submitted when their section is collapsed. No course data or planning features were removed by this simplification.
