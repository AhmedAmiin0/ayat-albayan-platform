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

`grep -rnE "RIYADH_TZ|Asia/Riyadh|riyadhToday|zonedWhenText|riyadhTime|REOPEN_TZ"` over non-test
code (fixtures, `*.fakes.ts` and tests excluded) on `origin/develop` @ `b6a9c3a6`. Each use is
classified **(a)** display → viewer zone, **(b)** academy-wide rule → kept with a comment, **(c)**
message to a recipient → recipient's zone. Counts per app are in §4–§6.

## 4. packages/shared, packages/client-core and apps/api

| File | Use | Class | Outcome |
|---|---|---|---|
| shared `time/viewer-zone.ts` (new) | `ACADEMY_TZ` as the last fallback | — | the resolver |
| shared `time/riyadh-day.ts` `riyadhToday` | the academy's day (ranges, cut-offs) | b | kept |
| shared `time/riyadh-day.ts` `zonedWhenText` | «الاثنين 12 أكتوبر 18:00» on screens | a | `words.tz` (viewer) required |
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

Known limit (b): a screen that pages by **day** through a `?date` endpoint (`GET /lessons/day`,
`/sales/schedule`) asks the API for academy days, so a Cairo viewer's day list runs 23:00 → 23:00 in
winter; times inside it read in the viewer's zone. A lesson between 00:00 and 01:00 Riyadh is on the
evening before for that viewer: its row names the viewer's weekday (mobile `viewerDayHint`, web
`otherDayNote`), and the web day nav says «يوم الأكاديمية بتوقيت الرياض». Moving the day parameter
to the viewer's zone is a later API change. Screens that ask by `?from&to` instants (the mobile
calendars, the web board) compute the window from the viewer's midnight (`utcOffsetMinutes`, never a
fixed +03:00) and group by the viewer's day, so they have no such limit.

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
| `sales/schedule/SalesSchedule.tsx`, `SalesDayNav.tsx`, `ScheduleLessonItem.tsx` | today for `GET /sales/schedule?date` | b | kept: the API reads `date` as a Riyadh day; the nav says so, a row on another viewer day names it (limit in §4) |
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

One source: `useViewerTz()` (`src/core/lib/clock/viewer-tz.ts`, `useSyncExternalStore` over the
client-core store) and `zoneNote(tz)` «الأوقات بتوقيتك (القاهرة)» beside it. `useMeReady`
(`src/auth/use-me-zone.ts`) feeds the store from `GET /auth/me` `tz` (null when signed out) and
keeps «جارٍ الاتصال» up until the store reads that zone, so text helpers that call client-core
`viewerTz()` without subscribing (`booking/shared/slots.ts`, `*-text.ts`) never paint a stale
zone. `meetings/manage/use-viewer-tz.ts` (academy clock outside the teacher tree) is deleted.
Tests run as a Riyadh viewer on a Riyadh phone (`jest.setup.cjs`), whatever the CI machine's zone.

