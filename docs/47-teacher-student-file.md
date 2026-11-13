# 47 — Teacher student file (reports inside each student)

Owner 2026-11-13: «remove the reports screen and put it inside each student» + «the teacher must know the start date of the course and the end date, if the student/teacher was absent, the cancellation reason or reschedule reason for the lesson; list the reports for each lesson».

Spec from the read-only design workflow wf_e8830fc5-aea (8 readers, 3 designs, judge, 4 attack lenses, gaps folded). Checked against origin/develop 8537d7286.

## Owner calls (defaults applied 2026-11-13; the owner may override)

1. Course end: show lessons left («تنتهي بعد n حلقات») plus the date when the last lesson is booked. No estimated date for now.
2. Remove the «التقارير» screen: YES (the owner asked for it directly). This is PR 2; the mobile tab becomes «الطلاب».
3. Cancellation reasons: keep the split, so the teacher sees one-lesson reasons and no series-end or course-stop text. Also hide that text on the schedule lesson sheet.
4. Move reason: OPTIONAL.
5. Paused students: YES, a third list «موقوفون مؤقتًا» on «الطلاب» (PR 2).

## Summary

Corrected spec after checking all 28 raised gaps against origin/develop 8537d7286 in the wtp checkout. Nothing was edited or run. 23 gaps were real and are folded in; gaps 6 and 13 are the same finding. Gap 12 was mostly false and is dropped to a risk. Gap 15 was real and is fixed with a stricter guard. The per-gap verdicts are the last entry of `decisions`.

**Base design (unchanged):** Design 1, with the per-student head endpoint and «ملف الطالب» drawer link from Design 2, and live per-row report state from Design 3.

**What changed after the gap check**

- **Cancellation reasons.** With the default settings, a family's apology typed by staff is stored as cancelled_by_admin. Hiding admin text therefore defeated the owner's ask. The teacher now sees the reason of every one-lesson cancellation. She does not see text on lessons closed by a series end or a course stop, which can mention money. Those are found because the lesson's day is on or after its rule's ends_on, read in the rule's zone.
- **Upcoming lessons.** The log is past-only, so the head endpoint now also returns her next 14 days of lessons with the student, cancelled and moved ones included with their reasons.
- **Course pick.**
  - A paid renewal no longer hides the running course: the pick is the oldest package that is not cancelled and has lessons left.
  - A stopped course shows «توقفت الدورة يوم …».
  - The pick reads its own small query. SalesRosterRepo's pinned select is not touched.
- **Move reason.** A move reason crosses to the new lesson only when both lessons belong to the same teacher.
- **Recordings.** The separate «التسجيلات» tab is gone. Recordings sit under the history in «التقارير», so the #recording-<id> anchor already exists when the link is followed.
- **Guard.** It is now isHers OR a lesson of hers with this student in the last 90 days that was not moved or cancelled.
- **Mobile pending reports.** The «اليوم» banner opens a small pending list at /teacher/reports/pending instead of only the oldest form.
- **ReportFormScreen.** The planned change is dropped. Its fallback, /teacher/reports, stays a valid root.
- **Lint, route, area and knip upkeep** for PR 1 now ships in PR 1.

**Data:** no migration and no RLS change. Teachers never get money fields.

**Delivery**
- PR 1 is the relayed ask and removes nothing.
- PR 2 removes the reports screen (owner question 2), adds a paused-students list (owner question 5) and merges after PR #711.

Tests run in CI only.

## Decisions

- Base design: Design 1 (smallest diff, safest mobile navigation), with grafts:
  - from Design 2: the head endpoint and the «ملف الطالب» link in the board drawer;
  - from Design 3: privacy-first reasons and the live write/edit/view state per lesson row, reusing RowWindow.
  The scoreboard is unchanged (D1 29, D3 28, D2 27).
- Two PRs.
  - PR 1, the relayed ask: course dates, per-lesson outcome, cancellation and move reasons, per-lesson reports and the next 14 days. It also carries its own lint, route, area and knip upkeep. It removes nothing.
  - PR 2: remove the «التقارير» screen (owner question 2), add the paused list (owner question 5) and the mobile pending list. Rebase it on PR #711.
- Ownership guard, in a new TeacherStudentAccess(TeacherMeRepo, StudentAttendanceRepo), used by both the file endpoints and the log:
  - isHers(me): TeacherMeRepo.students, i.e. assigned or on her active rules (teacher-attendance.service.ts:16-17);
  - OR repo.taughtBy({teacherId, studentId, since: now - 90 days}): one of her lessons with this student, with status in TAUGHT = ['scheduled','confirmed','completed','late','no_show'].
  - Otherwise 404 student_not_found.
  We do not use teacher_has_student, which also counts lessons moved away from her or cancelled (gap 15). Lessons stay limited to teacher_id = hers (repo L56).
- The lessons list is the docs/46 C5 month log (GET /teachers/me/students/:id/attendance), extended with additive fields only:
  - It stays past-only (attendanceWindow, mapper L28-35), so totals, the board drawer and old bundles are unchanged.
  - Upcoming lessons come from the head endpoint's new `upcoming` (next 14 days, the board window of docs/46 C7). They include cancelled and moved rows with reasons. Their kind is null, so the chip shows the lesson status, never «لم يُسجَّل».
- Who cancelled needs no new keys. The web uses AttendanceStatus and the mobile uses rowChip.
  - An excused row reads «اعتذر» (the kind chip, sales.student.kind.excused). It never reads «اعتذر مسبقًا».
  - A cancelled row reads the academy's status text, via useLessonStatusText (web) and the configurable status label on mobile: «ألغاها المعلم/ة» or «ألغتها الإدارة».
  - 'Teacher absent' means cancelled_by_teacher. 'Student absent' means no_show, attendance absent, or excused.
- Cancellation reasons, one lookup per reader (replaces REASON_OF, mapper L19-22).
  - Staff see the reason on cancelled_by_teacher, cancelled_by_admin and excused.
  - The teacher sees the same set except series-end text:
    `reason === COURSE_PAUSE_REASON || !seriesEnded(l)`, where
    `seriesEnded(l) = l.rule?.ends_on != null && zonedPartsIn(new Date(l.starts_at), l.rule.tz).date >= l.rule.ends_on`.
  - Why this test works:
    - endRule sets ends_on = from - 1 and cancels from the start of `from` (lesson-cancel.service.ts:87-96).
    - stop_course sets ends_on to the stop day and cancels from v_at (stop_owed_amount.sql:104-111).
    - So both are always caught. These are the only bulk cancel writers with free text. A one-lesson cancel is audited on 'lessons', a series on 'schedule_rules'.
  - Known false positive: a single cancel on or after the rule's last day loses its reason (hidden, never leaked). lessons.local_date is not used because it is frozen at insert (migration 174).
