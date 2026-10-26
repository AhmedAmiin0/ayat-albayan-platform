# 24 — Google Calendar + Drive + Sheets sync (alongside the old Apps Script)

Owner request 2026-10-22: «integrate with google drive / google calendar to replicate the current logic that
happens in the calendar and in the drive. I don't want this logic to stop from the calendar or the google
sheets now, I want it to keep working as is until I fully migrate».

## Owner answers (2026-10-22) — these override anything below

1. **Same calendars and folders.** The platform writes into the EXISTING teacher calendars, the academy's
   main calendar, the existing student Drive folders and the existing sheets — next to what the old
   Apps Script writes, never editing or deleting anything the script made.
2. **One way only for now:** platform → Google. Nothing is read back into the platform from the old
   Google Form / sheet flow (that data is imported once at cut-over with tools/migrate).
3. **Scope:** teacher calendars (+ the main calendar copy), report PDFs in each student's Drive folder,
   the per-student attendance sheet «سجل حضور — <student>» and the summary sheet «سجل الطلاب المشتركين».
4. **Account:** the academy's own Google account (the one that owns the calendars and folders today),
   connected once by the owner with OAuth; credentials kept in Vault.

## 1. What the old system does today (read from the live account on 2026-10-22, read-only)

Apps Script «Ayat AlBayan - Sheet & Calendar Sync» (standalone, V8, tz Asia/Riyadh). Secrets live in
Script Properties (none in code). Triggers: `onSheetEdit` (any edit of the bookings tab) and daily
`syncToCalendar` 06:00, daily `updateCalendarLinks` 07:00.

**Bookings tab «تقويم الحجوزات»** (one row per booking): A name, B phone, C date, D time, E duration
(default 45), F repeat (Arabic weekdays, e.g. «السبت/الثلاثاء/الخميس …»), G status, H kind, I notes,
J event id, K sync log, M teacher name, N teacher calendar id, O main-calendar mirror event id.

**`syncToCalendar`** — for each row whose status is one of `مشترك`, `مؤكد`, `يحتاج تأكيد`:
- Event (or recurring series; trials are always single) on the TEACHER calendar, plus a MIRROR copy on
  the academy's DEFAULT calendar (the account's primary calendar). Popup reminder 30 min.
- Title: `حلقة — <name>` (or `حلقة — طالب جديد`), plus ` (يحتاج تأكيد)` when that is the status.
- Description, top to bottom: `لينك الحلقة: <link>` (when the teacher has a Meet link) · `حلقة تجريبية —
  مرة واحدة بس` (trials) · `المعلم/ة: <teacher>` · `التكرار: <repeat>` (series) · `نوع الحلقة: <kind>` ·
  `الحالة: <status>` · `ملاحظات: <notes>` (if any) · blank line · `مربوط تلقائيًا بتاب تقويم الحجوزات — عدّل في الشيت مش هنا.`
- The MIRROR copy additionally has `الطالب: <name>` and `رقم الطالب: <phone>` under the link line; the
  teacher's copy never shows the family's phone.
- Location: the Meet link, else `أونلاين — Zoom`.
- Any other status (incl. `ملغي`) deletes both events.
- It only ever reads/writes/deletes events whose ids are stored in its own sheet rows.

**`updateCalendarLinks`** (daily) — only events referenced by sheet rows.
**`dedupeCalendars`** (MANUAL, «run once») — scans ALL events of the main + teacher calendars from
−7 to +120 days, groups by `title|start`, keeps the sheet-referenced one (else the oldest), deletes the rest.
**`purgeJitsi`** (MANUAL) — scans ALL events Aug–Dec 2026 and rewrites any description/location
containing `meet.jit.si`.
**`teacherCalendars`** — tab «المعلمون» (name · Google email · calendar id · share note); it creates
`آيات البيان — <teacher>` calendars (description «حلقات المعلم/ة <teacher> — بيتحدّث تلقائيًا من شيت الحجوزات»)
and shares them with the teacher as editor. 11 teacher calendars exist today (Latin teacher names).

