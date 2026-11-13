# 46 — Teacher portal: WhatsApp-code sign-in, the board, the 30-minute report window, confirm / cancel, attendance

Owner request 2026-11-11, decisions accepted the same day («continue»). Gap map: read-only workflow
`wf_6809dc06-c50` on develop `f220455fe`. Most of the portal already works; this doc lists only what
changes. Requirement IDs touched: R-REP-02, R-REP-03 (docs/03), docs/30 (sign-in).

## 1. Intent

Teachers stop needing the admin to give them a login, and they run their day from one screen:

- **Sign in** with a WhatsApp code **or** a password. A teacher with no login gets a code on WhatsApp,
  signs in with it, then sets an email and a password. After that she signs in with email, username
  **or phone** + password (or a code again).
- **The board** (`/teacher` on web, the teacher app on mobile): only her **current** students, each with
  lesson dates, report state and attendance; she writes or edits the report from there.
- **Reports**: editable for **30 minutes** from the first submit; when the window closes the report is
  rendered and sent to the family **once**.
- **Lessons**: she can confirm («سأحضر») or cancel a lesson; she sees each student's attendance.
- **Schedule**: the existing week calendar (web) and «جدولي» (mobile) stay; they gain the actions.

## 2. Owner decisions (2026-11-11)

| # | Decision |
|---|----------|
| D1 | Teacher «تأكيد» means **«I will attend»**: stored apart (`lessons.teacher_confirmed_at/by`), never changes `lessons.status`, works whether `lesson_confirmation_required` is on or off. The teacher's current family-style confirm button is replaced. Whether the lesson took place stays with the report / outcome. |
| D2 | A teacher's WhatsApp sign-in code goes to **`teachers.phone_e164`** while she has **no login** (her first sign-in) or her login's setup is unfinished (owner, 11-11); once setup is done it goes to **her login's own phone** (`profiles.phone_e164`, as reset codes do today), so editing a teacher record can never redirect codes of an existing login. Active teachers only, login role `teacher` only. No new switch: teacher codes work whenever codes can be sent (`LOGIN_CODE_PEPPER` set, `account_code` approved, sending on), independent of `family_login_enabled`. Residual risk (whoever holds `teachers.write`, admin by default, could redirect a not-yet-signed-in teacher's first code) is recorded in docs/30. *(Two-step destination = builder-check call, 11-11.)* |
| D3 | Teacher cancel: **one lesson**, **reason required**, only **before the lesson starts**. Status `cancelled_by_teacher` (not charged, not paid — existing rule). Family gets the existing `lesson_cancelled` notice; admins + the student's owning assistant get a push with the reason. No automatic replacement; the screen suggests «اقترح موعدًا آخر». |
| D4 | **Current student** = assigned to the teacher (her weekly rules / active course) and not paused or churned; trial and subscribed in one list with a status chip + filter. Board window: lessons **14 days back, 14 days ahead**. The attendance log covers **only her own lessons** with that student, all time. |
| D5 | The edit window is **30 minutes from the first submit**; edits do not extend it. The family (and the teacher's own link message) gets **one** message 1–2 min after it closes. Admin edits after that re-render the PDF and page but do not re-send. The no-login teacher report link keeps its 24 h on its own setting. |

## 3. Non-goals / anti-goals

- No change to admin/sales lesson actions, family confirmation, auto-absent, or the legacy Google form.
- Never route someone to WhatsApp automatically because they "have no password" (leaks account state).
  The code path is an explicit link on the sign-in screen.
- Never open admin endpoints (`/lessons/:id/cancel`, `/students/:id/attendance`, `lessons.write`,
  `lessons.cancel`) to teachers. Teacher routes live under `/teachers/me/*` with `self.teacher`.
- No fourth "my students" query in SQL; no status filter inside `TeacherMeRepo.students` (the inbox
  and `reports.$studentId` use it).
- No native mobile change, no app version bump: everything ships OTA (the teacher types the code).
- No WhatsApp sends to real teachers or families in tests: `tools/wa-stub`, Meta test numbers, allow-list.

## 4. The work, as three PRs (merge order A → B → C)

Each PR carries its web **and** mobile part. All three touch `packages/shared/i18n/ar.json` + `en.json`
(MSA, an `en` twin for every key) — merge develop before opening the PR.

### PR A — `feat/teacher-code-sign-in` (migration `20261111000100_login_codes_teacher_subject.sql`)

- **A1 code availability.** `SignInKit.staffAvailable()` → `CodeIssuer.sendable()` (no family flag).
  `CodeStatus` becomes `{ available, staff }` from `GET /auth/code/status`; web `CodesGate`/`StaffPanel`
  and mobile `use-forgot` read `staff`; the family tab keeps `available`. `PasswordService.forgot/reset`
  pick the check by target kind (staff → sendable, student → available).
- **A2 teacher code sign-in.** New `flows/teacher-code.service.ts` mirroring `FamilyCodeService`:
  `POST /auth/staff-code/request` (guard, 202, lookup + send after the answer) and
  `POST /auth/staff-code/verify` → `{ token_hash, type }` (client trades it with `verifyOtp`). Reuse
  `codeRequestSchema` / `codeVerifySchema`. New `SubjectsRepo.teacherByPhone(e164)`: teachers only,
  `status='active'`, matched on `teachers.phone_e164` OR the linked login's `profiles.phone_e164`;
  returns id, display name, record phone, tz, profile_id, login phone (NOT `staffByPhone`, which returns
  any staff role and stops at a guardian login). Destination per D2: no login → record phone; login →
  login phone (null → nothing sent, still 202). Code subject `{kind:'teacher', id: teachers.id}`,
  purpose `sign_in`. Add `'teacher'`
  to `SubjectKind`; the migration widens `login_codes_subject_kind_check` with the NOT VALID + VALIDATE
  pattern of `20261106001401`. Audit `code_sign_in` via `teacher_phone`. Routes in client-core `signInApi`.
- **A3 lazy teacher login.** `Provisioner.teacher(t)`: if `profile_id` is set the profile must be role
  `teacher` and enabled (else 403 `account_disabled`, only after a correct code); otherwise `make()` with
  `familyEmail('t', id)` (widen kind to `'g'|'s'|'t'`), role `teacher`, name, tz, phone null when another
  profile holds it. Replace the guardian/student ternary in `SubjectsRepo.link` with a lookup map
  `{guardian:'guardians', student:'students', teacher:'teachers'}` (the ternary would update a students
  row and then delete the new auth user).
- **A4 first-time setup.** `PUT /me/setup {email, password}` (SignedIn): only while role is `teacher` and
  the auth email `isFamilyEmail`, else 409 `setup_done`. Password via `passwordProblem` +
  `AUTH_PASSWORD_MIN_LENGTH`; email via `SupabaseAccountAuth.update(id,{email,password})` (admin API,
  `email_confirm: true` — no SMTP; never `supabase.auth.updateUser({email})` from the client); 409
  `email_taken`; revoke other sessions. `accountSetupSchema` refuses `@family.invalid`. `needs_setup` is
  computed on the client (`role==='teacher' && isFamilyEmail(me.email)`); the client calls
  `refreshSession()` after setup or the screen loops. Setup is required before the portal opens.
- **A5 phone + password.** `SignInAccounts.emailFor`: add a phone branch → `teacherByPhone` (A2) →
  its `profile_id` with role `teacher` → `emailOf` (not `staffByPhone`, so a number shared with a parent's
  login still finds the teacher). Email stays refused there (email goes client → GoTrue). Relabel the field
  «البريد الإلكتروني أو اسم المستخدم أو رقم الجوال».
- **A6 web UI.** StaffPanel: «الدخول برمز واتساب» link (shown when `status.staff`); `PhoneSignIn` takes the
  request/verify pair as a prop. New `/account-setup` route (email, password, confirm) → `PUT /me/setup`
  → `refreshSession()` → teacher home; `/teacher/*` redirects there while `needs_setup`.
- **A7 profile phone.** `UsersCreateService.linkRecord` copies `teachers.phone_e164` when the admin leaves
  the phone empty. A one-off backfill script (profile phone null, no other profile holds the number) is
  written but run on production only with the owner's go.
- **Shared numbers (teacher who is also a parent).** A teacher login never takes a number that a
  `guardians` row or another profile holds: A3 provisioning, the A7 copy and the backfill all leave the
  teacher's profile phone null then, so the family keeps its code sign-in (`phone_belongs_to_staff` never
  fires because of a teacher) and the teacher still signs in through her record (A2/A5 look up `teachers`).
  While that login is setup-pending (role `teacher`, auth email still `isFamilyEmail`) her codes go to the
  record phone, as with no login (owner, 11-11), so a sign-out before setup never locks her out; after setup
  they go to the login's phone only. Unit-test both orders (parent first, teacher first) and parent first →
  teacher code → setup unfinished → a second code reaches the record phone. *(Builder-check call, 11-11.)*