- Move reason, with no migration. The one-lesson move takes an optional `reason`. It is written as `cancel_reason` on the OLD row as that row becomes 'rescheduled', through a conditional spread (LessonChange.cancel_reason is optional, scheduling/change-set.ts:12). On approval, a teacher's proposal note becomes the reason.
  
  These moves carry no reason:
  - Series moves (rule scope) and «تغيير أيام الحلقات». Their old rows read «تغيّر موعدها» with NO new time, and their new lessons look like ordinary ones, because rule-plan.ts:89 and course-change.payload.ts write rescheduled_from_id = null.
  - The trial «موعد تجريبي جديد» move. It shows old and new time, linked by rescheduled_from_id (trial-date.plan.ts:61-62).
  - Every move made before this ships.
- Move lines per row:
  - moved_to = start of the lesson this one moved to;
  - moved_from = start of the lesson it replaced, else time_edit_was.starts_at;
  - move_reason = this row's cancel_reason when status is 'rescheduled'. On a replacement row it is the old row's cancel_reason, but only when the old row's teacher_id equals this row's teacher_id. A reason written on another teacher's lesson never crosses over (gap 14).
  The time-edit reason (lessons.time_edit_reason) stays admin-only, as at lessons.mapper.ts:116.
- Course pick for the teacher: a NEW pure teacherCourseOf(newestFirst, balances). It does not use currentPackage or packageSummaries.
  - live = rows passing countsForMoney (an unused cancel is out; a stopped package stays in).
  - running = the oldest row of live that is NOT cancelled and has balance.remaining > 0. This is the package v_subscription_balance consumes FIFO. A stopped package is never 'running', because its remaining stays > 0 after a stop (lessons_total - used).
  - pick = running ?? live[0] ?? null.
  - Output whitelist: {starts_on, stopped_at (cancelled_at when cancel_kind = 'stopped', else null), ended_at, projected_end_at, lessons_total, lessons_used, lessons_remaining: max(0, …)}.
  - Never output id, status, cancel_kind, cancel_reason, renews_on or any money.
- End line, an ordered lookup in courseEndOf:
  1. stopped_at → «توقفت الدورة يوم …»
  2. ended_at → «انتهت الدورة يوم …»
  3. projected_end_at → «النهاية المتوقعة …»
  4. lessons_remaining > 0 → «تنتهي بعد n حلقات»
  5. otherwise «unknown».
  starts_on is a calendar date, shown with no zone shift. Instants are shown in the viewer's zone. A hint says the count covers lessons with every teacher. The word is «الدورة», never «الباقة».
- Per-row report state, teacher reader only. Rows gain `report {status, submitted_at, sent_at, can_edit, edit_until}`, built by canEditReport/editUntil with the ReportsSettings minutes (export ReportsSettings from reports.module.ts:84-91).
  - The web reuses RowWindow (send/WindowLines.tsx:50; its WindowReport type is status/can_edit/edit_until/sent_at): «تعديل التقرير», then «عرض التقرير».
  - A started, reportable row with no sent report gets «اكتب التقرير».
  - Cancelled, moved and future rows get none.
- Head endpoint: GET /teachers/me/students/:id → {id, code, name, status, course, upcoming}, in TeacherAttendanceController (self.teacher).
  - There is no route clash: TeacherStudentsController owns only GET '' (L21).
  - GET /teachers/me is not changed (docs/46 §3).
  - Constructors stay at 3 (limit 4):
    - TeacherAttendanceService(access, repo, settings);
    - TeacherStudentHeadService(access, repo, roster), with roster used only for SalesRosterRepo.balances.
