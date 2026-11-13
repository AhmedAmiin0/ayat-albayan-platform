# 49 — Teacher web: no «التقارير» tab, reports inside each lesson

Owner 2026-11-13 (web only): «remove the reports tab from the web and list all the reports inside each lesson».

This brief comes from read-only workflow wf_29b72102-931 (3 mappers plus a completeness critic), checked against origin/develop dbeab196e. It is the web half of docs/47 PR 2, plus removing the student file's own «التقارير» tab. The paused list and the mobile changes are not part of it.

## Defaults applied (the owner may override)

1. Teachers lose the grade-progress chart and the sortable table of sent reports. Admins keep both (R-REP-05). Each report opens inside its lesson in the student file.
2. In a group lesson, a student's file shows only that student's report. The lesson drawer lists one report link per student (rule below, for the web-today PR).
3. Mobile follows in docs/47 PR 2 (mobile).

## Build brief

GOAL (owner 2026-11-13, web only): remove «التقارير» from the teacher web, and show each lesson's report inside that lesson.
- Base: origin/develop dbeab196e (#711, #712, #713 in).
- One PR. No API change, no migration, no new endpoint, no i18n key added or removed.
- Rules for every file:
  1. ≤150 lines per file.
  2. ≤3 params per function (use an options object).
  3. Strict TS, no any, no non-null assertions.
  4. Unit tests next to the code.
- Also: lookup maps, not if-chains; no useEffect; MSA strings; never run tests/builds on the owner's PC (cloud CI only).

A) NAV AND OLD URLS
1. apps/web/src/features/teaching/teacher/TeacherNav.tsx: delete line 13 (/teacher/reports).
   - TeacherNav.test.tsx: delete the rows at :24 and :37, and drop "reports, " from the title at :16.
   - TeacherNav.bar.test.tsx:21: change 9 to 8.
   - SalesNav.permissions.test.tsx:46: use t.teacherNav.students.
   - With the default switches off, the nav reads اليوم · جدولي · الطلاب.
2. apps/web/src/routes/teacher/reports.index.tsx: keep the file (e2e/areas.json:259 and guard.mjs:24-27 need it) and make it a redirect only:
   createFileRoute('/teacher/reports/')({ beforeLoad: () => { redirect({ to: '/teacher/students', throw: true }); } })
   - No validateSearch, so any old ?page/sort/f_* is dropped.
3. apps/web/src/routes/teacher/reports.$studentId.tsx: delete `search: { tab: 'reports' }` (:13). Keep `hash: location.hash` and reword the :4-6 comment.
   - file/reports-redirect.test.ts: drop `search` at :28.
   - Add a case that imports the reports.index Route: beforeLoad throws a redirect to '/teacher/students' with no search.
4. DELETE:
   - teacher/reports/MyReports.tsx and MyReports.test.tsx
   - teacher/reports/SubmittedReports.tsx and submitted-report-columns.tsx
   - teacher/MyStudents.tsx, MyStudents.test.tsx, MyStudents.sort.test.tsx and myStudentColumns.tsx
   KEEP teacher/reports/MyFeedback* (routes/teacher/feedback.tsx:3 uses it).
5. teacher/api.ts: delete :39-50 (MY_REPORTS_PAGE_SIZE, myReportsQuery) and the imports that become unused (today: TeacherReportView, Page, REPORTS_KEY, sortFilterParams, ServerListState). keepPreviousData stays.
   - teacher/index.ts: drop MY_REPORTS_PAGE_SIZE and myReportsQuery.
   - Keep the API's GET /teachers/me/reports: mobile and e2e teacher-isolation.spec.ts:81 use it.

B) STUDENT FILE WITHOUT TABS
1. routes/teacher/students.$studentId.tsx: drop zod, FILE_TABS, validateSearch, useSearch and navigate; render <TeacherStudentFile studentId={studentId} />. A stale ?tab=… is simply ignored.
   - Delete teacher-students/file/file-tabs.ts and the export at teacher-students/index.ts:1.