| File | Use | Class | Outcome |
|---|---|---|---|
| `today/lib/lesson-text.ts` (`riyadhTime` → `lessonClock`, `studentTimes`), `today/components/LessonRow`, `QuietDay` (time), `today/hero/HeroCard`, `hero-text`, `live/LiveSessions`, `classroom/sessions/SessionCard`, `classroom/assistants/AssistantLessonItem`, `classroom/links/join-text`, `sales/components/SalesLessonRow`, `calendar/agenda/AgendaLessonRow` | a lesson's start on a row, card or hero | a | viewer's clock; a student's clock only when it differs at that instant (`otherZoneClock`) |
| `today/lib/today-plan.ts` `greetingPart` | «صباح الخير» by the hour | a | viewer's hour |
| `calendar/agenda/agenda.ts` `teacherClock`, `calendar/details/details-text.ts` `whenLine` / `clockLines`, `DetailsWhen` | «… بتوقيت الرياض», the student's and teacher's clocks | a | «… بتوقيتك»; other clocks only when they differ (Cairo in summer: none) |
| `calendar/overview/overview-text.ts` `spanClock` / `windowsLine` / `freeLabel`, `TeacherHeader`, `AgendaItemRow` | windows and free gaps | a | viewer's clock, named with the viewer's city |
| `calendar/overview/overview-text.ts` `teacherMeta`, `more/schedule.ts` | the teacher's city / a zone's name | — | kept: a place, not a clock |
| `booking/shared/slots.ts` (`dayLabel`, `freeSlotDays`, `slotTimes`, `whenText`, the legend), `teaching/reschedule/SlotButton`, `SlotPicker`, `booking/trial/components/SlotStep`, `edit-time/components/CorrectTimes`, `EditTimeConfirm`, `edit-time/lib/edit-time-text.ts` | pickers: slots by day, the big clock, «الموعد الذي اخترته» | a | the viewer's days and clock, the student's under it when it differs; the picker states its zone (`zoneNote`); a slot is an instant sent as is, nothing typed or converted |
| `booking/shared/booking-errors.ts`, `booking/shared/picks.ts`, `booking/invoice/MediaCard`, `booking/makeup/MakeupAction` | a clash's time, a weekly pick's city label, a media time, a makeup chip | a | viewer's clock; a pick names its city when not the viewer's zone |
| `trial-date/lib/trial-date-text.ts` (`VIEWER_TZ`) | a trial's time and the family's | a | viewer's clock «بتوقيتك», `trialDate.familyTime` only when it differs |
| `sales/lib/sales-text.ts` (`riyadhDate` → `viewerDate`, `nextLessonLine`), `sales/student/schedule-text.ts` (`weeklyLine`, `slotLines`), `ScheduleSection`, `UpcomingLessons`, `AttendanceSection`, `TrialSection`, `ReportsSection`, `sales/teacher/TeacherAttendanceTab`, `TeacherOverviewTab`, `sales/components/SalesTeacherHeader`, `sales/attendance/*` (day, time, note), `SalesScheduleScreen` (subtitle) | sales' student and teacher pages | a | viewer's days and clock; notes say «الأوقات بتوقيتك (…)» |
| `ops/activity/activity-format.ts`, `ops/dashboard/work-text.ts`, `payments/format.ts` `instantDay`, `earnings/lib/format.ts` | log times, a pending report, an instant's day, a session | a | viewer's zone |
| `teacher/screens/*` (`Today`, `Students`, `Reports`, `StudentReports`), `teacher/report/screens/ReportFormScreen`, `student-file/recordings/RecordingRow`, `classroom/recordings/recording-format.ts`, `meetings/manage/{use-viewer-tz,use-enter-meeting,meeting-text}.ts` | `teachers/me` tz or Riyadh | a | `useViewerTz()` (the teacher's tz via /auth/me; an admin's own zone) |
| `inbox/shared/format.ts` `clockAt` (not in the grep) | «آخر تحديث» in the device's zone | a | viewer's zone |
| `calendar/lib/week.ts` `weekWindow` / `zonedMidnight`, `calendar/agenda/agenda.ts` `agendaDays`, `calendar/overview/overview.ts`, `DayScheduleScreen`, `TeacherCalendarScreen`, `teacher/screens/TeacherScheduleScreen` | the calendars' week / day window and day buckets | a | the viewer's days: window from the viewer's midnight, lessons under the viewer's date (review of #462) |
| `calendar/lib/week.ts` (`riyadhToday`, `riyadhMidnight`), `teaching/reschedule/{SlotPicker,queries}.ts`, `assistant-app/{AssistantHomeScreen,assistant-day}.ts`, `classroom/sessions/AdminSessionsScreen`, `today/lib/use-day-lessons.ts`, `today/components/QuietDay` (date), `booking/shared/BookedPanel`, `sales/lib/sales-api.ts` `useSalesDay`, `sales/screens/SalesScheduleScreen` (today), `ops/dashboard/dashboard-queries.ts` | the day / week a screen pages by, the `?date` / `?from&to` it asks for | b | kept: academy days, as the API's day params (§4 known limit); the times inside read in the viewer's zone and the subtitle names it |
| `finance/shared/month.ts`, `money/payments/PaymentFilters`, `finance/expenses/expense-draft.ts`, `payments/lib/paid-day.ts`, `assistants/terms/terms-form.ts`, `sales-subscribe/components/SalesSubscribeForm`, `subscribe/UsedBeforeField`, `students/course-pause/*` (3), `inbox/messages/reply-actions/reply-lesson-read.ts` | finance month, paid / expense / terms day, subscribe start day, used-before and pause cut-offs, a reply's lesson day | b | kept with `// academy day (docs/34 b)` |
| `subscribe/SubscribeScreen`, `sales/lesson-actions/SalesRescheduleForm`, `teaching/reschedule/reschedule-body.ts`, `booking/trial/lib/draft.ts` (`COUNTRY_TZ`), `details-text` `seriesLine`, availability `teacherTz` fallbacks | a family's or teacher's tz with the academy's when missing | b | kept: a data default for the other person's zone, not a display zone |

Counts (the §3 grep over `apps/mobile/src` non-test code at `d56c00b8`, import lines and the 16
fixture / test-helper lines left out): **114 uses in 77 files: a 75, b 37, c 0, — 2** (a place
name). Messages (c) are composed by the API; the app sends none with a time.

## 7. date-fns facade

Owner, 2026-10-30: «You can use date-fns instead of handling date». `date-fns` 4, `@date-fns/tz`
and `@date-fns/utc` (pure JS, so mobile still ships by OTA:
`tools/scripts/ci-checks/native-changes.mjs`) are dependencies of `packages/shared` only.
Calendar dates are computed on `UTCDate` (UTC getters and setters), so the device's zone, or a
test that fakes `Date`'s local getters, cannot move a date. Apps import date helpers through `@ab/shared`, never
`date-fns` directly. The facade is in `packages/shared/src/time/`:

| file | what |
|---|---|
| `zoned.ts` | wall clock ↔ UTC: `wallToUtc(date, minutes, tz)`, `wallInstant(date, 'HH:MM', tz)`, `offsetMinutesIn`, `localDateIn` / `localMonthIn` / `hhmmIn` / `zonedFieldsIn`, `weekdayIn` |
| `calendar.ts` | calendar dates (`addCalendarDays`, `addCalendarMonths`, `weekdayOfDate`, `weekStartOfDate`, `calendarDaysBetween`), and instants in a zone: `startOfDayIn` / `endOfDayIn`, `startOfWeekIn`, `addDaysIn` / `addWeeksIn` (the wall clock is kept across DST), `dayRangeIn` (`?from&to`), `monthRangeIn` (payroll month) |
| `format.ts` | words: `dateText` / `dateTextParts` (Intl names in the UI language, `-u-nu-latn` ASCII digits), `weekdayDayMonth` «الأحد 4 أكتوبر», `clockOf` / `clockIn` in the 12/24 h cycle (`useClock` / `useClockCycle` stay its source), `engineTimeZone` |
| `running-head.ts`, `chat-day.ts`, `riyadh-day.ts`, `week.ts`, `time-zone.ts`, `viewer-zone.ts` | built on the three files above |

- **Arithmetic** uses date-fns with `{ in: tz(zone) }`. **Wording** uses Intl in MSA (date-fns' `ar`
  locale is not used). The relative phrases («منذ 5 دقائق», «أمس») keep their i18n strings.
- **Same instants as before.** A wall time in a spring-forward gap, or a repeated one, resolves as it
  did before date-fns: two offset reads (`wallToUtc`). `addDaysIn` keeps the old offset correction,
  so the day-before reminder fires at the same instant. These are not TZDate's own rules (New York
  02:30 on 2026-03-08 would differ).
