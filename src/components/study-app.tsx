"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowRight, BookOpen, CalendarDays, Check, CheckCheck, ChevronLeft, ChevronRight, CircleHelp, GraduationCap, LayoutDashboard, ListTodo, Plus, Search, SlidersHorizontal, Trash2, X, Pencil, Layers3 } from "lucide-react";
import { deleteCourse, saveCourse, saveDeadline, updateDeadline } from "@/app/actions";
import { admissionSummary, requirementDetail, calendarDays, shiftMonth, creditSummary, daysAway, DEADLINE_KINDS, formatDate, SPECIALIZATIONS, studyEvents, type AdmissionRequirement, type Course, type Deadline, type StudyData, type StudyEvent } from "@/lib/study";

import { CREDIT_AREAS, FOCUS_SOURCE, HANDBOOK_MODULES, HANDBOOK_SOURCE, PROGRAM_SOURCE, areaLabel, curriculumProgress } from "@/lib/curriculum";

type View = "Overview" | "Courses" | "Exam table" | "Calendar" | "Deadlines" | "Degree progress";
type Modal = { type: "course"; course?: Course } | { type: "deadline"; deadline?: Deadline; courseId?: string; date?: string } | { type: "delete"; course: Course } | { type: "help" } | null;
const nav = [{ name: "Overview", icon: LayoutDashboard }, { name: "Courses", icon: BookOpen }, { name: "Calendar", icon: CalendarDays }, { name: "Degree progress", icon: GraduationCap }] as const;
const labels: Record<string, string> = { exam: "Exam", assignment: "Assignment", project: "Project", quiz: "Online quiz", other: "Other", planned: "Planned", "in-progress": "In progress", completed: "Completed" };