2. file/TeacherStudentFile.tsx: props are { studentId } only. Render, in order:
   - FileHead
   - TrialChatNote
   - CourseLine
   - PendingReports (the call at :70 stays byte-identical; web-today owns the component)
   - UpcomingLessons
   - AttendanceLog
   Drop useId, Tabs/tabIds, TABS, panels, and the StudentReportsBody and StudentRecordings imports. Update the doc comment.
3. people/students/index.ts:41: drop the StudentRecordings export (knip; StudentProfilePage imports the deep path).
4. reporting/reports/paths.ts:16: the teacher href becomes `/teacher/students/${studentId}`; fix the comment at :12.
   - paths.test.ts:13: expect '/teacher/students/s'.
   - ReportFormPage keeps its «سجل التقارير» link.
5. reporting/reports/history/RecordingLink.tsx: delete `search={{ tab: 'reports' }}` (:25) and fix the comment.
   - StudentReportsPage.recording.test.tsx:56: expect '/teacher/students/s-1#recording-l-b'; retitle :53.

C) REPORT INSIDE EACH LESSON ROW (this student's report; recording too)
1. reporting/report-page/api.ts: add reportPageByIdQuery(reportId).
   - queryKey ['report-page','by-report',reportId]
   - queryFn: reportPageViewSchema.parse(await apiFetch(`/report-pages/by-report/${reportId}`))
   - retry: false
2. reporting/report-page/ReportPageBody.tsx: add `head = true` to its props and wrap the <header> in `{head && …}`. ReportPage and PublicReport are unchanged.
3. NEW reporting/report-page/LessonReportView.tsx. It must be the ONLY new code file in this folder: 11 → 12, cap 12, folder-cap --strict.
   - `LessonReportView({ reportId })` calls useQuery(reportPageByIdQuery(reportId)).
   - isError: a muted <p className="text-sm text-ink-3">{t.common.error}</p>. A report under another teacher id answers 404.
   - Loading: ListSkeleton.
   - Data: <ReportPageBody view={data} head={false} />. Its header prints the student's zone and repeats the names, so it is hidden here.
   - This shows the lines, the «edited» note, the attachments and the PDF.
   - Export it from report-page/index.ts.
4. NEW people/students/recordings/LessonRecording.tsx: `LessonRecording({ studentId, lessonId, startsAt })`.
   - day = startsAt.slice(0,10). The row's ISO time is UTC, and the API's day range is UTC and includes both ends.
   - useQuery(studentRecordingsQuery({ studentId, filters: { from: day, to: day }, page: 1 })), then items.find(r => r.lesson_id === lessonId).
   - Render <ul><StudentRecordingRow rec={rec} role="teacher" /></ul>, or null.
   - Add `// ponytail: >10 recordings of one student in one UTC day miss; add lessonId to studentRecordingsQuerySchema then.`
   - Export it from people/students/index.ts.
5. NEW teaching/teacher-board/attendance/LessonDisclosure.tsx: `LessonDisclosure({ row, studentId })`, with row: Pick<AttendanceTableRow,'lesson_id'|'starts_at'|'report_id'>.
   - recorded = useQuery(recordedLessonIdsQuery(studentId)), one cached request per student. hasRec = Array.isArray(recorded.data) && recorded.data.includes(row.lesson_id).
   - If there is no report_id and no hasRec, return null.
   - const [open, setOpen] = useState(() => window.location.hash === `#recording-${row.lesson_id}`). Old #recording-<id> links (the reports.$studentId redirect, and RecordingLink from the board drawer until web-students deletes it) open that row. Add `// ponytail: only rows of the month shown`.
   - Render <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>.
     - <summary className={buttonVariants({ variant: 'secondary', size: 'sm' })}> reads row.report_id ? t.reports.view : t.studentRecordings.reportLink.
     - ONLY while open: <div ref={revealOnMount} className="grid w-[min(36rem,85vw)] gap-4 whitespace-normal"> with {row.report_id && <LessonReportView reportId={row.report_id} />} and {hasRec && <LessonRecording … />}.
     - Lazy mount: no request per row until it is opened.
   - No useEffect (revealOnMount from lib/dom/mount-refs.ts).
6. teaching/teacher-board/attendance/LogReportCell.tsx:
   - Row adds 'report_id'.
   - CELLS.view becomes () => null, because reading moves into the disclosure.
   - edit keeps RowWindow («تعديل التقرير» plus the family line); write is unchanged.
   - Return <span className="grid justify-items-start gap-1">{action ? CELLS[action](row, href) : <span className="text-ink-3">—</span>}<LessonDisclosure row={row} studentId={studentId} /></span>.
   UpcomingLessons and AttendanceLog need no edit, because both use attendanceColumns.
7. Group lessons: the file is per student, so it shows THIS student's report only (the repo filters by student_id). The every-student listing lives in the lesson drawer (web-today, see drawer_rule). No classmates' reports go in another family's file.

D) UNIT TESTS
- NEW report-page/LessonReportView.test.tsx, using the local page.fixture pageView():
  - fetches /report-pages/by-report/r-1
  - shows the attendance line and the PDF link «تنزيل التقرير (PDF)»
  - the header line «حلقة … بتاريخ …» is absent
  - an ApiError 404 shows the muted error