- **Goldens** (regression tests, fixed values). `packages/shared/src/time/golden/*.golden.test.ts`
  and `apps/api/…/zoned-time.golden.test.ts` / `occurrences.golden.test.ts` cover 2025-12-24 to
  2027-01-07 in Cairo, Riyadh, Dubai, Kuwait, Qatar, London and New York. Before the swap they ran
  the old and new code side by side. Their digests were taken from the old code and now pin
  occurrence generation, the day-before reminder (send instant, expiry, «due»), the reopen dedup
  day, the payroll month, the `?from&to` window and every facade function. They also check the
  DST edges explicitly (Cairo 2026-10-29 and 2026-04-24, New York, London).
- **Plain durations** (retention days, lookbacks, timers, «at most 31 days apart») stay ms
  constants. Only calendar math moves to the facade.
- **Ratchet.** `packages/config/eslint-dates.js` (`no-restricted-properties`) bans
  `Intl.DateTimeFormat`, `toLocaleDateString`, `toLocaleTimeString` and `getTimezoneOffset`
  outside `packages/shared/src/time` and tests. The uses that predate it sit in
  `eslint-suppressions.json` (`refactor/guards/lint.json` total). After B1: 61, of which web 33
  and mobile 22 are lanes B2 and B3, and api and client-core are 0. Justified leftovers:
  `packages/shared` `core/schemas/common.ts` `isTimeZone`, which checks that an id is a zone
  (`core` may not import `time`: `guard:cycles`); `e2e/support` (3), which keeps its own Intl
  oracle so the e2e checks do not reuse the code they test; `tools/migrate/src/time.ts`, the
  one-shot Sheets import (docs/06), left as it is; and `tools/scripts/calendar`, a standalone
  script with no `@ab/shared`.