- **A8 mobile (OTA).** `login.tsx` «الدخول برمز واتساب» mode: phone → 6-digit code → staff-code verify →
  `supabase.auth.verifyOtp`. Reuse `ForgotCodeStep`, `use-countdown`, `RESEND_SECONDS`. «أكمل حسابك»
  screen when `needs_setup`.
- **A9 docs + e2e.** docs/30 gets «Teachers: WhatsApp code + first-time setup» (records D2 and the
  routes). Playwright journey against `tools/wa-stub`: teacher phone → code → `/account-setup` → teacher
  home → sign out → phone + password.

### PR B — `feat/report-edit-window` (no migration; the setting default lives in code)

- **B1 setting.** `report_teacher_edit_minutes` (int, default 30, min 0, max 1440, module reports) in the
  settings registry, layout, value-groups, value-units (`minutes`), ar/en label + hint, `ReportsSettings`
  KEYS. `0` = send at once (today's behaviour). `report_teacher_edit_hours` stays for the no-login link
  only, relabelled «مدة صلاحية رابط التقرير بعد نهاية الحلقة» (it is also signed into link tokens).
- **B2 rules.** `EditWindowInput.hours` → `minutes`; `canEditReport` / `editUntil` use `MINUTE`
  (`packages/shared/src/reports/rules.ts`); `ReportGate.context` reads the new key; follow the rename
  through `report.mapper.ts`, `teacher-reports.mapper.ts`, `teacher-reports.service.ts`; update tests.
  The anchor stays the first submit (`nextVersion` keeps `submitted_at`). teacher-link files keep hours.
- **B3 render at close.** `ReportPdfQueries.pendingIds` gets a cutoff `.lte('submitted_at', cutoff)` with
  `cutoff = now − report_teacher_edit_minutes − 60 s grace`. Read the setting in the queries or a small
  `ReportPdfSettings` helper, not in `report-pdf.job.ts` (146/150 lines). The 60 s job poll is the
  sweeper; sender and `messages.scheduled_for` unchanged; dedup key `report_ready:{id}` stays one per
  report (it stamps `lesson_reports.sent_at`); do NOT add report_ready to `AUTOMATIC_KEYS`.
- **B4 teacher message.** `report-ready-choice.ts` `teacherDue`: `version === 1` → `report.sent_at === null`
  (add `sent_at` to the `ReportSource` select), else an in-window edit drops `report_ready_teacher`.
- **B5 UI copy (web + mobile).** While `can_edit && sent_at === null`: «سيُرسل إلى الأسرة بعد {when}»;
  «أُرسل» once `sent_at` is set. Reword v2.send / sendHint / sentOk / editUntil. Hide the PDF button until
  `pdf_status` is ready. Mobile: live countdown (`useNow`) in ReportFooter/V2Footer that refetches at
  zero; derive the sent-list chip from `edit_until` + now, not the cached `can_edit`.
- **B6 tests + docs.** Seed `report_teacher_edit_minutes = 0` next to the hours row in
  `e2e/support/core/db.ts` (journey-2, guardian-deliveries); `teacher-report-edit-window.spec.ts` sets 30
  and backdates `submitted_at` by 31 min. docs/03 R-REP-02 (30 min, new key) and R-REP-03 (sent when the
  window closes); docs/11 settings table; docs/19.

- **B7 report state on lessons (moved from C2).** Add `submitted_at`, `sent_at` to the `lesson_reports` embed in
  `LESSON_SELECT`; compute `can_edit`/`edit_until` in the mapper from ReportsSettings (B2's minutes);
  same fields on `ReportSummaryView`; ReportHistoryList links to the form while `can_edit`.

### PR C — `feat/teacher-board` (migration `20261111000200_lesson_teacher_confirm.sql`)

- **C1 board (web).** `/teacher` home becomes the board, no new nav item. First tab «طلابي»: `me.students`
  filtered on the client by a pure, tested `isCurrentStudent()` (D4) + ONE `myLessonsQuery` over
  `[today−14d, today+14d)` (two calls if the API's 31-day cap needs it) grouped by `lesson.students[].id`.
  Compact table: name/code/status chip | last lesson (date + attendance) | next lesson | last report state (status from the existing embed; `can_edit`/`edit_until` from B7 once PR B is in develop)
  | present / absent in the window. Row → existing Drawer with tabs «الحلقات» (TeacherLessonCard with the
  actions + report link to `/teacher/report/$lessonId`), «التقارير» (GradeChart + ReportHistoryList),
  «الحضور» (C5). Keep «اليوم». One tz for the board (the viewer's), not MyWeek's mix.
- **C3 teacher cancel (API).** `POST /teachers/me/lessons/:id/cancel {reason}` (required) under
  `self.teacher`: `LessonAccess.assertCanTouch`, then refuse unless the lesson is open and
  `starts_at > now` (409 `lesson_started`; also blocks the auto-held correction branch), then
  `LessonCancelService.cancel` with `by:'teacher'`, `scope:'one'` hard-coded; return
  `views.one(id, user.role)`. Push the reason to admins + the owning assistant (PushService, like
  `lesson_needs_confirmation`). Do NOT add `cancel_by_teacher` to `TEACHER_EVENTS` (it reaches every
  non-admin role). Tests: other teacher 403, after start 409, completed 409, by/scope forced.
- **C4 teacher confirm (D1).** Migration: `lessons.teacher_confirmed_at timestamptz`,
  `teacher_confirmed_by uuid` (RLS unchanged; API is the only writer); the same migration redefines the
  lesson time-edit function (latest definition: `20261001000175_time_edit_rerender.sql` or later) so a
  moved lesson clears `teacher_confirmed_at/by` exactly as it clears `confirmed_at` *(builder-check call)*. `POST
  /teachers/me/lessons/:id/confirm-attendance`: before the start only, never touches status. Shown on
  admin/sales lesson views as «أكّد المعلم الحضور». Remove the teacher's family-style confirm from the
  teacher card (web + mobile). Also: `LessonStatusService.confirm` refuses a teacher actor once
  `ends_at <= now` (409 `lesson_ended`), mirroring `SalesLessonActions.confirm`.
- **C5 attendance.** `GET /teachers/me/students/:id/attendance` (self.teacher): asserts the student is in
  `TeacherMeRepo.students`; reuses `StudentAttendanceRepo` with a `teacher_id` filter (own lessons only);
  months in the viewer's tz; `cancel_reason` blank on admin cancels. Pure tested `attendanceRate()` in
  packages/shared: present ÷ (present + absent + excused); auto-held lessons with no report show
  «لم يُسجَّل», not present. Count from `lesson_students.attendance` + lesson status, not from reports.
- **C6 web card.** TeacherLessonCard: «سأحضر» (C4) and «إلغاء الحلقة» (danger, required reason, C3) while
  open and before the start, each with its own mutation.
- **C7 mobile (OTA).** «طلابي» pill filtered by `isCurrentStudent()`; StudentReportsScreen adds the
  student's lessons over the same window with the same counts; a cancel sheet (reason, one lesson) with
  its OWN mutation to C3 — not `useLessonAction().cancel` (admin route) nor the admin CancelLesson;
  confirm + cancel in the sheet opened from the «اليوم» row and the hero's lead, and in the «جدولي»
  sheet (docs/48: no per-lesson card on «اليوم» any more); a teacher «سجل الحضور»
  route reusing AttendanceLogHead/AttendanceLogRow with the C5 path.

## 5. Traps (must not break)

- `report_teacher_edit_hours` also sets the no-login link lifetime (signed into the token): new key only.
- `LessonCancelService.cancel` has no ownership check, trusts `by`/`scope` (`rule` ends the series), and on
  a `completed` lesson with by≠admin takes the AutoHeldCorrection branch.
- «اعتذر مسبقًا» is a STUDENT cancel (charged under `late_cancel_hours`): not the teacher cancel.
- `insertProfile` maps any 23505 to `phone_belongs_to_staff`: pass phone null for a teacher whose number
  is on a guardian login. `Provisioner.usable` checks no role: require `teacher`.
- Codes are single-use: the lazy route spends the code at verify; setup is a signed-in call.
- `/auth/me` email comes from the JWT: `refreshSession()` after setup.
- Web outcome buttons send no per-student array (group lessons): link board rows to the lesson report.
- `/teachers/me/reports` student filter is a `contains` match (AB-100 matches AB-1000..): match exactly.
- File budgets: `report-pdf.job.ts` 146/150, `code-issuer.ts` 138/150, `sign-in.ports.ts` 125/150 — new
  logic in new files; options objects past 3 params; settings injected by property.
- Migrations merge in ascending order (A 000100 before C 000200).

## 6. Code rules for every builder

CLAUDE.md rules 1–4 (150 lines/file, ≤ 3 params, strict TS without `any`/`!`, unit tests next to the
code, pure logic ≥ 80 %), rule 12 zod at boundaries, and **fewer ifs**: lookup maps / `Record` handlers /
named predicates, one early-return guard per function, no nested ifs. MSA strings only in ar.json with
en.json twins. Design: docs/07 §12–14, compact tables, tabs, one group per view, RTL, light/dark, 390 px.

## 7. Owner steps (not code)

1. «القوالب»: `account_code` APPROVED on the chat line (prod and the new staging); line driver kapso or meta.
2. `LOGIN_CODE_PEPPER` — verified set on the live server 2026-11-11 (64 chars, both API containers).
3. Check every active teacher's `teachers.phone_e164` (the code goes there).
4. «go» for the production backfill (A7) and the deploys carrying migrations 000100 / 000200.
5. After deploy, «الإعدادات»: `report_teacher_edit_minutes` = 30, `report_teacher_edit_hours` = 24,
   report_ready rule on.