export function StudyApp({ initial, today }: { initial: StudyData; today: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>("Overview");
  const [specialization, setSpecialization] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [modal, setModalState] = useState<Modal>(null);
  const [formError, setFormError] = useState("");
  function setModal(next: Modal) { setFormError(""); setModalState(next); }
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const [eventTab, setEventTab] = useState("upcoming");
  const activeView = view === "Exam table" ? "Courses" : view === "Deadlines" ? "Calendar" : view;
  const admissionToCheck = initial.courses.filter(c => c.status === "in-progress" && c.admissionRequirements.length > 0 && admissionSummary(c.admissionRequirements).state !== "met");
  const summary = creditSummary(initial.courses);
  const allEvents = studyEvents(initial.courses, initial.deadlines);
  const upcoming = allEvents.filter(e => e.date >= today);
  const overdue = allEvents.filter(e => e.date < today && e.kind !== "exam");
  const nextWeek = upcoming.filter(e => daysAway(e.date, today) <= 7);
  const visibleCourses = initial.courses.filter(c => (specialization === "all" || c.specialization === specialization) && (status === "all" || c.status === status) && c.name.toLowerCase().includes(search.toLowerCase()));
  const examCourses = visibleCourses.filter(c => c.status === "in-progress");
  const filteredEvents = (eventTab === "overdue" ? overdue : upcoming).filter(e => visibleCourses.some(c => c.id === e.courseId));

  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 5500); return () => clearTimeout(timer); }, [notice]);
  function changeView(next: View) { setView(next); setSearch(""); setStatus("all"); setSpecialization("all"); setEventTab("upcoming"); }
  function run(action: () => Promise<{ success: boolean; error?: string }>, message: string) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) { const message = result.error ?? "Something went wrong."; setFormError(message); setNotice(message); return; }
        setModal(null); setNotice(message); router.refresh();
      } catch { setFormError("Could not reach the server. Please try again."); setNotice("Could not reach the server. Please try again."); }
    });
  }
  function submitCourse(data: FormData) { run(() => saveCourse(Object.fromEntries(data)), "Course saved. Your study plan is up to date."); }
  function submitDeadline(data: FormData) { run(() => saveDeadline(Object.fromEntries(data)), "Deadline saved to your study plan."); }
  function exportExams() {
    const cell = (v: string | number | null) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = [["Course", "ECTS", "Course group", "Status", "Exam 1", "Exam 2", "Admission progress", "Admission requirements", "Credit area", "Module ID"], ...examCourses.map(c => [c.name, c.credits, c.specialization, labels[c.status], c.exam1, c.exam2, admissionSummary(c.admissionRequirements).label, c.admissionRequirements.map(requirementDetail).join("; "), areaLabel(c.area), c.moduleId])];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(r => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "studyspace-exams.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a href="/" className="brand"><span className="brand-symbol"><Layers3 size={23} /></span>studyspace<span className="brand-dot">.</span></a>
      <div className="workspace"><span className="workspace-icon"><GraduationCap size={20} /></span><div><strong>My study space</strong><span>MSc Data Science</span></div><span className="workspace-indicator" /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{nav.map(n => <button key={n.name} className={`nav-item ${activeView === n.name ? "active" : ""}`} onClick={() => changeView(n.name)} aria-current={activeView === n.name ? "page" : undefined}><n.icon size={19} /><span>{n.name}</span>{n.name === "Calendar" && overdue.length > 0 && <b>{overdue.length}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-credits"><strong>{summary.completed} / 120 ECTS</strong><span>Completed course credits</span></div><button className="help-link" onClick={() => setModal({ type: "help" })}><CircleHelp size={17} /> Help & setup</button><div className="university"><span className="rwth-mark">RWTH<span>AACHEN</span></span><div>Data Science<strong>Master of Science</strong></div></div></div>
    </aside>

    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb">My workspace <ChevronRight size={14} /><span>{activeView}</span></div><div className="topbar-right"><span className="academic-badge"><span /> RWTH Aachen</span><span className="avatar" aria-label="Your study space">DS</span></div></header>
      <main>
        <div className="page-heading"><div><h1>{activeView}</h1><p className="page-subtitle">{activeView === "Overview" ? "Your next exams and deadlines." : activeView === "Courses" ? "Manage courses, exam dates and admission requirements." : activeView === "Calendar" ? "See when things are due." : "See which credit requirements are still open."}</p></div><button className="primary" onClick={() => setModal({ type: activeView === "Calendar" && initial.courses.length ? "deadline" : "course" })}><Plus size={18} />{activeView === "Calendar" && initial.courses.length ? "Add deadline" : "Add course"}</button></div>
        {(view === "Courses" || view === "Exam table") && <div className="view-switch" role="group" aria-label="Course view"><button aria-pressed={view === "Courses"} onClick={() => changeView("Courses")}>All courses</button><button aria-pressed={view === "Exam table"} onClick={() => changeView("Exam table")}>Exam schedule</button></div>}
        {(view === "Calendar" || view === "Deadlines") && <div className="view-switch" role="group" aria-label="Schedule view"><button aria-pressed={view === "Calendar"} onClick={() => changeView("Calendar")}>Month</button><button aria-pressed={view === "Deadlines"} onClick={() => changeView("Deadlines")}>Deadline list</button></div>}

        {!initial.connected && <div className="connection-note"><span className="connection-dot" /><div><strong>Your space is ready to connect.</strong> Connect Neon to start saving your courses and dates.</div><button onClick={() => setModal({ type: "help" })}>Setup guide <ArrowRight size={14} /></button></div>}
        {initial.error && <div className="error-note" role="alert">{initial.error}<button onClick={() => router.refresh()}>Retry</button></div>}

        {view === "Overview" && <>
          <div className="overview-summary"><span><strong>{initial.courses.filter(c => c.status === "in-progress").length}</strong> active courses</span><span><strong>{nextWeek.length}</strong> dates in the next 7 days</span><button onClick={() => changeView("Degree progress")}><strong>{summary.completed} / 120</strong> ECTS <ArrowRight size={15} /></button></div>
          <section className="panel upcoming-panel"><div className="section-heading"><div><h2>Upcoming dates <span className="count">{upcoming.length}</span></h2><p>Select a task to edit it; tick it to mark it complete.</p></div><button className="text-button" onClick={() => changeView("Deadlines")}>All deadlines <ArrowRight size={15} /></button></div><div className="event-tabs"><button className={eventTab === "upcoming" ? "selected" : ""} onClick={() => setEventTab("upcoming")}>Upcoming</button><button className={eventTab === "overdue" ? "selected" : ""} onClick={() => setEventTab("overdue")}>Overdue {overdue.length > 0 && <span>{overdue.length}</span>}</button><span className="timezone-label">Aachen time</span></div>{(eventTab === "overdue" ? overdue : upcoming).length ? <div className="event-list">{(eventTab === "overdue" ? overdue : upcoming).slice(0, 5).map(e => <EventRow key={e.id} event={e} today={today} pending={pending} onComplete={() => run(() => updateDeadline(e.deadlineId!, "complete"), "Nice work. Deadline marked complete.")} onEdit={() => setModal(e.deadlineId ? { type: "deadline", deadline: initial.deadlines.find(d => d.id === e.deadlineId) } : { type: "course", course: initial.courses.find(c => c.id === e.courseId) })} />)}</div> : <Empty icon={<CalendarDays size={25} />} title={eventTab === "overdue" ? "All caught up." : "No upcoming dates"} text={eventTab === "overdue" ? "You have no overdue deadlines." : "Add an exam, assignment or quiz date and it will appear here."} action={eventTab === "upcoming" ? () => setModal(initial.courses.length ? { type: "deadline" } : { type: "course" }) : undefined} actionLabel={initial.courses.length ? "Add your next deadline" : "Add your first course"} />}</section>
          {admissionToCheck.length > 0 && <section className="overview-attention"><h2>Admission requirements to check</h2><p>These courses have requirements that are not yet marked as met.</p>{admissionToCheck.slice(0, 3).map(c => <button key={c.id} onClick={() => setModal({ type: "course", course: c })}><span>{c.name}</span><AdmissionStatus requirements={c.admissionRequirements} /><ChevronRight size={16} /></button>)}{admissionToCheck.length > 3 && <button className="text-button" onClick={() => changeView("Courses")}>View all courses <ArrowRight size={15} /></button>}</section>}
        </>}
        {view === "Degree progress" && <CurriculumPanel courses={initial.courses} onEdit={course => setModal({ type: "course", course })} />}

        {view !== "Overview" && view !== "Degree progress" && <>
          <div className="filterbar"><div className="search-box"><Search size={17} /><input aria-label="Search courses" placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} /></div><div className="filter-select"><SlidersHorizontal size={15} /><select aria-label="Filter by course group" value={specialization} onChange={e => setSpecialization(e.target.value)}><option value="all">All course groups</option>{SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}</select></div>{view !== "Exam table" && <select className="status-select" aria-label="Filter by course status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="planned">Planned</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select>}{view === "Exam table" && <button className="secondary" onClick={exportExams} disabled={!examCourses.length}><ArrowDownToLine size={16} /> Export CSV</button>}</div>
          {view === "Courses" && (visibleCourses.length ? <><div className="results-label">{visibleCourses.length} courses · {creditSummary(visibleCourses).completed} ECTS completed</div><div className="course-grid">{visibleCourses.map(c => <CourseCard key={c.id} course={c} deadlines={initial.deadlines} onEdit={() => setModal({ type: "course", course: c })} onDeadline={() => setModal({ type: "deadline", courseId: c.id })} />)}</div></> : <section className="panel"><Empty icon={<BookOpen size={28} />} title={initial.courses.length ? "No courses match." : "Your next chapter is unwritten."} text={initial.courses.length ? "Try a different search or specialization." : "Add your first course to start building your study plan."} action={() => setModal({ type: "course" })} actionLabel="Add a course" /></section>)}
          {view === "Exam table" && <section className="panel"><div className="section-heading"><div><h2>Your exam schedule</h2><p>In-progress courses only. Both sittings, side by side.</p></div><span className="count">{examCourses.length} courses</span></div>{examCourses.length ? <div className="table-scroll"><table><thead><tr><th>COURSE</th><th>ECTS</th><th>EXAM 1</th><th>EXAM 2</th><th>EXAM ADMISSION</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{[...examCourses].sort((a, b) => (a.exam1 ?? "9999").localeCompare(b.exam1 ?? "9999")).map(c => <tr key={c.id}><td><strong>{c.name}</strong><small>{c.specialization}</small></td><td>{c.credits}</td><td><ExamDate date={c.exam1} today={today} completed={c.status === "completed"} /></td><td><ExamDate date={c.exam2} today={today} completed={c.status === "completed"} /></td><td><details className="exam-admission-details"><summary><AdmissionStatus requirements={c.admissionRequirements} /></summary>{c.admissionRequirements.length ? c.admissionRequirements.map((r, i) => <small key={i}>{requirementDetail(r)}</small>) : <small>No admission requirements recorded.</small>}</details></td><td><button className="icon-button" aria-label={`Edit ${c.name}`} onClick={() => setModal({ type: "course", course: c })}><Pencil size={16} /></button></td></tr>)}</tbody></table></div> : <Empty icon={<CalendarDays size={28} />} title="No in-progress courses to show." text="Set a course to In progress and add its exam dates to see it here." action={() => setModal({ type: "course" })} actionLabel="Add a course" />}</section>}
          {view === "Calendar" && <StudyCalendar today={today} events={allEvents.filter(e => visibleCourses.some(c => c.id === e.courseId))} renderEvent={e => <EventRow key={e.id} event={e} today={today} pending={pending} onComplete={() => run(() => updateDeadline(e.deadlineId!, "complete"), "Deadline completed. Well done.")} onEdit={() => setModal(e.deadlineId ? { type: "deadline", deadline: initial.deadlines.find(d => d.id === e.deadlineId) } : { type: "course", course: initial.courses.find(c => c.id === e.courseId) })} />} onAdd={date => setModal(initial.courses.length ? { type: "deadline", date } : { type: "course" })} hasCourses={initial.courses.length > 0} />}
          {view === "Deadlines" && <section className="panel"><div className="section-heading"><div><h2>Your dates & deadlines</h2><p>One list for every course. Tick things off as you go.</p></div><button className="text-button" disabled={!initial.courses.length} onClick={() => setModal({ type: "deadline" })}><Plus size={16} /> Add deadline</button></div><div className="event-tabs">{["upcoming", "overdue", "completed"].map(t => <button key={t} className={eventTab === t ? "selected" : ""} onClick={() => setEventTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>{eventTab === "completed" ? initial.deadlines.filter(d => d.done && visibleCourses.some(c => c.id === d.courseId)).length ? <div className="event-list">{initial.deadlines.filter(d => d.done && visibleCourses.some(c => c.id === d.courseId)).map(d => <div className="completed-row" key={d.id}><CheckCheck size={20} /><div><strong>{d.title}</strong><p>{initial.courses.find(c => c.id === d.courseId)?.name} · {labels[d.kind]} · {formatDate(d.dueDate)}</p></div><button className="text-button" disabled={pending} onClick={() => run(() => updateDeadline(d.id, "reopen"), "Deadline reopened.")}>Reopen</button><button className="icon-button" aria-label={`Delete ${d.title}`} disabled={pending} onClick={() => run(() => updateDeadline(d.id, "delete"), "Deadline deleted.")}><Trash2 size={16} /></button></div>)}</div> : <Empty icon={<CheckCheck size={28} />} title="Your wins will live here." text="Completed assignments, projects and quizzes appear here." /> : filteredEvents.length ? <div className="event-list">{filteredEvents.map(e => <EventRow key={e.id} event={e} today={today} pending={pending} onComplete={() => run(() => updateDeadline(e.deadlineId!, "complete"), "Deadline completed. Well done.")} onEdit={() => setModal(e.deadlineId ? { type: "deadline", deadline: initial.deadlines.find(d => d.id === e.deadlineId) } : { type: "course", course: initial.courses.find(c => c.id === e.courseId) })} />)}</div> : <Empty icon={<ListTodo size={28} />} title={eventTab === "overdue" ? "All caught up." : "Nothing on the list just yet."} text="Add assignments, projects and online quizzes to your courses." action={() => setModal(initial.courses.length ? { type: "deadline" } : { type: "course" })} actionLabel={initial.courses.length ? "Add a deadline" : "Add your first course"} />}</section>}
        </>}
        <footer><span>Studyspace</span><span>MSc Data Science <span className="footer-dot">·</span> RWTH Aachen <span className="footer-dot">·</span> 120 ECTS</span></footer>
      </main>
    </div>

    {notice && <div className="toast" role="status"><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={16} /></button></div>}
    {modal && <ModalShell title={modal.type === "course" ? modal.course ? "Edit course" : "Add course" : modal.type === "deadline" ? modal.deadline ? "Edit deadline" : "Add deadline" : modal.type === "delete" ? "Delete this course?" : "Help & setup"} onClose={() => !pending && setModal(null)}>
      {formError && <p className="form-error" role="alert">{formError}</p>}
      {modal.type === "course" && <CourseForm key={modal.course?.id ?? "new-course"} course={modal.course} pending={pending} canSave={initial.connected && !initial.error} onSubmit={submitCourse} onCancel={() => setModal(null)} onDelete={() => setModal({ type: "delete", course: modal.course! })} />}

      {modal.type === "deadline" && <form onSubmit={e => { e.preventDefault(); submitDeadline(new FormData(e.currentTarget)); }}><p className="form-intro">An assignment, a project, an online quiz—or anything you need to remember.</p><input type="hidden" name="id" value={modal.deadline?.id ?? ""} /><label>Title<input name="title" required maxLength={160} autoFocus placeholder="e.g. Online quiz — week 3" defaultValue={modal.deadline?.title} /></label><label>Course<select name="courseId" required defaultValue={modal.deadline?.courseId ?? modal.courseId ?? initial.courses[0]?.id}>{initial.courses.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><div className="form-grid"><label>Type<select name="kind" defaultValue={modal.deadline?.kind ?? "assignment"}>{DEADLINE_KINDS.map(k => <option key={k} value={k}>{labels[k]}</option>)}</select></label><label>Due date<input name="dueDate" type="date" required defaultValue={modal.deadline?.dueDate ?? modal.date ?? ""} /></label></div><p className="field-hint">Add as many quizzes or deadlines as you need to each course. Dates follow Aachen time.</p><div className="form-actions">{modal.deadline && <button type="button" className="danger-text" disabled={pending} onClick={() => run(() => updateDeadline(modal.deadline!.id, "delete"), "Deadline deleted.")}><Trash2 size={15} /> Delete</button>}<button type="button" className="secondary push-right" disabled={pending} onClick={() => setModal(null)}>Cancel</button><button className="primary" disabled={pending || !initial.connected || !!initial.error}>{pending ? "Saving…" : "Save deadline"}</button></div></form>}
      {modal.type === "delete" && <><p className="form-intro">Deleting <strong>{modal.course.name}</strong> will also delete its deadlines and remove its credits from your progress. This cannot be undone.</p><div className="form-actions"><button className="secondary" disabled={pending} onClick={() => setModal({ type: "course", course: modal.course })}>Go back</button><button className="primary destructive" disabled={pending} onClick={() => run(() => deleteCourse(modal.course.id), "Course deleted.")}>{pending ? "Deleting…" : "Delete course"}</button></div></>}
      {modal.type === "help" && <div className="help-content"><p>A personal planner for your MSc Data Science at RWTH Aachen. Track your course groups and degree credit areas, both exam sittings, and unlimited assignment, project and online quiz dates.</p><h3>Your 120 ECTS journey</h3><p>Only courses marked <strong>Completed</strong> count toward recorded credits. Coursework allocated outside the degree is excluded. Both exam dates are planning dates; completing a course removes its exams from your upcoming list.</p><h3>No login. Your browser, your space.</h3><p>A private browser cookie links to your saved studies. Use the same browser to return to your plan. Clearing cookies or switching browsers starts a separate space.</p><h3>Connect Neon</h3><ol><li>Create a Neon Postgres database.</li><li>Set its connection string as <code>DATABASE_URL</code> in <code>.env.local</code>.</li><li>Run <code>pnpm db:migrate</code>, then restart <code>pnpm dev</code>.</li></ol><p className="field-hint">Your courses are personal planning records. Check official RWTH sources for module requirements and exam registrations.</p></div>}
    </ModalShell>}
  </div>;
}

function CourseForm({ course, pending, canSave, onSubmit, onCancel, onDelete }: {
  course?: Course; pending: boolean; canSave: boolean;
  onSubmit: (data: FormData) => void; onCancel: () => void; onDelete: () => void;
}) {
  return <form className="course-form" onInvalidCapture={e => {
    let parent = (e.target as HTMLElement).parentElement;
    while (parent && parent !== e.currentTarget) { if (parent instanceof HTMLDetailsElement) parent.open = true; parent = parent.parentElement; }
  }} onSubmit={e => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}>
    <input type="hidden" name="id" value={course?.id ?? ""} />
    <label>Course name<input name="name" defaultValue={course?.name} required maxLength={160} placeholder="e.g. Machine Learning" autoFocus /></label>
    <div className="form-grid"><label>Credits (ECTS)<input name="credits" type="number" min="0" max="120" step="0.5" required defaultValue={course?.credits ?? 6} /></label><label>Status<select name="status" defaultValue={course?.status ?? "in-progress"}><option value="planned">Planned</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></label></div>
    <label>Counts toward<select name="area" defaultValue={course?.area ?? "unassigned"}>{CREDIT_AREAS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
    <details className="form-section" open={!!(course?.exam1 || course?.exam2)}><summary>Exam dates</summary><div className="form-grid"><label>First sitting<input name="exam1" type="date" defaultValue={course?.exam1 ?? ""} /></label><label>Second sitting<input name="exam2" type="date" defaultValue={course?.exam2 ?? ""} /></label></div></details>
    <details className="form-section" open={!!course?.admissionRequirements.length}><summary>Exam admission requirements {course?.admissionRequirements.length ? `(${course.admissionRequirements.length})` : ""}</summary><RequirementsEditor initial={course?.admissionRequirements ?? []} disabled={pending} /></details>
    <details className="form-section"><summary>Specialization & handbook</summary><label>Specialization group<select name="specialization" defaultValue={course?.specialization ?? SPECIALIZATIONS[0]}>{SPECIALIZATIONS.map(spec => <option key={spec}>{spec}</option>)}</select></label><p className="field-hint">Used for specialization credits. Core credits count across both groups.</p><HandbookModuleField moduleId={course?.moduleId ?? ""} /></details>
    <details className="form-section" open={!!(course?.semester || course?.notes)}><summary>Semester & notes</summary><label>Semester<input name="semester" maxLength={60} placeholder="e.g. Winter 2026/27" defaultValue={course?.semester} /></label><label>Notes<textarea name="notes" maxLength={4000} rows={2} placeholder="Room, registration details or reminders" defaultValue={course?.notes} /></label></details>
    <div className="form-actions">{course && <button type="button" className="danger-text" disabled={pending} onClick={onDelete}><Trash2 size={15} /> Delete</button>}<button type="button" className="secondary push-right" disabled={pending} onClick={onCancel}>Cancel</button><button className="primary" disabled={pending || !canSave}>{pending ? "Saving…" : "Save course"}</button></div>
    {!canSave && <p className="field-hint">Saving is unavailable. Check the connection message in the workspace.</p>}
  </form>;
}

function CurriculumPanel({ courses, onEdit }: { courses: Course[]; onEdit: (course: Course) => void }) {
  const [focus, setFocus] = useState<string>(SPECIALIZATIONS[0]);
  const progress = curriculumProgress(courses, focus);
  return <section className="panel curriculum-panel" aria-labelledby="curriculum-heading">
    <div className="section-heading"><div><h2 id="curriculum-heading">Your degree requirements</h2><p>Completed course credits: {creditSummary(courses).completed} / 120 ECTS.</p></div><a className="text-button" href={PROGRAM_SOURCE} target="_blank" rel="noreferrer">RWTH program structure <ArrowRight size={15} /></a></div>
    <div className="curriculum-focus"><label htmlFor="degree-focus">Specialization to check</label><select id="degree-focus" value={focus} onChange={e => setFocus(e.target.value)}>{SPECIALIZATIONS.map(spec => <option key={spec}>{spec}</option>)}</select><p>Choose the specialization you are working toward. This selection only changes the credit preview.</p></div>
    {progress.unassigned.length > 0 && <details className="curriculum-notice"><summary><strong>{progress.unassigned.length} {progress.unassigned.length === 1 ? "course needs" : "courses need"} a credit area.</strong></summary><p>Existing courses keep their course group. Choose a credit area to include them in these checks.</p><div>{progress.unassigned.map(c => <button className="text-button" key={c.id} onClick={() => onEdit(c)}>{c.name} <Pencil size={13} /></button>)}</div></details>}
    {progress.otherFocus.length > 0 && <p className="curriculum-note">{progress.otherFocus.length} specialization {progress.otherFocus.length === 1 ? "course belongs" : "courses belong"} to another group and is excluded from this preview.</p>}
    {progress.duplicateModules.length > 0 && <p className="curriculum-note">Duplicate module IDs are recorded. Review these courses before using the credit totals: {progress.duplicateModules.map(c => c.name).join(", ")}.</p>}
    <div className="degree-area-list">{progress.rows.filter(r => ["core", "focus", "seminar", "practical", "thesis", "additional"].includes(r.id)).map(r => <div className="degree-area-row" key={r.id}><div><h3>{r.label}</h3><span>{r.min === r.max ? `${r.min} ECTS required` : `${r.min}–${r.max} ECTS`}</span></div><strong>{r.earned} <small>earned</small></strong><span className={`admission-badge admission-${r.state === "met" ? "met" : r.state === "over" ? "below" : "pending"}`}>{r.state === "over" ? "Over limit" : r.state === "exception" ? "Review extra module" : r.state === "met" ? r.min === 0 && r.earned === 0 ? "Optional" : "In range" : `${r.min - r.earned} remaining`}</span></div>)}</div>
    <details className="degree-details"><summary>Credit breakdown & planned courses</summary>
    <div className="table-scroll"><table className="curriculum-table"><thead><tr><th>AREA</th><th>REQUIRED ECTS</th><th>EARNED</th><th>IN PROGRESS</th><th>PLANNED</th><th>CHECK</th></tr></thead><tbody>{progress.rows.map(r => <tr key={r.id} className={r.id === "core" || r.id === "focus" || r.id === "additional" ? "curriculum-total" : ""}><td>{r.label}</td><td>{r.max === Infinity ? `At least ${r.min}` : r.min === r.max ? r.min : `${r.min}–${r.max}`}</td><td>{r.earned}</td><td>{r.active}</td><td>{r.planned}</td><td><span className={`admission-badge admission-${r.state === "met" ? "met" : r.state === "over" ? "below" : "pending"}`}>{r.state === "over" ? "Above limit · Review" : r.state === "exception" ? "One-module overflow · Review" : r.state === "met" ? r.min === 0 && r.earned === 0 ? "Optional" : "In range" : `${r.min - r.earned} ECTS remaining`}</span></td></tr>)}</tbody></table></div>
    </details>
    <div className="mandatory-modules"><h3>Mandatory modules</h3>{progress.mandatory.map(m => <div key={m.id}><span>{m.name}<small>{m.credits} ECTS</small></span><span className={`admission-badge admission-${m.completed ? "met" : "pending"}`}>{m.completed ? "Completed" : "Not yet completed"}</span></div>)}</div>
    <details className="degree-details"><summary>Rules & official sources</summary><div className="curriculum-notes"><p>Core CS and Mathematics each require at least 18 ECTS, including their introductory module. Their minimums plus Ethics total 40; the core still needs at least 44.</p><p>The specialization may exceed 22 ECTS by one module. Other upper limits require review of surplus coursework. Additional competences need appropriate approval; language courses are capped at 4 ECTS and non-technical courses at 6.</p><p>Each course is assigned once. The core and additional rows include their subrows; do not add them again. Recorded totals do not certify your degree or allocation.</p><p>Scientific Integrity is tracked as a mandatory zero-credit course.</p><a href={FOCUS_SOURCE} target="_blank" rel="noreferrer">RWTH specialization rules · introductory meeting, slide 11</a><br /><a href={HANDBOOK_SOURCE} target="_blank" rel="noreferrer">Module handbook · PO 2018 · Winter 2026/27</a></div></details>
  </section>;
}

function HandbookModuleField({ moduleId }: { moduleId: string }) {
  const [value, setValue] = useState(moduleId);
  const module = HANDBOOK_MODULES.find(m => m.id === value);
  return <div className="handbook-field"><label>Module ID <span className="optional">optional</span><input name="moduleId" inputMode="numeric" pattern="[0-9]{7}" maxLength={7} list="handbook-modules" placeholder="Seven digits, e.g. 1215744" value={value} onChange={e => setValue(e.target.value)} /></label><datalist id="handbook-modules">{HANDBOOK_MODULES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</datalist>{module && <div className="handbook-reference"><strong>{module.name} · {module.credits} ECTS</strong><p>{module.admission}</p><a href={`${HANDBOOK_SOURCE}#page=${module.page}`} target="_blank" rel="noreferrer">Handbook, page {module.page} · Winter 2026/27</a><button className="text-button" type="button" onClick={e => { const form = e.currentTarget.form!; (form.elements.namedItem("name") as HTMLInputElement).value = module.name; (form.elements.namedItem("credits") as HTMLInputElement).value = String(module.credits); (form.elements.namedItem("area") as HTMLSelectElement).value = module.area; }}>Use module name, credits & area <ArrowRight size={14} /></button></div>}<p className="admission-hint">Selected handbook entries are available as suggestions. Other modules can be entered manually. Admission details may be announced in the lecture; no universal 50% rule is assumed.</p></div>;
}

function AdmissionStatus({ requirements, details = false }: { requirements: AdmissionRequirement[]; details?: boolean }) {
  const summary = admissionSummary(requirements);
  return <span className="admission-status"><span className={`admission-badge admission-${summary.state}`}>{summary.label}</span>{details && requirements.map((r, index) => <small key={index}>{requirementDetail(r)}</small>)}</span>;
}

function RequirementsEditor({ initial, disabled }: { initial: AdmissionRequirement[]; disabled: boolean }) {
  const [rows, setRows] = useState(() => initial.map((r, key) => ({ key, label: r.label, minimum: String(r.minimum), score: r.score === null ? "" : String(r.score), mode: r.mode ?? "percentage", fulfilled: r.fulfilled == null ? "" : r.fulfilled ? "yes" : "no" })));
  const nextKey = useRef(initial.length);
  const requirements = rows.map(r => ({ label: r.label, minimum: Number(r.minimum), score: r.score === "" ? null : Number(r.score), mode: r.mode, fulfilled: r.fulfilled === "" ? null : r.fulfilled === "yes" }));
  function update(key: number, field: "label" | "minimum" | "score" | "fulfilled", value: string) {
    setRows(current => current.map(r => r.key === key ? { ...r, [field]: value } : r));
  }
  return <fieldset className="admission-editor" disabled={disabled}>
    <legend>Exam admission requirements <span className="optional">optional</span></legend>
    <p className="admission-hint">Track percentage thresholds or confirmation of passed exercises and attendance. All listed requirements must be met.</p>
    <input type="hidden" name="admissionRequirements" value={JSON.stringify(requirements)} />
    {rows.map((row, index) => <div className="admission-requirement" key={row.key}>
      <div className="admission-row-heading"><strong>Requirement {index + 1}</strong><button className="icon-button" type="button" aria-label={`Remove admission requirement ${index + 1}`} onClick={() => setRows(current => current.filter(r => r.key !== row.key))}><X size={16} /></button></div>
      <label>Requirement name<input value={row.label} onChange={e => update(row.key, "label", e.target.value)} required maxLength={120} placeholder="e.g. Quizzes or assignments" /></label>
      <label>How to track<select value={row.mode} onChange={e => setRows(current => current.map(r => r.key === row.key ? { ...r, mode: e.target.value as "percentage" | "confirmation" } : r))}><option value="percentage">Minimum percentage</option><option value="confirmation">Passed / fulfilled confirmation</option></select></label>
      {row.mode === "confirmation" ? <label>Requirement status<select value={row.fulfilled} onChange={e => update(row.key, "fulfilled", e.target.value)}><option value="">Not confirmed yet</option><option value="yes">Passed / fulfilled</option><option value="no">Not yet fulfilled</option></select></label> : <div className="form-grid"><label>Minimum score (%)<input type="number" min="0" max="100" step="any" required value={row.minimum} onChange={e => update(row.key, "minimum", e.target.value)} /></label><label>Current overall score (%)<input type="number" min="0" max="100" step="any" value={row.score} onChange={e => update(row.key, "score", e.target.value)} placeholder="Not scored yet" /></label></div>}
      <AdmissionStatus requirements={[requirements[index]]} />
    </div>)}
    <button type="button" className="text-button" disabled={rows.length >= 20} onClick={() => { const key = nextKey.current++; setRows(current => [...current, { key, label: current.length === 0 ? "Quizzes" : current.length === 1 ? "Assignments" : "", minimum: "50", score: "", mode: "confirmation", fulfilled: "" }]); }}><Plus size={15} /> Add requirement</button>
    {rows.length > 0 && <p className="admission-hint">Enter the overall percentage yourself; scores are not calculated from completed deadlines. Use percentage thresholds only when announced for your module and semester.</p>}
  </fieldset>;
}

function StudyCalendar({ today, events, renderEvent, onAdd, hasCourses }: {
  today: string; events: StudyEvent[]; renderEvent: (event: StudyEvent) => React.ReactNode;
  onAdd: (date: string) => void; hasCourses: boolean;
}) {
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const dates = calendarDays(month);
  const byDate = new Map<string, StudyEvent[]>();
  for (const event of events) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }
  const monthCount = events.filter(e => e.date.startsWith(month)).length;
  const dayEvents = byDate.get(selected) ?? [];
  function navigate(offset: number) {
    const next = shiftMonth(month, offset);
    setMonth(next);
    setSelected(`${next}-01`);
  }
  return <section className="panel calendar-panel" aria-label="Study calendar">
    <div className="section-heading calendar-toolbar">
      <div aria-live="polite"><h2>{formatDate(`${month}-01`, { month: "long", year: "numeric" })}</h2><p>{monthCount} {monthCount === 1 ? "event" : "events"} · Aachen time · Select a day for details</p></div>
      <div className="calendar-navigation"><button className="secondary" onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>Today</button><button className="icon-button" aria-label="Previous month" onClick={() => navigate(-1)}><ChevronLeft size={20} /></button><button className="icon-button" aria-label="Next month" onClick={() => navigate(1)}><ChevronRight size={20} /></button></div>
    </div>
    <div className="calendar-weekdays" aria-hidden="true">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid" role="group" aria-label={formatDate(`${month}-01`, { month: "long", year: "numeric" })}>
      {dates.map(date => {
        const list = byDate.get(date) ?? [];
        return <button key={date} className={`calendar-day${date.startsWith(month) ? "" : " outside-month"}${date === selected ? " selected-day" : ""}`} aria-pressed={date === selected} aria-current={date === today ? "date" : undefined} aria-label={`${formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${date === today ? ", today" : ""}, ${list.length} ${list.length === 1 ? "event" : "events"}`} onClick={() => { setSelected(date); if (!date.startsWith(month)) setMonth(date.slice(0, 7)); }}>
          <span className="calendar-day-number">{Number(date.slice(8))}</span>
          <span className="calendar-event-previews" aria-hidden="true">{list.slice(0, 2).map(e => <span key={e.id} className={`calendar-event ${e.kind === "exam" ? "calendar-exam" : "calendar-deadline"}`} title={`${e.title} · ${e.courseName}`}>{e.title} · {e.courseName}</span>)}{list.length > 2 && <span className="calendar-more">+{list.length - 2} more</span>}</span>
          {list.length > 0 && <span className="calendar-mobile-count" aria-hidden="true">{list.length}</span>}
        </button>;
      })}
    </div>
    <div className="calendar-legend"><span><i className="exam-dot" /> Exams</span><span><i className="deadline-dot" /> Deadlines</span><span>Completed items leave the calendar.</span></div>
    <div className="calendar-agenda" aria-live="polite">
      <div className="section-heading"><div><h2>{formatDate(selected, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2><p>{dayEvents.length ? `${dayEvents.length} scheduled ${dayEvents.length === 1 ? "event" : "events"}. Select an event to edit.` : "No exams or deadlines on this day."}</p></div><button className="text-button" onClick={() => onAdd(selected)}><Plus size={16} />{hasCourses ? "Add deadline" : "Add course"}</button></div>
      {dayEvents.length > 0 && <div className="event-list">{dayEvents.map(renderEvent)}</div>}
    </div>
  </section>;
}

function EventRow({ event, today, pending, onComplete, onEdit }: { event: StudyEvent; today: string; pending: boolean; onComplete: () => void; onEdit: () => void }) {
  const delta = daysAway(event.date, today);
  return <div className="event-row"><div className={`date-tile ${delta < 0 ? "late" : ""}`}><span>{formatDate(event.date, { month: "short" })}</span><strong>{formatDate(event.date, { day: "2-digit" })}</strong></div><button className="event-description" onClick={onEdit}><strong>{event.title}</strong><span>{event.courseName}</span></button><div className="event-meta"><span className={`badge ${event.kind}`}>{labels[event.kind]}</span><span className={delta < 0 ? "overdue-text" : delta <= 3 ? "soon-text" : "muted"}>{delta < 0 ? `${-delta}d overdue` : delta === 0 ? "Today" : delta === 1 ? "Tomorrow" : `In ${delta} days`}</span></div>{event.deadlineId && <button className="complete-button" title="Mark complete" aria-label={`Complete ${event.title}`} disabled={pending} onClick={onComplete}><Check size={15} /></button>}</div>;
}
function CourseCard({ course: c, deadlines, onEdit, onDeadline }: { course: Course; deadlines: Deadline[]; onEdit: () => void; onDeadline: () => void }) {
  const open = deadlines.filter(d => d.courseId === c.id && !d.done).length;
  return <article className="course-card"><div className="course-card-top"><span className="course-glyph"><BookOpen size={19} /></span><span className={`badge ${c.status}`}>{labels[c.status]}</span><button className="icon-button" aria-label={`Edit ${c.name}`} onClick={onEdit}><Pencil size={15} /></button></div><button className="course-title" onClick={onEdit}><h3>{c.name}</h3></button><p className="course-spec">{areaLabel(c.area)}</p><div className="course-details"><span><strong>{c.credits}</strong> ECTS</span><span>{c.semester || "Semester not set"}</span></div>{c.admissionRequirements.length > 0 && <button className="course-admission" onClick={onEdit}><span>Exam admission</span><AdmissionStatus requirements={c.admissionRequirements} /></button>}<div className="course-card-footer"><span><CalendarDays size={14} />{c.exam1 ? formatDate(c.exam1, { day: "numeric", month: "short" }) : "No exam date"}</span><button onClick={onDeadline}><Plus size={14} />{open ? `${open} deadlines` : "Add deadline"}</button></div></article>;
}
function Empty({ icon, title, text, action, actionLabel }: { icon: React.ReactNode; title: string; text: string; action?: () => void; actionLabel?: string }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{text}</p>{action && <button className="text-button" onClick={action}>{actionLabel}<ArrowRight size={15} /></button>}</div>;
}
function ExamDate({ date, today, completed }: { date: string | null; today: string; completed: boolean }) {
  return <span className={!date ? "muted" : "exam-date"}>{formatDate(date)}{date && !completed && date >= today && <small>{daysAway(date, today) === 0 ? "Today" : `In ${daysAway(date, today)} days`}</small>}</span>;
}
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const cancel = (event: Event) => { event.preventDefault(); closeRef.current(); };
    dialog.addEventListener("cancel", cancel);
    return () => { dialog.removeEventListener("cancel", cancel); dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-heading" onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}><div className="modal-heading"><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button><h2 id="modal-heading">{title}</h2></div>{children}</dialog>;
}