- NEW teacher-board/attendance/LessonDisclosure.test.tsx. Mock the report-page barrel's LessonReportView and the people/students barrel's LessonRecording (spread orig) with stubs; do not deep-import fixtures (boundaries lint covers tests).
  - nothing mounts and no by-report call before opening
  - a click on the summary shows the stub
  - a recording-only row reads «تسجيل الحلقة»
  - window.location.hash '#recording-l-9' starts it open
  - no report and no recording render nothing
- AttendanceLog.test.tsx:
  - give rows e (:42) and v (:43) report_id 'r-e' / 'r-v'
  - answer recorded-lesson-ids with []
  - :92: the view row has no link and has the summary text t.reports.view
  - :90-91 (write/edit links) are unchanged
- TeacherStudentFile.test.tsx:65-76: assert NO tablist; upcoming and the log both render; drop onTab.
- DELETE file/TeacherStudentFile.reports.test.tsx.
- file/file-fixture.tsx: drop tab, onTab, the FileTab import and the '/students/s-1/reports' answer. Keep the recorded-lesson-ids and recordings answers.
- file/file-data.ts: drop REPORTS and its `report` const (knip).
- Plus the nav, redirect, paths and recording test edits in A and B.

E) E2E (CI only)
- e2e/tests/reporting/teacher-student-file.spec.ts, after :117 (the edit-link check):
  - in `after`, click the row's summary: locator('summary', { hasText: ar.reports.view }) filtered to the today row
  - expect teacher.getByRole('article', { name: ar.reportPage.title }) to be visible
  - keep the body /ريال|SAR|EGP/ check AFTER opening
- No spec visits /teacher/reports or clicks the nav item (grep verified).
- Leave teacher-week-history.spec.ts:92-99 alone: StudentDrawer still has its tab in this PR, and web-students rewrites it (its grade-chart assertion has no teacher surface after both land).

F) GATES
- Lint suppressions:
  - Remove the eslint and oxlint keys for src/features/teaching/teacher/{MyStudents.tsx, myStudentColumns.tsx, reports/MyReports.tsx, reports/SubmittedReports.tsx, reports/submitted-report-columns.tsx}.
  - Shrink src/routes/teacher/reports.index.tsx and src/features/teaching/teacher/api.ts.
  - Run `pnpm lint:prune` and `pnpm lint:oxfull -- --prune` in the cloud routine and commit both JSONs. The paths.ts and RecordingLink.tsx max-len counts may drop; prune handles that.