**Report flow** (a separate script bound to the report form's sheet; its source is not exportable through
Drive — the owner may paste it later; the formats below come from its output): for every report it
- renders a branded PDF (library «آيات البيان — الهوية (Brand)»: `reportHtml(meta, rows)`, palette green
  `#0C2A1E`/`#14503A`/`#1E6B4C`, gold `#C2A24A`, paper `#FDF8F0`) into the student's folder under the
  Drive root folder **«تقارير آيات البيان»**, named **`<student> — <yyyy-mm-dd>.pdf`**;
- appends a row to that folder's sheet **«سجل حضور — <student>»**, header row (13 columns):
  `تاريخ الحلقة, رقم الحلقة, المعلمة, البرنامج, الحضور, التسميع, الحفظ الجديد, المراجعة, التقدير العام,
  ملاحظات المعلمة, الواجب, رابط الاجتماع, تقرير PDF` (the last cell is the PDF's Drive view link);
- keeps one row per student in **«سجل الطلاب المشتركين»** (in the root folder), header (8 columns):
  `اسم الطالب, المعلمة, البرنامج, تاريخ أول حلقة, آخر حلقة, عدد الحلقات, مجلد الطالب, سجل الحضور`
  (the last two are the folder link and the attendance-sheet link).
- Sheets are styled with Brand `styleSheet`: RTL, hidden gridlines, header green `#0C2A1E` with white bold
  text and a thick gold bottom border, frozen header, banding white / paper.

The flow is still live (attendance and summary sheets were written on 2026-10-21).

## 2. Rules that keep the two systems from clashing

1. **Never touch what the script made.** The platform only updates or deletes events / files / rows that
   it created itself and recorded in its own tables (`google_*` ids). It never lists-and-edits.
2. **Never twin a sheet booking.** The calendar sync writes ONLY lessons that originated in the platform.
   The 2026-10-02 import recorded every row it created in `public.import_items` (`entity`, `natural_key`,
   `target_table`, `target_id`; tools/migrate/src/db/sql.ts), including `schedule_rules`, `lessons` and
   `lesson_reports`. A lesson is **platform-origin** iff its id is NOT an imported `lessons` target AND its
   `rule_id` (when set) is NOT an imported `schedule_rules` target — later occurrences generated from an
   imported rule belong to a sheet booking the script already mirrors, so they are skipped too. Implement it
   as one SQL predicate (a view or function in a NEW migration, e.g. `v_platform_origin_lessons`) with unit
   + SQL tests. Known gap (tell the admin in the UI): if a sheet student's schedule is changed in the platform
   (new rule), the platform writes the new times while the sheet row keeps the old ones until someone edits it.
   This also keeps the manual `dedupeCalendars` from deleting a platform event in normal use.
3. **Tag every platform event** with `extendedProperties.private = { ab_source: 'platform', ab_lesson_id }`
   and end its description with `مربوط تلقائيًا بمنصة آيات البيان — عدّل في المنصة مش هنا.` instead of
   the sheet line. The title gets a visible marker: `حلقة — <name> · المنصة` (+ ` (يحتاج تأكيد)` when that
   applies), so the team sees which system made it and the manual `dedupeCalendars` (key `title|start`)
   never groups a platform event with a script event when a family was entered in both systems. Never put a `meet.jit.si` link in an event (so `purgeJitsi` never rewrites one); use
   the lesson's own join URL (platform classroom link / teacher's fixed Meet link) as `لينك الحلقة`.
4. **Deleted by someone in Google ⇒ do not fight.** If a platform event / file is gone (404/410 or
   `status: cancelled`) when the platform tries to update it, mark the mapping `gone`, log it, and do not
   recreate it unless the lesson itself changes afterwards.
5. **Reports:** only reports submitted in the platform are exported (never imported ones). If a report for
   the same student and date already exists in the attendance sheet (written by the old script), the
   platform still uploads its PDF (suffix ` (المنصة)` before `.pdf`) but does NOT append a second
   attendance row; it logs `already_in_sheet`.
