# 34 — Time zones: store UTC, show the viewer's clock

Owner, 2026-10-30: «currently all the teachers are from egypt and most of the students are in the
gulf so there is a difference in timing» · «Store all in utc server time and format it according
to the device region or user region». Builds on CLAUDE.md rule 6 (UTC in the DB, a tz on every
person, never free-text times).

## 1. Rule

| What | Zone |
|---|---|
| Stored instants | UTC (`timestamptz`), unchanged |
| A time on a screen | the **viewer's** zone (§2) |
| A time that belongs to someone else (a family's lesson to a sales assistant or a teacher, a slot offered to a family, a meeting invite) | the viewer's first; when the other person's clock differs **at that instant**, a short second label: «٥:٠٠ م بتوقيتك · ٦:٠٠ م بتوقيت العائلة» |
| A message sent to someone (WhatsApp template, push, email) | the **recipient's** zone (§4, class c) |
| A time picked on a picker | read in the zone the picker states («الأوقات بتوقيتك (القاهرة)»), converted to UTC before saving |
| Academy-wide day rules (a `?from&to` range of days, a payroll month, a daily cut-off, a dedup day, legacy imports) | the academy's zone, Asia/Riyadh, with a one-line comment why |

Zones are IANA ids read through `Intl` (no fixed offsets): Africa/Cairo has summer time (ended
2026-10-29 → 30; Cairo = Riyadh's clock in summer, one hour behind in winter); Asia/Riyadh has
none. The 12/24 h preference stays as it is (`useClock` / `useClockCycle`).

## 2. The viewer's zone

One resolver, `resolveViewerTz({ person, device })` in `@ab/shared` (`time/viewer-zone.ts`):

1. **person** — the signed-in person's own tz from `GET /auth/me` `tz` (`common/auth/me-zone.ts`):
   their `teachers.tz` (all 11 teachers: Africa/Cairo), else their `guardians.tz` (family
   accounts), else `profiles.tz` **unless it is still the column default `Asia/Riyadh`**
   (migration 0002): every staff row carries that default whether or not anyone chose it, and an
   Egyptian sales assistant's device zone must win over it. An admin who picks another zone for a
   user (users form) pins it. A failed read is `null`.
2. **device** — `Intl.DateTimeFormat().resolvedOptions().timeZone`.
3. **academy** — `ACADEMY_TZ` (Asia/Riyadh), only when neither is a valid IANA id.

Each app reads it from one store, `@ab/client-core` `viewerTz()` / `setViewerPersonTz()` /
`subscribeViewerTz()` (the same shape as the clock store), wrapped in one hook per app,
`useViewerTz()`. The app sets the person's tz when `/auth/me` answers and clears it on sign-out.
Helpers for the second label: `otherZoneClock(at, otherTz, { tz: viewer, cycle, locale })` (null
when both zones read the same clock at that instant) and `sameClockAt`.

Words (ar.json `schedule`): `viewerTime` «بتوقيتك», `familyAt` «{time} بتوقيت العائلة»,
`zoneNote` «الأوقات بتوقيتك ({city})»; existing `inCity`, `studentTime`, `teacherTime`,
`booking.tzNote`, `trialDate.familyTime` stay.

## 3. Audit method

`grep -rnE "RIYADH_TZ|Asia/Riyadh|riyadhToday|riyadhWhenText|riyadhTime|REOPEN_TZ"` over non-test
code (fixtures, `*.fakes.ts` and tests excluded) on `origin/develop` @ `b6a9c3a6`. Each use is
classified **(a)** display → viewer zone, **(b)** academy-wide rule → kept with a comment, **(c)**
message to a recipient → recipient's zone. Counts per app are in §4–§6.

## 4. packages/shared, packages/client-core and apps/api

| File | Use | Class | Outcome |
|---|---|---|---|
| shared `time/viewer-zone.ts` (new) | `ACADEMY_TZ` as the last fallback | — | the resolver |
| shared `time/riyadh-day.ts` `riyadhToday` | the academy's day (ranges, cut-offs) | b | kept |
| shared `time/riyadh-day.ts` `riyadhWhenText` | «الاثنين 12 أكتوبر 18:00» on screens | a | takes `words.tz` (viewer), academy when absent |
| shared `messaging/replies/reply-note.ts` | «تم تأكيد حلقة …» under a family reply | a | takes `clock.tz` (viewer), academy when absent |
| shared `messaging/replies/reply-lesson.ts` | which lesson a «نعم» is about (same academy day) | b | kept: one rule for every viewer |
| shared `messaging/chat/thread-reopen.ts` `REOPEN_TZ` | dedup key `reopen:<phone>:<day>` | b | kept (rule 8 dedup day) |
| shared `core/format/running-head.ts` | the running head's Riyadh **and** Cairo clocks, each labelled | b | kept: named cities, not «the» time |
| shared `sales/student/student-attendance.ts` | attendance months | b | kept (academy month) |
| shared `money/assistant/started.ts`, `kind.ts`, `money/ledger/schemas.ts`, `schemas/activity.ts` | commission start, `?from&to` days | b | kept |
| shared `settings/domains/academy.ts` | the academy tz setting's default | b | kept |
| shared `time/time-zone.ts` | the curated zone list | — | kept |
| shared `sales/teacher/teacher-overview.ts` `SalesTeacherSlot` | weekday/time «in Riyadh» | a | adds `at` (the slot's next start, UTC) so clients read it in the viewer's zone; weekday/time kept for old clients |
| client-core `auth/viewer-tz.ts` (new) | the store | — | |
| api `common/auth/auth.module.ts` `GET /auth/me` | no tz | a | adds `tz` (§2) via `MeZoneRepo` |
| api `sales-students/teachers/sales-teacher-overview.mapper.ts` | slot weekday/time read in Riyadh | a | adds `at` |
| api `messaging/reminders/plan/reminders.plan.ts` `confirmationPush` | one push text to every admin | b | kept: one broadcast text, admins' profiles are on the academy default; per-admin text is a follow-up (PushService renders once) |
| api reminders (family / teacher), `booking.messages.ts`, `confirmation-messages.ts`, `report-ready.ts`, `teacher-alert.plan.ts`, `teacher-alert.crm.ts`, `meeting-invite.text.ts` (`inviteeWhen`), `follow-ups.plan.ts`, `rating.send.service.ts` | template / push text | c | already the recipient's tz (guardian, teacher, invitee, lead); verified, unchanged |
| api `report-pdf/render/pdf-text.ts` | the PDF's time line | c | already the guardian's tz with its city |
| api `feedback.request.service.ts`, `alerts.service.ts`, `student-renewal.plan.ts`, `student-expiry.job.ts` | no time of day in the text (names, a package label, local dates in the student's tz) | c | verified, unchanged |
| api `reporting/dashboard/range.ts`, `sales/sales/schedule/sales-schedule.mapper.ts` (`riyadhToday`, day range), `sales-money/sales-start.ts`, `finance/subscriptions/used-before.ts`, `teaching/course-pause/*`, `common/activity/activity.queries.ts`, `finance/assistant-pay/my/my.queries.ts` | `?from&to` / `?date` days, start-date and pause cut-offs, payroll month | b | kept: the API's day parameters are academy days |
| api `reporting/exports/csv.ts`, `exports.rows.ts` | the Excel export's date and time columns | b | kept: one sheet for the owner, in the academy's clock (headers say so) |
| api `platform/google-sync/*` (`TZ`, job 05:00) | Google event tz, the daily sync hour | b | kept: the event is an instant; Google shows it in the calendar owner's zone |
| api `lessons/overview/overview.queries.ts`, `teachers/availability/availability.queries.ts` (`allDayRows(RIYADH_TZ)`) | «always available» rows | b | kept: a whole academy day |
| api `booking/course-change/course-change.planner.ts`, `inbox/threads/thread-lessons.ts`, `people/users/*` | a person's tz with the academy default when missing | — | kept (data default; no tz is written) |

Known limit (b): a screen that pages by **day** asks the API for academy days, so a Cairo viewer's
day list runs 23:00 → 23:00 in winter; times inside it read in the viewer's zone. A lesson between
00:00 and 01:00 Riyadh shows under the next day there. Moving the day parameter to the viewer's
zone is a later API change.

## 5. apps/web

Branch `cloud/review-viewer-tz-web`, base `d56c00b8`. One hook, `useViewerTz()` (`src/lib/viewer-tz.ts`,
`useSyncExternalStore` over the client-core store); `meQuery` sets `setViewerPersonTz(me.tz)` (web `Me`
gains `tz`), no session / `signOut` clears it. Pure helpers that take no zone read client-core
`viewerTz()` (as a default parameter where a function already had one); components pass the hook's
value. Unit tests pin the viewer to Asia/Riyadh in `test-setup.ts` (`beforeEach`), so no expectation
depends on the CI machine's zone.

| File | Use | Class | Outcome |
|---|---|---|---|
| `lib/viewer-tz.ts` (new), `people/auth/me.ts`, `sign-in.ts` | the viewer's zone | — | the hook and the `/auth/me` wiring |
| `classroom/student-link/student-link.ts` `viewerTz` (device only) and its 8 users (`StudentLessonPanel`, `MeetingGuestPage`, `InternalMeetingsList`, `ScheduledMeetingDialog`, `meeting-join-errors`, `MonitorChannel`, `MonitorChannelButton`, `TeacherMessagesPage`) | the browser's zone | a | removed; the hook / client-core `viewerTz()` (person → device → academy) |
| `schedule/grid/WeekSchedule.tsx`, `overview.ts` (`dayBounds`, `spanRange`, `dayWindow`, `teacherDay`), `lesson/lessons.ts` `teacherRows`, `reschedule/slots.ts` (`currentWeekStart`, `bookableWindow`), `ScheduleNav.tsx` | the admin calendar's week / day window, day buckets, 08–24 track, «بتوقيت الرياض» | a | all in the viewer's zone together: the client computes the UTC window (`GET /lessons/overview?from&to` instants), so window, buckets and labels stay one zone; label «بتوقيتك» |
| `teacher/lessons/MyWeek.tsx` | the teacher's week window and label | a | the viewer's week; card zone `me.tz ?? viewer` |
| `grid/SlotGrid.tsx`, `reschedule/SlotPicker.tsx` | slot picker: Riyadh day columns, big Riyadh time, small student time, legend | a | picker in the viewer's zone (window from `bookableWindow(week, now, tz)`, `GET /booking/slots` gets instants); legend `schedule.zoneNote` (same zone) or new `booking.slotLegendViewer`; the small label is the student's clock only when it differs (`zoneLabel` base = viewer) |
| `lesson/LessonChip.tsx`, `LessonDetails.tsx`, `lessons.ts` `studentTimes`, `grid/TeacherCell.tsx` | chip / drawer time, student and teacher clocks | a | viewer's time «بتوقيتك»; a student's or teacher's clock only when it reads differently at that instant (`sameClockAt`, so Cairo in summer adds nothing) |
| `reschedule/ProposalBox.tsx`, `ProposalsPanel.tsx`, `MakeupAction.tsx`, `ConflictNotice.tsx` (`conflictText`, zone note) | proposal / makeup / clash times | a | viewer's zone; the conflict note says `schedule.zoneNote` with the viewer's city; teacher clock only when it differs |
| `edit-time/edit-time-text.ts`, `EditTimeConfirm.tsx`, `EditTimeFields.tsx` | before ← after line, «= 18:00 بتوقيت الرياض» hint | a | viewer's time; the picker stays on the teacher's clock (its label names the city) and the hint becomes `lessons.timeEdit.viewerEquiv` «= {time} بتوقيتك» (`riyadhEquiv` removed: web-only) |
| `booking/steps/slots/SlotStep.tsx` `pickedText`, `GapChip.tsx`, `DayTimesList.tsx` `dayAtText`, `review/BookedPanel.tsx` (week link) | wizard's picked time, gap chip, picked days, «افتح الجدول» week | a | viewer's time «بتوقيتك» + the family's clock when it differs; picked days stay on the family's clock with its city when it is not the viewer's; week link in the viewer's zone like the calendar |
| `booking/trial-date/history/history-text.ts`, `TrialHistoryTable.tsx` | trial dates' times | a | viewer's zone by default, always «بتوقيتك»; family line unchanged |
| `teacher-students/next-lesson.ts`, `teacher/reports/MyReports.tsx`, `routes/teacher/reports.$studentId.tsx`, `routes/admin/students/$studentId_.reports.tsx`, `reporting/reports/ReportFormPage.tsx` | next lesson, report pages' zone (`me.tz ?? RIYADH_TZ`, admin = Riyadh) | a | viewer's zone (teacher: `me.tz ?? viewer`) |
| `sales/schedule/SalesLessonDetails.tsx`, `SalesDayNav.tsx`, `teachers/teacher-view.ts` (`riyadhWhen` → `viewerWhen`), `TeacherStudentItem.tsx`, `TeacherStudentsByKind.tsx` | sales drawer and teacher list times, «بتوقيت الرياض» | a | viewer's zone «بتوقيتك»; student / teacher clocks only when they differ |
| `reporting/dashboard/shared/format.ts` (`whenRiyadh` → `whenViewer`, `rateDate`), `reporting/activity/activity-format.ts`, `platform/google-sync/google-format.ts` | dashboard, activity log and Google log timestamps | a | viewer's zone |
| `people/portal/lessons/LessonWhen.tsx` | family portal: family clock + Riyadh line | a | family-facing, kept on the family's clock; the second line is the viewer's «بتوقيتك», only when it differs |
| `sales/schedule/SalesSchedule.tsx` | today for `GET /sales/schedule?date` | b | kept: the API reads `date` as a Riyadh day (times inside are the viewer's; limit in §4) |
| `reporting/dashboard/search.ts`, `index.ts`, `DashboardPage.tsx`, `finance/finance/FinanceSummaryPage.tsx`, `finance/payments/PaymentsPage.tsx` | `riyadhToday` for `?from&to` ranges, CSV range | b | kept with a comment |
| `finance/payments/api.ts` `paidAtFor`, `record/pay-day.ts`, `RecordPaymentDialog.tsx`, `inbox/sales-money/transfer/SalesTransferStep.tsx`, `finance/payouts/api.ts` | payment day (noon Riyadh), payroll month | b | kept with a comment |
| `teaching/course-pause/CoursePauseSheet.tsx`, `CoursePauseBanner.tsx`, `ChangeUntilDialog.tsx`, `finance/subscriptions/create/use-start-day.ts`, `inbox/sales-money/subscribe/SalesSubscribeStep.tsx` | pause days, start day / used-before cut-off | b | kept with a comment |
| `components/ui/layout/running-head.tsx` | Riyadh **and** Cairo clocks, each named | b | kept (named cities) |
| `booking/draft/draft.ts`, `people/students/create/create-student.ts`, `schedule/reschedule/reschedule.ts` `familyTz`, `booking/steps/review/SeriesCheck.tsx` | a family's zone before one is picked / a never-sent placeholder body | — | kept as data defaults (`ACADEMY_TZ` / `'Asia/Riyadh'`), commented |
| `schedule/tz.ts`, `schedule/index.ts` | `RIYADH_TZ` re-export | — | removed (no user left; tests import it from `@ab/shared`) |

Counts (grep of §3 on `d56c00b8`, tests, fixtures and test kits excluded): **135 matching lines in
59 files** — **a 36 files**, **b 17**, **c 0** (the web sends no messages), **— 6** (data defaults
and the removed re-export); plus the 8 files on the old device-only `viewerTz`, moved to the store. 9
fixture / test-kit files keep `'Asia/Riyadh'` as test data. e2e: `schedule-all-teachers.spec.ts` and
`journey-4-reschedule-conflict.spec.ts` now expect «بتوقيتك» (the browsers run in Asia/Riyadh and
the staff's profile tz is the column default, so their viewer zone is the device's).

Tests: `lib/viewer-tz.test.tsx` (hook, `me.tz` → store, sign-out / no session clear it),
`schedule/lesson/LessonDetails.viewer-tz.test.tsx` (a Cairo viewer reads the Riyadh family's 18:00
lesson on 2026-11-05 as 17:00 with «عند الطالب 18:00 بتوقيت الرياض»; a Riyadh viewer and the Cairo
viewer on 2026-10-22 (summer time) see no family line; drawer and chip), `teacher-view.test.ts`
(Cairo winter), `lessons.test.ts`, `TeacherCell.test.tsx`, `schedule.en.test.tsx` (winter / summer).

## 6. apps/mobile

Filled by the mobile PR (`cloud/review-viewer-tz-mobile`).