- knip: FILE_TABS, myReportsQuery, MY_REPORTS_PAGE_SIZE, the StudentRecordings barrel export and REPORTS all go. KEEP the StudentReportsBody export (reports/index.ts:19), because StudentDrawer.tsx:5 still uses it.
- Folder counts after: report-page 12, students/recordings 10, teacher-board/attendance 7.
- routeTree.gen.ts: no regen (no route file added, removed or renamed). e2e/areas.json: no edit.
- i18n: keep teacherNav.reports (mobile TeacherTabs), teacherFile.tabs (mobile), teacherBoard.lessonsTab/reportsTab (StudentDrawer, mobile), and the reports.* history keys. No new keys.
- Docs: in docs/47, mark the web half of PR2 (nav item, redirect, deletions) as done by this PR. At :366 the redirect target is the file with no tab. The paused list is not included.
- PHASE_SUMMARY line.

G) DO NOT TOUCH
- web-today: TeacherLessonCard, TeacherLessonLead/Row/Drawer, PendingReports, TeacherDashboard, TodayPanel, LessonReportLinks.tsx with LessonReportLinks.test.tsx and .clock.test.tsx, journey-2-report.spec.ts.
- web-students:
  - TeacherBoard, board-rows, board-columns, cells/ (AttendanceStatus.tsx:4 imports cells/attendance-style.ts; web-students must keep or move it), StudentCell
  - teacher-students/columns.tsx and TeacherStudents.tsx
  - teacher-board/drawer/* and teacher-board/index.ts
  - teacher-week-history.spec.ts
- web-schedule: MyWeek, WeekGrid, the docs/03 R-TCH-03 rewording.
- mobile-today and all of apps/mobile; apps/api; StudentReportsPage, StudentReportsBody, ReportHistoryList, PdfAction (admin uses them); report.$lessonId.tsx; MyFeedback.

H) OVERLAPS AND ORDER
- Independent of web-today, web-students and web-schedule.
- teacher/index.ts: web-students removes the TeacherLessonCard export (:9) and this PR removes :2 and :5. Both are line deletions; whoever lands second rebases.
- Both suppression JSONs conflict with every parallel PR: re-run prune on rebase, never hand-merge counts.
- Whoever lands last of this PR and web-students drops the StudentReportsBody export at reports/index.ts:19.

## Drawer rule (for the web-today PR, docs/48 PR2; not this PR)

For the web-today PR. It owns TeacherLessonCard, TeacherLessonDrawer and TeacherLessonLead, and for this change also LessonReportLinks.tsx with LessonReportLinks.test.tsx and LessonReportLinks.clock.test.tsx. Owner 2026-11-13: «list all the reports inside each lesson».

Today the teacher card shows ONE generic link: LessonReportLinks.tsx:22 slice(0,1), label formTitle at :28.

R1 Where:
- Only the DRAWER card (TeacherLessonDrawer / TeacherLessonCard) lists reports.
- The row and the hero keep the single aggregated lead from lessonPlan.
- Show the report control whenever reportStage(lesson, now) !== null, meaning started and not cancelled or moved. That includes 'window' and 'done', so it is never hidden after the send.

R2 One student: exactly one control, labelled by stage, href /teacher/report/$lessonId:
- write → reports.open «اكتب التقرير»
- resume → reports.resume «أكمل التقرير»
- window → reports.edit «تعديل التقرير»
- done → reports.view «عرض التقرير»

R3 Group (lesson.students.length > 1):
- One ReportLink PER lesson.students entry; never slice(0,1) or students[0].
- Accessible name `${s.name}: ${label}`, the same pattern as TeacherLessonCard.tsx:67.
- The label comes from that student's own stage: reportStage({ ...lesson, students: [s] }, now). No new logic.
- All links go to /teacher/report/$lessonId, which holds every student's entry.
- All are drawn SECONDARY, never N filled buttons (docs/48:193-195).
- Optionally render RowWindow for window/done students so each shows «سيُرسل إلى الأسرة بعد …».
- Do NOT use logReportAction here: it maps a draft to 'view'.

R4 Data: only LessonView.students[].report (packages/schedule/src/lessons/views.ts:27-32), which the API already fills per student. No extra fetch, no pending list.

R5 The admin branch of LessonReportLinks (role="admin", used by LessonDrawer.tsx:65) stays byte-identical.

R6 Order: the label change lands in the SAME PR that rewrites e2e journey-2-report.spec.ts:21-26, because it clicks ar.reports.formTitle today.

R7 Tests:
- Rewrite LessonReportLinks.test.tsx:23-27 (teacher).
- Add these cases:
  - a group gives two named links to /teacher/report/l-1, labelled write / resume / edit / view per student
  - a sent report is still listed
  - nothing shows before the start or on a cancelled lesson
- LessonReportLinks.clock.test.tsx:22: a single student reads reports.open, not formTitle.

Known effect, not a bug: the first open of /teacher/report/$lessonId creates drafts for every student (reports.service.ts:37), so a group then reads «أكمل التقرير» per student until each one is submitted.

Inline report CONTENT and recordings live in the student file rows (this PR), not in the drawer.

## Critic corrections folded in

1. FOLDER CAP (CI blocker the mappers missed): features/reporting/report-page has 11 code files and no allow-list entry in refactor/folder-cap/web.json. folder-cap.mjs:10,44 fails above 12, and ci.yml:230 runs it --strict. Mapper 2's ReportLines.tsx + LessonReportView.tsx would make 13. Add only LessonReportView.tsx there, and give ReportPageBody an optional `head` prop instead of extracting ReportLines.
2. LessonReportLinks is NOT this PR's file. Mapper 3 planned edits to LessonReportLinks.tsx and its two tests here. But LessonReportLinks.test.tsx:46-81 holds web-today's PendingReports tests, journey-2-report.spec.ts:26 clicks formTitle until web-today rewrites it (docs/48:573), and docs/48:207-210 has web-today replace the card's report control. So this PR touches none of LessonReportLinks.tsx, LessonReportLinks.test.tsx or LessonReportLinks.clock.test.tsx; the per-student rule goes to web-today as drawer_rule.
3. Computed premise (3) is false. The teacher drawer card does NOT list every student's report: it shows ONE generic «تقرير الحلقة» link (LessonReportLinks.tsx:22,28). The rule is an addition for web-today, not a keep.
4. Mapper 1's risk «render PdfAction in each expanded lesson» is unnecessary. The inline view reuses ReportPageFiles, which shows the PDF signed link, and PdfAction's retry belongs to the admin by its own doc (PdfAction.tsx:8-10), so the teacher loses nothing.
5. Test-fixture boundary: module-boundaries lint covers tests too (lint.blocks.mjs:18-23, files src/**/*.{ts,tsx}). A teacher-board test cannot deep-import report-page/page.fixture.ts. Test LessonReportView inside report-page with its local fixture, and stub it in LessonDisclosure.test via vi.mock of the report-page barrel.
6. StudentReportsBody's barrel export (reports/index.ts:19) must STAY in this PR. StudentDrawer.tsx:5,46 still imports it until web-students deletes the drawer. Whichever of this PR and web-students lands LAST removes it (knip). The StudentRecordings barrel export (people/students/index.ts:41), however, goes in this PR: its only barrel consumer is TeacherStudentFile, and StudentProfilePage.tsx:29 imports the deep path.
7. The 404 edge in by-report needs a quiet error. The reader check uses the REPORT's teacher_id, not the lesson's (report-page.repo.ts:42-45), so a row whose report was filed under another teacher id answers 404. The inline view shows a muted error line, not a page alert.
8. Citation fixes: the guard.mjs loop is at :24-27, not :22-25. Mapper 1's suppression line numbers drift, so cite entries by key. The line numbers in my own concatenated cat outputs were converted to per-file lines in this report.
9. The 'view' state loses RowWindow's family «sending» line, because view now opens inline instead of linking (RowWindow, WindowLines.tsx:49-63). It is a minutes-long state after the window closes. Accepted, and stated so nobody re-adds the link.
10. Scope note: this PR delivers the web half of docs/47 PR2 (nav item, redirect, deletions) and also removes the file's «التقارير» tab, so docs/47:366 changes from ?tab=reports to no tab. The paused-students list (docs/47 owner call 5) is NOT part of this ask.