6. **Summary sheet:** the platform upserts ONLY the row of a student it writes for, matched by the
   folder link (column G) first, then by normalised Arabic name (`normalizeArabic`); it recomputes
   `تاريخ أول حلقة / آخر حلقة / عدد الحلقات` from that student's attendance sheet (min/max date, data-row
   count), so whatever the old script does to the same row stays consistent. New students get a new row.

## 3. Build

**DB** (migrations above the highest on develop — 20261022000610+; never edit an existing migration;
RLS on every table, service-role writes, admin read):
- `google_account` (single row): connected email, granted scopes, connected_at/by, last_error, status.
  Refresh token + OAuth client secret in **Vault** (`integration_secret_*` pattern); client id in
  `integration_config` (`GOOGLE_CLIENT_ID`), never in env for new settings.
- `google_teacher_calendars` (teacher_id → calendar_id, confirmed_by/at) and `google_student_files`
  (student_id → folder_id, attendance_sheet_id, summary_row_hint, confirmed_by/at).
- `google_sync_items` — one row per mirrored object: kind (`teacher_event` | `main_event` | `report_pdf` |
  `attendance_row` | `summary_row`), subject ids (lesson_id / report_id / student_id), google ids, content
  hash, state (`pending` | `synced` | `gone` | `failed` | `skipped`), attempts, last_error, dedup key
  unique (kind, subject) — the outbox; jobs are idempotent.
- settings: `google_sync_enabled` (default false), `google_sync_mode` (`dry_run` | `live`, default
  `dry_run`), `google_calendar_window_days` (default 60).

**API** — new module `apps/api/src/modules/google-sync/` (each file ≤ 150 lines, ≤ 3 params):
- OAuth: `GET /admin/google/connect` (redirect, scopes `calendar.events`, `drive`, `spreadsheets`,
  `openid email`, `access_type=offline`, `prompt=consent`, signed `state`), `GET /integrations/google/callback`
  (code → tokens → Vault), `POST /admin/google/disconnect`, `GET /admin/google/status`. The redirect URI
  is exactly `https://api.ayatalbayan.com/integrations/google/callback` (shown read-only in the UI so the owner
  can register it in the Google Cloud OAuth client); dev/e2e use the API base of that environment.
- `googleapis` (or `google-auth-library` + fetch) is a new API-only dependency (pnpm-lock); no mobile/native change.
- Discovery: list calendars named `آيات البيان — *` and the root folder «تقارير آيات البيان»; read the
  summary sheet to suggest student ↔ folder/sheet links; suggest teacher ↔ calendar by name. Nothing is
  used until an admin confirms the mapping (`PUT /admin/google/teachers/:id`, `PUT /admin/google/students/:id`).
- Producers enqueue `google_sync_items` on lesson create/update/cancel/status change (platform-origin only),
  and on report submit; a pg-boss job (and a daily reconcile at 05:00 Riyadh for the window) processes them.
  In `dry_run` it records the planned request (method, target, payload summary) and does nothing in Google.
- Calendar writes: one single event per lesson (no series), teacher calendar + main calendar copy, the
  formats of §1 (title, description lines, location, 30-min popup), tz `Asia/Riyadh`; unmapped teacher →
  main calendar copy only + an admin warning.
- Drive/Sheets writes: upload the platform's report PDF (existing report-pdf module output) to the student's
  folder; append the 13-column row; upsert the summary row (§2.6); for a student with no folder yet, create
  folder `<student>` under the root, an attendance sheet `سجل حضور — <student>` with the header and the
  Brand styling (§1), and a summary row.
- A `GoogleClient` port with a real `googleapis`-based adapter and a fake used by ALL tests; plus a small
  `tools/google-stub` HTTP stub (like tools/wa-stub) for e2e. No test or CI job ever calls Google.
- Reports: imported reports (`import_items.target_table = 'lesson_reports'`) are never exported.
- Rate limits/backoff (429/5xx retry with jitter, max attempts 5), token refresh, `invalid_grant` ⇒
  status `disconnected` + admin alert in the bell (no WhatsApp/push), never a crash loop.