- Web home for the file is /teacher/students/$studentId (students.tsx is renamed to students.index.tsx). The tabs are bound to ?tab: «الحلقات» (default: upcoming, then the month log) and «التقارير» (StudentReportsBody, then StudentRecordings). There is NO separate recordings tab, so RecordingLink's #recording-<id> anchor is already rendered when the link is followed (gap 8). SectionShells.tsx is not edited.
- Mobile home for the file is the existing /teacher/reports/student/[id].
  - PR 2 retitles the reports tab «الطلاب» (icon 'students') and points its index at TeacherStudentsScreen. Every /teacher/reports/** href stays valid. The tab must not be hidden: Tabs.Protected would kill pushes into the folder.
  - The mobile file is a NEW TeacherStudentFileScreen, with pills «الحلقات» (upcoming + month log) and «التقارير» (extracted ReportsPane).
  - StudentReportsScreen (150/150) becomes admin-only.
  - StudentLessonsPanel, BoardLessonRow and TeacherAttendanceScreen are deleted.
- Lost or kept capabilities, stated honestly.
  
  Kept:
  - Pending reports: the web home banner (TeacherDashboard.tsx:64); a per-student pending block in each file; log rows in any month; in PR 2, a mobile pending list (/teacher/reports/pending) opened from the «اليوم» banner.
  - The edit window: SentPanel, the log row and today's card.
  - View after the window: the log row.
  - Grade chart, history, recordings and the trial note.
  
  Dropped (owner question 2):
  - The cross-student «تقارير مُرسلة» list.
  - With it, her reports for students who are no longer hers: not assigned and no lesson of hers in 90 days. The admin keeps them. Reopening them would contradict migration 165's «no access forever» intent and would show other teachers' reports.
  - Mobile loses the per-lesson «حضورك مؤكَّد» line for upcoming lessons in the file; it stays on «اليوم» and «جدولي».
- Keep GET /teachers/me/reports until the PR 2 OTA reaches devices. Then delete it in a follow-up, together with its entry in teacher-isolation.spec.ts:80-85.
- Docs to update:
  - docs/46 C5: the teacher sees one-lesson cancel reasons (her own, the family's, the academy's), the pause, the move reason and old/new time. Series-end and stop text stays hidden.
  - docs/46 C1/C7: the file replaces the drawer and «سجل الحضور» as the main per-student view.
  - docs/46 D4: the paused list, if owner question 5 says yes.
  - docs/03 R-MOB-02:125: the teacher tabs.
  - docs/03 R-TCH-03:87: no reports screen.
- GAP VERDICTS:
  1. Mobile pending list: kept. Pending route plus banner push (PR 2).
  2. Admin cancel holds the family's reason: kept. The teacher sees all one-lesson reasons.
  3. Paused students unreachable: kept, as owner question 5. Default: a third «موقوفون مؤقتًا» list in PR 2.
  4. Former students' reports: real, but declared as a drop in owner question 2. No access widening.
  5. Series moves unlinked: kept. The false 'old and new time' sentence is corrected.
  6/13. Trial new-date has no reason: kept once. Listed among reason-less moves.
  7. Future rows missing: kept. `upcoming` added to the head.
  8. Recording anchor in a lazy tab: kept. The recordings tab is dropped.
  9. Reason privacy by status: modified. The test is series-end versus one-lesson, not the author's audit row.
  10. Stopped course drops out: kept. stopped_at plus the new pick.
  11. Renewal overlap: kept. FIFO-current pick.
  12. Absence labels: dropped. Excused reads «اعتذر»; status labels are academy-configurable. Recorded as a risk.
  14. Move reason across a teacher change: kept. teacher_id check.
  15. taught() counts moved/cancelled lessons: kept. Own TAUGHT status filter.
  16. API fakes: kept.
  17. Mobile teacher-mode tests: kept.
  18. Repo select pin: kept.
  19. usePathname mocks: moot. The ReportFormScreen change is dropped.
  20. e2e areas: kept.
  21. e2e note strict mode: kept.
  22. PR 1 housekeeping: kept, moved to PR 1.
  23. RecordingsButton deep import: kept.
  24. knip barrels: kept.
  25. MoveFields 142 lines: kept. MoveReason.tsx.
  26. Mobile submit invalidation: kept. Head key under /teachers/me/students.
  27. teacher-isolation e2e follow-up: kept.
  28. notification-route at 150 lines: kept. Comment rewritten in place.

## Data and API

- packages/shared/src/sales/student/student-attendance.ts:
  - AttendanceTableRow gets OPTIONAL `moved_from?`, `moved_to?` and `move_reason?: string | null`, and `report?: {status: 'draft'|'submitted'; submitted_at: string|null; sent_at: string|null; can_edit: boolean; edit_until: string|null} | null` (teacher reader only).
  - cancel_reason keeps its meaning (cancel statuses only).
- packages/client-core/src/teaching/lessons/attendance-table-schema.ts L10-24 rowSchema:
  - `moved_from/moved_to/move_reason: z.string().nullish()`;
  - `report: z.object({status: z.enum(REPORT_STATUSES), submitted_at, sent_at, can_edit: z.boolean(), edit_until}).nullish()`.
  It stays z.object, and `mine` (L40) is unchanged. Old bundles strip the new keys, and an old API still parses.
- apps/api/src/modules/sales/sales-students/attendance/student-attendance.repo.ts:
  - LESSON_SELECT (L35-36) adds `teacher_id, time_edit_was, moved_from:rescheduled_from_id(starts_at, cancel_reason, teacher_id), moved_to:lessons!rescheduled_from_id(starts_at)`. The rule embed becomes `rule:schedule_rules!lessons_rule_id_fkey(package, ends_on, tz)`. These are self-FK embeds, the same pattern as lesson-row.ts:7.
  - AttendanceLessonRow (L7-20) gains these fields.
  - reports() (L81-91) selects `id, lesson_id, submitted_at, sent_at` and stays submitted-only.
  - NEW `student(id)` → {id, code, name, status} | null.
  - NEW `taughtBy({teacherId, studentId, since})`: lessons with own:lesson_students!inner, teacher_id = hers, status in TAUGHT, starts_at >= since, limit 1 → boolean.
  - NEW `packages(studentId)`: subscriptions select 'id, starts_on, created_at, status, cancel_kind, cancelled_at, lessons_total', .or(COUNTS_FOR_MONEY), ordered starts_on desc, created_at desc, id desc. No price column.
  - The file stays under 150 lines; split a packages repo out if it does not.
- NEW apps/api/src/modules/sales/sales-students/attendance/lesson-row-notes.ts (pure):
  - `reasonShown: Record<'staff'|'teacher', (l) => boolean>`:
    - staff: status ∈ {cancelled_by_teacher, cancelled_by_admin, excused};
    - teacher: the same AND (cancel_reason === COURSE_PAUSE_REASON || !seriesEnded(l)).
  - `seriesEnded(l)` as written in decisions.
  - `moveOf(l)`:
    - moved_from = l.moved_from?.starts_at ?? wasStart(l.time_edit_was) (zod safeParse as lessons.mapper.ts:109);
    - moved_to = l.moved_to[0]?.starts_at ?? null;
    - move_reason = status 'rescheduled' ? l.cancel_reason : (l.moved_from?.teacher_id === l.teacher_id ? l.moved_from.cancel_reason : null).
    - All instants are ISO.
- apps/api/src/modules/sales/sales-students/attendance/student-attendance.mapper.ts:
  - REASON_OF is replaced by reasonShown, and rowOf spreads moveOf(l).
  - Export rowOf.
  - TableInput gets `minutes?: number`. For the 'teacher' reader, `report` comes from NEW teacher-row-report.ts `rowReport(report, {now, minutes})` (canEditReport role teacher / editUntil).
  - NEW `upcomingRows(lessons)`: rowOf with reader 'teacher', no report, kind: null, sorted ascending.
- NEW apps/api/src/modules/sales/sales-students/attendance/teacher-student-access.ts: @Injectable TeacherStudentAccess(TeacherMeRepo, StudentAttendanceRepo).
  - `owner(profileId, studentId, now)`: me.me() → 404 teacher_not_linked.
  - Then `isHers(me, id) || await repo.taughtBy({teacherId: me.id, studentId, since: now - 90d})`, else 404 student_not_found.
  - Returns {id, tz}.
- apps/api/src/modules/sales/sales-students/attendance/teacher-attendance.service.ts:
  - Constructor (TeacherStudentAccess, StudentAttendanceRepo, ReportsSettings).
  - table() uses access.owner and passes `minutes: (await settings.read()).report_teacher_edit_minutes`.
  - The private teacher() and isHers move into access.
- NEW apps/api/src/modules/sales/sales-students/attendance/teacher-student-head.service.ts: constructor (TeacherStudentAccess, StudentAttendanceRepo, SalesRosterRepo).
  - head({profileId, studentId}, now): access.owner, then Promise.all [repo.student(id), repo.packages(id), repo.lessons(id, {from: now, to: now + 14d, teacherId})].
  - Then roster.balances(package ids), unchanged, with no select edit.
  - Then teacherCourseOf, then toTeacherCourse.
  - Returns {id, code, name, status, course, upcoming: upcomingRows(lessons)}.
- NEW apps/api/src/modules/sales/sales-students/attendance/teacher-course.ts (pure):
  - teacherCourseOf(newestFirst, balances): the pick in decisions.
  - toTeacherCourse(pick, balance): TeacherCourseView | null, with exact keys {starts_on, stopped_at, ended_at, projected_end_at, lessons_total, lessons_used, lessons_remaining: Math.max(0, remaining)}.
  - Import countsForMoney and isCancelled from where currentPackage comes from (@ab/shared).
- apps/api/src/modules/sales/sales-students/attendance/teacher-attendance.controller.ts: add `@Get(':id') head(@ZodParam('id', z.uuid()) id, @CurrentUser() user)`. It inherits @Permissions('self.teacher') (L17).
  apps/api/src/modules/sales/sales-students/sales-students.module.ts L32-34: add the TeacherStudentAccess and TeacherStudentHeadService providers.
  apps/api/src/modules/reporting/reports/reports.module.ts L84-91: export ReportsSettings.
- NEW packages/shared/src/sales/student/teacher-course.ts:
  - types TeacherCourseView and TeacherStudentHead {id, code, name, status: StudentStatus, course: TeacherCourseView|null, upcoming: AttendanceTableRow[]};
  - pure `courseEndOf(course)` → {key: 'stopped'|'ended'|'expected'|'after'|'unknown', at?, n?}, an ordered [test, build] lookup.
  Export from the barrel.
- NEW packages/client-core/src/teaching/lessons/teacher-student-head-schema.ts: `teacherStudentHeadSchema satisfies z.ZodType<TeacherStudentHead>` (upcoming: z.array(rowSchema)).
  teacher-actions.ts: `teacherLessonPaths.student(id)` → `/teachers/me/students/${id}`.
- NEW pure packages/client-core/src/teaching/reports/log-report-action.ts: `logReportAction(row, now)` → 'edit' | 'view' | 'write' | null.
  - row.report present → editableNow (send-lines.ts:51) ? 'edit' : 'view';
  - else reportBlock({lessonStatus, lessonStartsAt, now}) === null → 'write';
  - else null.
- Move reason in the schemas:
  - packages/schedule/src/schemas/scheduling.ts L52-58, scope 'one' only: `reason: z.string().trim().min(1).max(500).optional()`.
  - packages/shared/src/sales/student/student-details.ts:75: `salesRescheduleSchema = z.strictObject({ startsAt: instant, reason: <same> })`.
- apps/api/src/modules/teaching/lessons/reschedule/reschedule-one.service.ts:
  - L69 old-row change becomes `{ id: old.id, from_status: old.status, to_status: 'rescheduled', chargeable: false, ...(body.reason ? { cancel_reason: body.reason } : {}) }`.
  - L78 audit `after` adds `reason: body.reason ?? null`.
- Callers that forward the reason:
  - apps/api/src/modules/teaching/lessons/proposals/lesson-proposals.service.ts L61-65: approve adds `...(proposal.note ? { reason: proposal.note } : {})`.
  - apps/api/src/modules/sales/sales-students/lessons/sales-lesson-actions.service.ts L67: forward `reason: body.reason` in the 'one' body.
  - The trial new-date (trial-date.plan.ts) gets nothing (owner question 4).
- Unchanged: no migration, no new table, no RLS change.
  - Every read uses the service role behind self.teacher + TeacherStudentAccess.
  - SalesRosterRepo's PACKAGE_SELECT is untouched (sales-roster.repo.test.ts:25 pins it).
  - Families never see the move reason: portal views exclude cancel_reason (portal-scope.migration.test.ts:11).
- Follow-ups:
  - After the PR 2 OTA: delete GET /teachers/me/reports (report-entry.controller.ts:51, reports/teacher/teacher-reports.{service,mapper,queries}.ts and tests, plus packages/shared/src/reports/teacher-{views,list}.ts if knip shows them unused). Drop '/teachers/me/reports' from teacher-isolation.spec.ts:80-85 in the same PR.
  - Owner question 3: apply reasonShown.teacher to lessons.mapper.ts:80 so the schedule sheet hides series-end text too.

## Web

- PR1 apps/web/src/routes/teacher/students.tsx → rename to students.index.tsx with `createFileRoute('/teacher/students/')`. The URL is unchanged.
- PR1 NEW apps/web/src/routes/teacher/students.$studentId.tsx: `validateSearch: z.object({ tab: z.enum(['lessons','reports']).catch('lessons') })`, rendering <TeacherStudentFile studentId tab/>.
- PR1 NEW apps/web/src/features/teaching/teacher-students/file/TeacherStudentFile.tsx (~70 lines):
  - Data: teacherStudentHeadQuery. A 403 or 404 shows <FormAlert>{t.common.forbidden}</FormAlert>.
  - PageHead: Cartouche(t.teacherFile.title), then name, code and the studentStatus chip.
  - Then <TrialChatNote status/>, <CourseLine course/>, <PendingReports tz studentId/>.
  - Then Tabs (t.teacherFile.tabs) with the panel lookup:
    - lessons: <UpcomingLessons rows={head.upcoming}/> + <AttendanceLog/>;
    - reports: <StudentReportsBody role='teacher'/> + <StudentRecordings role='teacher'/>.
  - Changing tab calls navigate({ search: { tab } }). tz = teacherMeQuery.tz ?? useViewerTz().
- PR1 NEW file/CourseLine.tsx: one <dl> that wraps at 390 px, holding start (LTR date), the end (courseEndOf key → t.teacherFile.*) and «الحلقات x من y». Then the ink-3 hint t.teacherFile.courseHint. course null → t.teacherFile.noCourse.
  PR1 NEW file/UpcomingLessons.tsx: a stacked DataTable with attendanceColumns; empty text t.teacherFile.noUpcoming.
  PR1 NEW file/api.ts: teacherStudentHeadQuery(id), key `[...LESSONS_KEY, 'teacher-student', id]`, so a report submit or a cancel refreshes the counts (use-report-entry.ts:49).
- PR1 apps/web/src/features/teaching/teacher-board/attendance/attendance-columns.tsx L31-38: the report cell becomes NEW LogReportCell.tsx, a lookup on logReportAction(row, now):
  - edit/view → <RowWindow report={row.report} href={reportFormHref(...)}/>;
  - write → <ReportLink>{t.teacherBoard.writeReport}</ReportLink>;
  - null → «—».
- PR1 apps/web/src/features/teaching/teacher-board/attendance/attendance-text.ts L33-39: rowNote(row, clock) keeps the tags and the cancelReason line. It adds movedTo, movedFrom (lessonWhenAt(clock)) and moveReason as [test, text] lookups. The caller at attendance-columns.tsx:18 passes the clock.
- PR1 small web edits:
  - apps/web/src/features/reporting/reports/history/PendingReports.tsx L14: props `{ tz; studentId? }` plus a one-line filter by student.id. The home banner is unchanged.
  - apps/web/src/features/teaching/teacher-students/columns.tsx:37: the name links to '/teacher/students/$studentId'.
  - apps/web/src/features/teaching/teacher-board/drawer/StudentDrawer.tsx L46-47: a «ملف الطالب» Link (t.teacherBoard.openFile) above the Tabs.
  - apps/web/src/features/reporting/reports/paths.ts L13: the teacher path becomes `/teacher/students/${studentId}?tab=reports`.
- PR1 apps/web/src/features/reporting/reports/history/RecordingLink.tsx:20: the teacher link goes to to='/teacher/students/$studentId' search={{ tab: 'reports' }} hash=`recording-${lessonId}`. The recordings list renders in the same pane, so the anchor exists.
- PR1 apps/web/src/routes/teacher/reports.$studentId.tsx: replace the body with `beforeLoad: ({ params, location }) => { throw redirect({ to: '/teacher/students/$studentId', params, search: { tab: 'reports' }, hash: location.hash }) }` (pattern routes/admin/communications.tsx:10).
- PR1 move reason on web:
  - apps/web/src/features/teaching/schedule/reschedule/RescheduleForm.tsx + reschedule.ts L40-42: an optional textarea (t.reschedule.reason, hint t.reschedule.reasonHint) for scope 'one'; rescheduleBody adds `...(i.reason ? { reason: i.reason } : {})`.
  - The same field goes in apps/web/src/features/sales/sales/schedule/move/SalesRescheduleForm.tsx + sales-move-api.ts.
  - Split into a ReasonField.tsx if either form passes 150 lines.
- PR1 housekeeping (CI fails without it):
  - Rename the `src/routes/teacher/students.tsx` keys in apps/web/eslint-suppressions.json:11878 and oxlint-suppressions.json:11848 to students.index.tsx.
  - Prune the 4 now-unused module-boundaries entries of reports.$studentId.tsx (eslint :11865, oxlint :11835) with the repo's prune script, run in the cloud routine.
  - Regenerate apps/web/src/routeTree.gen.ts.
  - e2e/areas.json:303: replace routes/teacher/students.tsx with students.index.tsx (people area). Add students.$studentId.tsx to the «reports» area paths.
- PR2 apps/web/src/features/teaching/teacher/TeacherNav.tsx L12: remove the /teacher/reports item. Rebased on #711, whose NAV_PAGE never names reports.
  PR2 apps/web/src/routes/teacher/reports.index.tsx: `beforeLoad: () => { throw redirect({ to: '/teacher/students' }) }`.
- PR2, if owner question 5 says yes:
  - packages/shared/src/people/schemas/teacher-students.ts: TEACHER_STUDENT_KINDS adds 'paused', and TEACHER_STUDENT_STATUSES.paused = ['paused']. Churned stays out.
  - apps/web/src/features/teaching/teacher-students/TeacherStudents.tsx: a third tab, and the empty text becomes a Record<TeacherStudentKind, string> lookup.
- PR2 deletions:
  - apps/web/src/features/teaching/teacher/reports/{MyReports,SubmittedReports,submitted-report-columns}.tsx and MyReports.test.tsx;
  - apps/web/src/features/teaching/teacher/{MyStudents,myStudentColumns}.tsx and MyStudents{,.sort}.test.tsx;
  - myReportsQuery, MY_REPORTS_PAGE_SIZE and MY_REPORTS_LIST_KEYS (teacher/api.ts:34-37, SubmittedReports.tsx:20) and their barrel exports.
  KEEP: RowWindow, MyFeedback.tsx, report.$lessonId.tsx, PendingReports and StudentReportsPage.
  Regenerate routeTree.gen.ts and prune the deleted files' suppressions.

## Mobile

- PR1 NEW apps/mobile/src/teacher/student-file/TeacherStudentFileScreen.tsx (< 150 lines):
  - ScreenHeader: title head.name, subtitle code · status, back backWithin('/teacher/reports').
  - Then <TrialChatNote status={head.status}/> and <CourseLine/>.
  - A pending block: usePendingReports filtered by student.id → PendingReportRow.
  - FilterPills (t.teacherFile.tabs): «الحلقات» (default) | «التقارير».
- PR1 NEW apps/mobile/src/teacher/student-file/LogPane.tsx:
  - An «الحلقات القادمة» header section with head.upcoming as AttendanceLogRow rows, not pressable. Empty: t.teacherFile.noUpcoming.
  - Then the month log moved from TeacherAttendanceScreen.tsx L27-52 + L94-100.
  - onOpen = `logReportAction(item, now) ? openRow : undefined`.
  - reportLabel lookup: {edit: t.reports.edit, view: t.reports.view, write: t.teacherBoard.writeReport}.
- PR1 NEW apps/mobile/src/teacher/student-file/ReportsPane.tsx, extracted from StudentReportsScreen.tsx (rowPress L37-41, ReportItem, the pane, RecordingsButton):
  - It imports RecordingsButton through '@/student-file'; add `export { RecordingsButton } from './recordings/RecordingsButton'` to apps/mobile/src/student-file/index.ts.
  - StudentReportsScreen's module-boundaries suppression (eslint-suppressions.json:9749-9752) drops from 2 to 1 (useStudentName stays).
- PR1 NEW apps/mobile/src/teacher/student-file/CourseLine.tsx.
  Add `useTeacherStudentHead(id)` to apps/mobile/src/teacher/board/teacher-board-api.ts, with key `pathKey(teacherLessonPaths.student(id))`.
- PR1 apps/mobile/src/teacher/report/hooks/api.ts L42-47: refreshAfterSubmit adds `client.invalidateQueries({ queryKey: pathKey('/teachers/me/students') })`. The log and the head refresh when she comes back from the form; today the log keeps «اكتب التقرير».
- PR1 apps/mobile/src/teacher/screens/StudentReportsScreen.tsx becomes admin-only:
  - Remove useTeacherMe, the panes and switcher (L47-52, L118, L123-130, L142-147), TrialChatNote (L141) and StudentLessonsPanel.
  - Import ReportsPane.
  - AdminStudentReportsScreen is unchanged.
- PR1 routes:
  - apps/mobile/app/teacher/reports/student/[id].tsx → default export TeacherStudentFileScreen.
  - apps/mobile/app/teacher/reports/student/attendance/[id].tsx → `<Redirect href={`/teacher/reports/student/${id}`}/>`.
- PR1 deletions and knip:
  - Delete apps/mobile/src/teacher/board/{TeacherAttendanceScreen,StudentLessonsPanel,BoardLessonRow}.tsx with their tests, and delete board/index.ts (empty).
  - Remove `TeacherAttendanceScreen` and `StudentReportsScreen` from apps/mobile/src/teacher/index.ts (L7, L14).
  - Remove `ATTENDANCE_STYLE` from apps/mobile/src/sales/sales/index.ts:17; its only barrel importer was BoardLessonRow.
  - knip-gate fails on any new unused export.
- PR1 apps/mobile/src/sales/sales/attendance/attendance-log-text.ts L55-67:
  - Add `moveLines(row, tz, cycle)`: «نُقلت إلى …», «بدلًا من موعد …», «سبب تغيير الموعد: …».
  - AttendanceLogRow.tsx L49-66 renders them under cancelLine and takes an optional `reportLabel?: string`.
  - Additive only; the sales log also gets the move lines.
- PR1 move reason on mobile:
  - NEW apps/mobile/src/teaching/reschedule/MoveReason.tsx (labelled multiline input + hint), shown for scope 'one'.
  - The reason state lives in RescheduleForm.tsx (66 lines) and passes into MoveFields as a value prop. MoveFields.tsx is at 142 lines, so it grows by at most 3.
  - reschedule-body.ts adds `reason`.
  - The same field goes in apps/mobile/src/sales/sales/lesson-actions/SalesRescheduleForm.tsx + lesson-actions-api.ts.
- PR2 apps/mobile/src/teacher/components/TeacherTabs.tsx, on #711's `tabItems(can, chatsOn)`:
  - `{ name: 'reports', title: t.teacherNav.students, icon: 'students' }`.
  - Replace the stale L7-8 comment: the folder keeps its name so every /teacher/reports/** link stays valid; the tab is «الطلاب».
- PR2 tab root and More:
  - apps/mobile/app/teacher/reports/index.tsx → `export { TeacherStudentsScreen as default }`.
  - apps/mobile/app/teacher/more/students.tsx → `<Redirect href="/teacher/reports"/>`.
  - apps/mobile/src/teacher/screens/TeacherMoreScreen.tsx: remove the «الطلاب» row (rebase on #711).
- PR2 pending list:
  - NEW apps/mobile/src/teacher/screens/PendingReportsScreen.tsx (~45 lines): ScreenHeader t.reports.pending with back, then a LazyList of PendingReportRow over usePendingReports, empty text t.reports.noPending, pull to refresh. It is taken from TeacherReportsScreen's pending branch.
  - NEW apps/mobile/app/teacher/reports/pending.tsx. The static segment wins over [lessonId], and it is a stack screen, not a tab.
  - apps/mobile/src/teacher/screens/TeacherTodayScreen.tsx L37: PendingBanner pushes '/teacher/reports/pending'. The count chip stays.
- PR2, if owner question 5 says yes: apps/mobile/src/teacher/screens/TeacherStudentsScreen.tsx gets a third «موقوفون مؤقتًا» pill, and its empty text becomes a lookup (L34).
  No ReportFormScreen change: its fallback '/teacher/reports' now lands on the «الطلاب» tab root, which is valid.
- PR2 deletions:
  - apps/mobile/src/teacher/screens/TeacherReportsScreen.tsx (+ .test, .current.test), its barrel export, and the 'Reports' row of TeacherLoading.test.tsx:16.
  - ReportRows' SubmittedReportRow and StudentHistoryRow if knip shows no other user.
  - KEEP PendingReportRow, ReportHistoryRow and reportFormHref.
  - Prune the deleted files' suppressions.
- PR2 apps/mobile/src/core/push/notification-route.ts (150/150 lines): rewrite «a report → her reports» in place on the same line («a report → her students tab»). The route stays '/teacher/reports'.
- Unchanged on purpose: StudentRow.tsx:31, details-text.ts:127/:134, StudentRecordingsScreen.tsx:47, ReportRows.tsx:15. All JS, shipped by OTA, with no native change.

## Messages and links

- No WhatsApp, CRM, template or short-link change. Teacher messages still target /teacher/report/<id>, /teacher-report/<token>, /report-link/legacy/teacher/report/<id> and /report/<public_id>.
- No new notification or send of any kind (owner rule). Schedule-change notices keep their targets.
- Web in-app links that move:
  - the /teacher/students name → the file;
  - RecordingLink → the file's ?tab=reports#recording-<id>;
  - «سجل التقارير» under each report form → ?tab=reports;
  - the board drawer gains «ملف الطالب».
- Web bell and push (web-path.ts:36,49) are unchanged: teacher student kinds go to /teacher/students.
- Mobile push report_submitted → '/teacher/reports', which is now the «الطلاب» tab. Only admins receive it. The comment is updated on the same line.
- The admin and sales move forms say «يظهر هذا السبب للمعلم في ملف الطالب».

## Redirects

- web /teacher/reports/$studentId → /teacher/students/$studentId?tab=reports, keeping any #recording-<id> hash (PR1)
- web /teacher/reports (with any query) → /teacher/students (PR2)
- web /teacher/students → same URL, served by students.index.tsx
- web /teacher/report/$lessonId → unchanged
- mobile /teacher/reports (tab) → same path, now TeacherStudentsScreen under «الطلاب» (PR2)
- mobile /teacher/reports/pending → NEW pending list, opened from the «اليوم» banner (PR2)
- mobile /teacher/reports/student/:id, /recordings/:id, /teacher/reports/:lessonId, /teacher/today/report/:lessonId → unchanged
- mobile /teacher/reports/student/attendance/:id → <Redirect> to /teacher/reports/student/:id (PR1)
- mobile /teacher/more/students → <Redirect> to /teacher/reports (PR2). This is a stack redirect, so no phantom tab appears.
- API GET /teachers/me/reports → kept until the PR2 OTA rollout, then removed

## i18n (MSA)

- teacherFile.title: ar «ملف الطالب», en "Student file"
- teacherFile.tabs: ar «أقسام ملف الطالب», en "Student file sections". The panes reuse teacherBoard.lessonsTab and teacherBoard.reportsTab.
- teacherFile.upcoming: ar «الحلقات القادمة خلال 14 يومًا», en "Lessons in the next 14 days"
- teacherFile.noUpcoming: ar «لا توجد حلقات خلال الأيام الـ14 القادمة», en "No lessons in the next 14 days"
- teacherFile.courseStart: ar «بداية الدورة: {date}», en "Course start: {date}"
- teacherFile.courseStopped: ar «توقفت الدورة يوم {date}», en "Course stopped on {date}"
- teacherFile.courseEnded: ar «انتهت الدورة يوم {date}», en "Course ended on {date}"
- teacherFile.courseExpected: ar «النهاية المتوقعة للدورة: {date}», en "Expected end: {date}"
- teacherFile.courseEndsAfter (plural via counted()):
  - one: «تنتهي الدورة بعد حلقة واحدة»
  - two: «تنتهي الدورة بعد حلقتين»
  - few: «تنتهي الدورة بعد {n} حلقات»
  - other: «تنتهي الدورة بعد {n} حلقة»
  - en: "Ends after {n} lessons"
- teacherFile.courseEndUnknown: ar «لم يُعرف موعد نهاية الدورة بعد», en "Course end not known yet"
- teacherFile.courseLessons: ar «الحلقات: {used} من {total}», en "Lessons: {used} of {total}"
- teacherFile.courseHint: ar «يشمل العدد حلقات الطالب مع جميع المعلمين», en "The count includes lessons with every teacher"
- teacherFile.noCourse: ar «لا توجد دورة حالية لهذا الطالب», en "No current course for this student"
- teacherBoard.openFile: ar «ملف الطالب», en "Student file"
- VALUE CHANGE teacherStudents.openReports (ar.json:4517): ar «افتح ملف {name}», en "Open {name}'s file"
- sales.student.log.movedTo: ar «نُقلت إلى {when}», en "Moved to {when}"
- sales.student.log.movedFrom: ar «بدلًا من موعد {when}», en "Instead of {when}"
- sales.student.log.moveReason: ar «سبب تغيير الموعد: {reason}», en "Reason for the new time: {reason}"
- reschedule.reason: ar «سبب تغيير الموعد (اختياري)», en "Reason for the new time (optional)"
- reschedule.reasonHint: ar «يظهر هذا السبب للمعلم في ملف الطالب», en "The teacher sees this reason in the student file"
- PR2, if owner question 5 says yes:
  - teacherStudents.paused: ar «موقوفون مؤقتًا», en "Paused"
  - teacherStudents.emptyPaused: ar «لا يوجد طلاب موقوفون مؤقتًا», en "No paused students"
- PR2: teacherNav.students already exists. Remove teacherNav.reports and the list-only keys only if the unused-key check flags them.
- Reused, no new key: reports.pending, reports.pendingCount, reports.noPending, reports.edit, reports.view, teacherBoard.writeReport, sales.student.log.cancelReason, sales.student.kind.*, enums.lessonStatus, common.forbidden, teacherDash.trialChatViaSales
- All Arabic is clear MSA. Every key is mirrored in packages/shared/i18n/en.json.

## Tests

- API student-attendance.mapper.test.ts:
  - Fix the full-row toEqual at :29-32 by adding `moved_from: null, moved_to: null, move_reason: null`.
  - Give the 'moved' fixture (student-attendance.fakes.ts:31) a real reason and assert it as move_reason.
  - Teacher reader:
    - her own, excused and admin one-lesson reasons are shown;
    - an admin or excused reason on a lesson on or after rule.ends_on (series end, stop day) is null;
    - COURSE_PAUSE_REASON is shown even then.
  - Moves:
    - moved old row → moved_to + move_reason;
    - replacement row → moved_from + the old reason only for the same teacher, otherwise move_reason null;
    - time-edited row → moved_from = was.starts_at, and no time_edit_reason anywhere.
  - report.can_edit/edit_until inside and after the window; staff rows have no `report`.
  - upcomingRows: ascending order, kind null.
- API student-attendance.repo.test.ts:
  - :29-31: the new reports() select `id, lesson_id, submitted_at, sent_at`.
  - Add select assertions for the LESSON_SELECT embeds (moved_from with teacher_id, moved_to, the rule's ends_on and tz).
  - Add cases for student(id), taughtBy (status filter, since, teacher_id, limit 1) and packages (COUNTS_FOR_MONEY .or, order, no price column).
- API test harness, apps/api/src/modules/sales/sales-students/sales-students.fakes.ts:80:
  - the attendance fake gains `student`, `taughtBy` and `packages` (vi.fn);
  - resetAttendance (student-attendance.fakes.ts:35) defaults student to {id, code, name, status}, taughtBy to false and packages to [].
  - The roster fake's balances already exists.
- API teacher-attendance.http.test.ts:
  - :38-44 flips to ['سفر', 'إداري']: the admin's one-lesson reason is now shown.
  - Add: an admin series-end reason (rule ends_on before the lesson) → null.
  - Add: a student taught (completed) within 90 days but not hers → 200 with her lessons only.
  - Add: a lesson of hers that was only rescheduled away → 404.
  - Keep :47 (not hers → 404, nothing read) and the 403 cases for other roles.
- API NEW teacher-student-head.http.test.ts:
  - own student → 200 {id, code, name, status, course, upcoming};
  - not hers → 404; unlinked → 404; other roles → 403.
  - No price, currency, amount, paid, unpaid, payment, invoice, renews_on, subscription id, package status, cancel_kind or cancel_reason key (copy teacher-students.http.test.ts:74).
- API NEW teacher-course.test.ts:
  - exact key whitelist;
  - remaining clamped at 0; null without a package;
  - an unused cancel is excluded;
  - the running older package wins over a newer paid renewal;
  - a stopped newest package → stopped_at = cancelled_at;
  - a stopped package with remaining > 0 never wins over a running one;
  - everything used up → the newest package with ended_at.
- API NEW teacher-student-access.test.ts: isHers passes with no repo read; taughtBy passes; neither → 404. API sales-roster.repo.test.ts:25 stays unchanged.
- API move-reason tests:
  - reschedule-one.service.test.ts: with a reason, the old-row change has cancel_reason and audit.after.reason; without one, there is no cancel_reason key.
  - lesson-proposals.service.test.ts: approve forwards the note.
  - The sales-lesson-actions test forwards the reason.
  - Schema tests: scheduling 'one' reason is optional, trimmed, max 500; salesRescheduleSchema accepts reason and still rejects unknown keys.
- shared and client-core:
  - courseEndOf: stopped > ended > expected > after n > unknown.
  - logReportAction table: not started, cancelled or moved → null; no report → write; inside the window → edit; after it → view.
  - The table and head schemas parse with and without the new keys.
- web:
  - NEW TeacherStudentFile.test.tsx:
    - head, chip, trial note, all 5 course cases and noCourse;
    - no money text; ?tab drives the panel; forbidden on 403 and 404;
    - pending filtered to the student; upcoming rows show a cancel reason;
    - in ?tab=reports, «تسجيل الحلقة» targets #recording-<id> and the recordings row is rendered.
  - NEW CourseLine.en.test.tsx.
  - AttendanceLog.test.tsx and attendance-text.test.ts: move lines in the viewer zone; LogReportCell write → /teacher/report/<id>; RowWindow edit → view; «—» on cancelled or moved rows.
  - LessonReportLinks.test.tsx: the PendingReports filter.
  - TeacherBoard.drawer.test.tsx: the «ملف الطالب» link.
  - RescheduleForm/reschedule.test.ts and SalesMoveLesson.test.tsx: the reason is in the body.
- web path pins:
  - TeacherStudents.test.tsx:37 → /teacher/students/s1;
  - paths.test.ts:13 → ?tab=reports;
  - StudentReportsPage.recording.test.tsx:56 → the new URL with tab=reports;
  - a redirect test for reports.$studentId (tab=reports, hash kept).
- web PR2:
  - TeacherNav.test.tsx and TeacherNav.bar.test.tsx (count against #711);
  - SalesNav.permissions.test.tsx:45;
  - delete MyReports.test.tsx and MyStudents{,.sort}.test.tsx;
  - a reports.index redirect test;
  - the TeacherStudents paused tab (if owner question 5 says yes).
- mobile PR1:
  - NEW TeacherStudentFileScreen.test.tsx with .lessons, .reports, .trial and .pending variants:
    - month pills; upcoming rows (not pressable);
    - reason and move lines; an unwritten reportable row opens /teacher/reports/<id>; edit versus view label;
    - the trial note from the head.
  - NEW ReportsPane.test.tsx: PDF opening; her own row opens the form, another teacher's row does not. These cases move from StudentReportsScreen.test.tsx:43-63.
  - NEW CourseLine.test.tsx.
  - A refreshAfterSubmit test: the file row reads «تعديل التقرير» after submit and back.
  - attendance-log-text tests (the sales log stays green); reschedule-body.test.ts with a reason; a MoveReason test.
  - Rewrite StudentReportsScreen.test.tsx as admin-only cases. Remove the teacher-mode cases at StudentReportsScreen.trial.test.tsx:21,27 and keep the admin case.
  - Delete StudentReportsScreen.lessons.test.tsx, TeacherAttendanceScreen.test.tsx and the tests of the deleted board files.
- mobile PR2:
  - routing.teacher.test.tsx:82-88: tab label → t.teacherNav.students; drop the more/students stub at :53.
  - routing.permissions.test.tsx:113,:122.
  - TeacherTodayScreen.test.tsx:63: the banner → '/teacher/reports/pending'.
  - NEW PendingReportsScreen.test.tsx.
  - TeacherMoreScreen tests: no «الطلاب» row.
  - Delete TeacherReportsScreen{,.current}.test.tsx and the TeacherLoading.test.tsx:16 row.
  - No ReportFormScreen mock changes; the four expo-router mocks stay as they are.
- e2e:
  - teacher-isolation.spec.ts:118 → /teacher/students/<hiba> still shows ar.common.forbidden.
  - trial-no-teacher-chat.spec.ts:49,51 → /teacher/students/<id>. Scope :50 as `teacher.getByRole('note').filter({ hasText: ar.teacherDash.trialChatViaSales })`, because AttendanceLog.tsx:44 adds a second role=note.
  - NEW e2e/tests/reporting/teacher-student-file.spec.ts:
    - course start and end; an excused lesson with its reason;
    - an admin-moved lesson with the old time and the reason;
    - «اكتب التقرير» → submit → «تعديل التقرير».
    - Add it to the «reports» area specs in e2e/areas.json; guard.mjs:15-17 fails otherwise.
- CI only (owner rule): `pnpm turbo lint typecheck test` + e2e on GitHub Actions.

## Risks

- PR #711 (OPEN, feat/teacher-page-switches):
  - It touches TeacherNav{,.test,.bar.test}.tsx, TeacherTabs.tsx, TeacherMoreScreen{,.test,.meetings.test}.tsx, TeacherDashboard.tsx, the teacher barrels and ar/en.json.
  - It does NOT touch SectionShells.tsx, and it never gates reports or students.
  - PR 1 shares only ar/en.json with it. Merge #711 before PR 2.
- Course end is often «تنتهي بعد n حلقات», not a date. Lessons are generated only booking_horizon_weeks ahead, so projected_end_at is null for long packages (owner question 1).
- Lesson counts belong to the student across every teacher (v_subscription_balance); the hint line is required.
  The new pick (oldest running package) can differ from the report form's is_last package during a renewal overlap. That is on purpose: the teacher sees the course being taught.
- Series-end detection relies on rule.ends_on:
  - A single cancel on or after a rule's last day loses its reason. It is hidden, never leaked.
  - A cancelled lesson with no rule (instant or makeup) always shows its reason. Neither endRule nor stop_course cancels rule-less lessons today.
  - A future bulk-cancel path that does not end the rule would leak its text. Any new bulk cancel must end the rule or bypass cancel_reason.
- The schedule sheet already sends teachers every raw cancel_reason (lessons.mapper.ts:80; LessonDetails.tsx:101, DetailsAbout.tsx:32-34), including course-stop text. Until the owner question 3 follow-up applies reasonShown.teacher there, the file and the sheet differ.
- The move reason lives in cancel_reason on the 'rescheduled' old row. Every reader checked keys off status or a generic «السبب» label, and families never get it. A future reader must not treat a non-null cancel_reason as 'cancelled'.
- Series moves, «تغيير أيام الحلقات» and the trial new-date carry no reason. Series moves also show no new time (rescheduled_from_id null).
- Labels (gap 12):
  - A teacher no-show recorded after the end reads «ألغاها المعلم/ة». The academy can reword it through the lesson-status text settings.
  - A precise «غاب المعلم/ة» would need an audit read per row. Not built.
- The guard now counts only lessons of hers that were not moved or cancelled (last 90 days). /teacher/students lists students from any lesson in the last 60 days (teacher-students.repo.ts:42-48), so a row from a lesson moved away opens to «forbidden». The list itself is unchanged; a follow-up can apply the same status filter there.
- PR 2 loses reports of former students: not assigned and no lesson in 90 days. The admin keeps them (owner question 2).
  Until owner question 5 is answered, paused students are reachable on web only through the board or a direct link.
- Pausing a group lesson deletes the student's lesson_students row (course_pause_rpcs 956:66), so that lesson leaves the file. This is existing behaviour.
- OTA skew: the new row fields are nullish and `mine` stays required. GET /teachers/me/reports stays until the PR 2 OTA.
  The mobile folder `reports` now hosts «الطلاب» (commented). The pending route is pushed onto the «الطلاب» tab stack, so that tab may open on it later, as cross-tab pushes do today.
- Size and lint budgets:
  - StudentReportsScreen.tsx is at 150/150, MoveFields.tsx at 142 and notification-route.ts at 150.
  - student-attendance.repo.ts grows by 3 methods; split it if it passes 150 lines.
  - Constructors are capped at 4.
  - Stale suppressions, knip exports, routeTree.gen.ts and e2e/areas.json are fixed in the PR that causes them.
- AttendanceLogRow and attendance-log-text are shared with sales. The changes are additive, but the sales log also gets the move lines.
- Unverified here; builders must check:
  - that apply_lesson_changes v3 writes cancel_reason on a 'rescheduled' change (taken from the judge);
  - whether TanStack keeps `hash` through a beforeLoad redirect;
  - StudentRecordings internals (paging past page 1);
  - knip-gate's exact barrel rules;
  - course_pause_rpcs:155 and whether pause touches rule.ends_on;
  - CancelForm.tsx:35;
  - the shape and size of the web RescheduleForm, SalesRescheduleForm and the mobile SalesRescheduleForm;
  - whether SalesRosterRepo is injectable in SalesStudentsModule;
  - the exact test line numbers.

## Owner questions as raised

- Course end date: for long packages the system often has no booked last lesson yet. Show «تنتهي بعد n حلقات» (lessons left), or an estimated date from the weekly schedule, labelled تقديري? Recommended default: lessons left now; the estimate only if you ask for it.
- Remove the «التقارير» screen (web nav item and mobile tab)? This came from your 2026-11-13 note, not the latest message.
  - What goes: the cross-student «تقارير مُرسلة» list, and with it a teacher's old reports for students who are no longer hers (not assigned, no lesson in 90 days). The admin keeps those.
  - Where pending reports stay: the web home, the top of each student file, and a mobile pending list behind the «اليوم» banner.
  - On mobile the tab becomes «الطلاب».
  Recommended default: YES, as PR 2 right after the student file.
- Cancellation reasons for teachers. By default the teacher sees the reason of every one-lesson cancellation: her own, the family's apology (usually typed by staff as «ألغتها الإدارة»), and the academy's. She does not see text on lessons closed by ending a series or stopping a course, which can mention refunds.
  Today the lesson sheet in her schedule shows even that text.
  Recommended default: keep this split, and hide series-end and stop text on the schedule sheet too (a one-line follow-up).
- Move reason: should «سبب تغيير الموعد» be required when an admin or assistant moves one lesson? Recommended default: OPTIONAL.
  - A teacher's own proposal note is copied in on approval.
  - Series moves, «تغيير أيام الحلقات» and the trial «موعد تجريبي جديد» carry no reason.
  - Series moves also do not show the new time on the old lesson.
- Paused students: docs/46 D4 keeps paused students off the teacher's lists, but after the reports screen goes, their file has no way in. Add a third list «موقوفون مؤقتًا» on «الطلاب» (web and mobile)? Recommended default: YES in PR 2. Students who left (churned) stay off.