**Web** — /admin/settings «التكاملات» gets a «Google» section (or the docs/23 module when it lands):
connection card (connect / disconnect / connected email / scopes), the two switches (sync on/off;
تجربة بدون كتابة / كتابة فعلية) with a confirmation that names the calendars and folders it will write into,
the teacher ↔ calendar and student ↔ folder mapping tables with suggestions and «تأكيد», and a log of the
last 100 sync items (state, target, error) with «إعادة المحاولة». Clear MSA Arabic in ar.json + en parity.
Mobile admin: read-only status card (connected, mode, last error) — no OAuth on mobile.

## 4. Safety

- Default OFF and `dry_run`. Going `live` is an owner action in the UI; nothing in a routine flips it.
- The OAuth client (Google Cloud project, consent screen) is created by the owner; the client secret and
  tokens are entered/obtained by the owner in the UI — never in chat, never in the repo (repo is PUBLIC).
- No calendar ids, folder ids, sheet ids or personal data in the repo or in logs beyond ids already stored
  in the DB; logs never print tokens.
- One-way: the platform never reads bookings from the sheet and never edits the script's rows/events.
- Staging holds REAL data: e2e uses the stub only.

## 5. Tests

Unit (next to the code): event formatting (title/description/location per status, trial, mirror lines),
origin filter (imported lessons never enqueued), idempotent outbox (dedup key, content hash ⇒ no-op),
gone-handling, dry-run recording, OAuth state signing/expiry, token refresh + invalid_grant, attendance row
mapping (13 columns), summary upsert recompute + matching by folder link then name, PDF name suffix rule,
mapping suggestions (Arabic normalisation), permission guards (admin only). e2e (Playwright + google-stub):
connect (stubbed OAuth), map one teacher + one student, book a lesson in the platform ⇒ dry-run item, switch
to live (stub) ⇒ events created on the stub; cancel ⇒ deleted; submit a report ⇒ PDF + row + summary.

## 6. As built (2026-10-22)

- **DB**: migrations `20261022000610_google_sync.sql` (tables, RLS, Vault functions `google_token_set/read/clear`,
  `GOOGLE_CLIENT_SECRET` in `integration_secret_key_ok`, the three settings rows OFF / `dry_run` / 60),
  `20261022000611_google_sync_outbox.sql` (`v_platform_origin_lessons`, `is_platform_report`, the queue functions,
  the lesson / report triggers that are the producers, `google_sync_claim`, `google_sync_requeue`,
  `google_sync_reconcile`) and `20261022000612_push_kind_google.sql` (bell kind `google_sync_alert`).
  The mapping tables carry no FK to students / teachers: `merge_students` deletes the merged student and
  `clear:demo` refuses cascades into its tables.
- **Worker**: in-process and single-flight like the report-PDF job (not pg-boss): the claim is a row-locked
  compare-and-set with a claim token, so a second instance only shares the work; poll 60 s (`GOOGLE_SYNC_POLL_MS`
  in e2e), daily reconcile 05:00 Riyadh, kicked after every admin action. The worker re-checks the origin, so a
  lesson queued during an import run is never written.
- **OAuth**: `GET /admin/google/connect` answers `{ url }` (a browser redirect cannot carry the bearer); the web
  navigates there. Scopes add `calendar.calendarlist.readonly`: discovery cannot list the «آيات البيان — …»
  calendars with `calendar.events` alone. Dependency: `google-auth-library` (API only).
- **Settings** live in `public.settings` but outside the generic registry: they have their own switches with a
  confirmation in «التكاملات» → Google, so the generic form never flips `live`.
- **Formats**: the event / sheet texts of §1 and §2.3 are kept byte for byte in
  `apps/api/src/modules/platform/google-sync/google-format.ts` (a data format shared with the script, not UI copy).
- **Students**: nothing is written for a student until an admin confirms an existing folder (from the summary
  sheet's suggestion or a pasted link) or «مجلد جديد»; the Drive root must be confirmed too.
- **e2e**: `tools/google-stub` (port 4120) answers OAuth (auto-consent), Calendar v3, Drive v3 and Sheets v4.
