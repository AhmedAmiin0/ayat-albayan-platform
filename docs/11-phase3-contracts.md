# 11 — Phase 3 contracts: reports, subscriptions, payments, payouts, dashboard

This is the single source for the Phase 3 builders, so they can work in parallel without guessing each other's shapes. Requirement IDs: **R-REP-01..05, R-SUB-01..03, R-PAY-01/02, R-TCH-03/04, R-RPT-01..03, R-MOB-02** (record payment with camera). Issues: **A5, A7, D1, D2, E1, E3, E4, B5**. Foundation commit: «Phase 3 foundation: reports/money schema, storage, shared rules, contracts».

**Hard rules (CI fails otherwise):**
- ≤ 150 lines per file. Blank lines and comments count. Split into service / queries / mapper, one component per file, and tests split by scenario.
- ≤ 3 params per function. Use an options object for more.
- Strict TS: no `any`, no `!`.
- Unit tests go beside the code, in the same change. Pure logic needs ≥ 80 % coverage.
- Arabic text lives only in `packages/shared/i18n/ar.json`.
- UTC in the DB and an IANA tz on every person. No free-text times.
- Idempotent jobs, with dedup keys.
- RLS plus Nest guards.
- Never fake data. Never invent prices or policy: an unknown policy becomes a setting that defaults to OFF.

Phase 2's conventions (docs/10 §3) still apply unless this file says otherwise. They cover casing, errors, guards and time formats.

## 1. Who owns what

| Area | Owner | Edits only | Migrations |
|---|---|---|---|
| Foundation (done, **read-only**) | — | migrations `120–124`; `packages/shared/src/{reports,money}/*`, `enums/finance.ts`, the Phase 3 entries in `status-style.ts`; `apps/api/src/common/{storage,events,settings}/*`; `app.module.ts`; `e2e/support/*` | `20261001000120–124` |
| Reports API | **B1** | `apps/api/src/modules/reports/**` (also mounts `GET /lessons/:id/report-form`, `GET /students/:id/reports`, `GET /teachers/me/pending-reports`) | `2026100100013x` |
| Report PDF job | **B2** | `apps/api/src/modules/report-pdf/**` (template, fonts, renderer, job) | `2026100100014x` |
| Money API | **B3** | `apps/api/src/modules/{subscriptions,payments,payouts}/**` (also mounts `GET /students/:id/balance`, `/admin-tasks`, `GET /teachers/me/payouts`) | `2026100100015x` |
| Dashboard, exports, expenses | **B4** | `apps/api/src/modules/{dashboard,exports,expenses}/**` | `2026100100016x` |
| Web | web builder | `apps/web/src/features/{reports,subscriptions,payments,payouts,expenses,dashboard,exports}/**`, the pending-reports card in `features/teacher/**`, the routes, and e2e journeys 2 and 3 | — |
| Mobile | mobile builder | `apps/mobile/src/payments/**` (R-MOB-02 record payment + camera receipt) and the package line on the Today card | — |

- `app.module.ts` already registers the empty modules: `ReportsModule`, `ReportPdfModule`, `SubscriptionsModule`, `PaymentsModule`, `PayoutsModule`, `ExpensesModule`, `DashboardModule` and `ExportsModule`. It also registers the global `StorageModule` and `LessonEventsModule`. Fill your own module file and never touch `app.module.ts`.
- `ar.json`: add keys **only inside your namespace** and never rename existing ones. The namespaces are:
  - `reports` (B1, B2, web)
  - `subscriptions`, `payments` (including `payments.mobile`), `payouts` (B3, web, mobile)
  - `expenses`, `dashboard`, `exports` (B4, web)

  The `nav.*`, `enums.*` and `dashboard.task.*` keys are already in place.
- Reuse by import, don't copy:
  - `parseOrThrow`, `orNotFound`, `dbError`, `sentOnly`, `pageQuerySchema` and `Page<T>` from `modules/teachers/http.ts`
  - `badRequest`, `conflict` and `errorCode` from `modules/scheduling/errors.ts`
  - `zonedToUtc`, `localDay` and `weekdayOf` from `modules/teachers/availability/zoned-time.ts`
  - `TeachersQueries.idByProfile` (import `TeachersModule`)
  - `LessonStatusService` and `LessonViews` (import `LessonsModule`)
  - `outcomeChange` from `modules/lessons/outcomes.ts`
  - `PricingService` (import `PricingModule`, which exports it)
  - `FxService` (import `FxModule`)
  - `AuditService`, `SettingsService`, `StorageService` and `LessonEvents` (all global)

## 2. Data model (migrations 120–124)

- **`lesson_reports`** (120):
  - Keys: `lesson_id` and `student_id`, with a composite FK to `lesson_students` (`on delete cascade on update cascade`, so the student must be on the lesson). Also `teacher_id`.
  - Content: `attendance`, the text fields `recited | new_memorization | revision | theory`, `grade_recitation | memorization | revision | tajweed | engagement | commitment | overall` (enum `grade`), `notes`, `homework` and `next_plan`.
  - State: `status report_status draft|submitted`, `version int` (0 = never submitted), `submitted_at` (the first submit), `edited_at`, `pdf_path`, `pdf_status pdf_status pending|rendering|ready|failed` (null = no PDF requested) and `pdf_error`.
  - Delivery: `sent_at`.
  - Constraints: **`unique (lesson_id, student_id)`** (R-REP-04, A7). Check: a submitted report has attendance, `submitted_at` and `version ≥ 1`.
- **`lesson_report_versions`** `(report_id, version, snapshot jsonb, created_by, created_at)`, `unique (report_id, version)`.
- **`report_attachments`** `(report_id, storage_path unique, mime, size)`.
- **`subscriptions`** (121):
  - Columns: `student_id`, `package package_size null`, `duration`, `lessons_total`, `price numeric(12,2)`, `currency`, `fx_rate`, `fx_date`, `price_source jsonb`, `starts_on date`, `status subscription_status`, `renews_on` and `notes`.
  - `package` is null for a custom count, and is never `'trial'`.
  - `starts_on` is a local day in the student's tz.
  - `price_source` holds the `QuoteResponse`.
  - `status` defaults to `'unpaid'`.
- **`payments`** `(subscription_id, amount numeric(12,2) > 0, currency, method payment_method bank|wallet|cash|other, paid_at, receipt_path, recorded_by, note)`.
- **`expenses`** `(month date, the 1st, category expense_category ads|content|tools|operations|other, amount, currency default 'EGP', note)`.
- **`teacher_payouts`** `(teacher_id, month date (the 1st), lessons_count, amount, currency 'EGP', status payout_status draft|approved|paid, approved_at/by, paid_at/by, breakdown jsonb)`, `unique (teacher_id, month)`.
- **`admin_tasks`** (124) `(kind admin_task_kind renewal_due|subscription_unpaid, subject_type, subject_id, title null, due_at, done_at, done_by, dedup_key unique)`.
- **Views** (123):
  - **`v_package_lessons`** `(student_id, lesson_id, starts_at, n)` lists every lesson that consumes a unit.
  - **`v_subscription_balance`** `(subscription_id, student_id, lessons_total, lessons_used, remaining, is_last, ended_at, projected_end_at)`.
  - Both are `security_invoker`, and only `service_role` may select them: under a teacher's or guardian's RLS they would give partial numbers. Read them in the API only.
- **Balance rules** (`v_package_lessons`; mirrored by `@ab/shared` `consumesPackage` and `subscriptionBalances`, whose tests pin both): a lesson consumes one unit for a student when all four hold:
  1. `lesson_students.chargeable` is true;
  2. the lesson status is `completed | late | no_show | excused`;
  3. its rule's package is not `'trial'` (the trial is free);
  4. its local date in the student's tz is on or after the student's first `starts_on`.

  Units fill the student's packages **FIFO**, ordered by `(starts_on, created_at, id)`. Overflow lands on the newest package, whose `remaining` then goes negative. So an early renewal starts only once the previous package is used up, and the end date follows real lessons (R-SUB-03, B5):
  - `ended_at` is the start of the lesson that used the last unit.
  - `projected_end_at` is the booked lesson that would use it.
- **Settings** (123), read through `SettingsService.all()` (one query, defaults filled):

  | Key | Default | Meaning |
  |---|---|---|
  | `renewal_alert_remaining` | 2 | R-SUB-02 |
  | `flag_future_lessons_when_unpaid` | true | R-SUB-02 |
  | `report_teacher_edit_hours` | 24 | R-REP-02 |
  | `reporting_currency` | `'SAR'` | R-RPT-02 |
  | `payout_count_late` | false | R-PAY-02, owner question |
  | `payout_count_no_show` | false | R-PAY-02, owner question |

  `PATCH /settings` takes the camelCase keys, as in `settingsUpdateSchema`.
- **Storage** (122, private buckets): paths are built only by `apps/api/src/common/storage/storage.paths.ts`.

  | Bucket | Path | Who writes | Limit |
  |---|---|---|---|
  | `reports` | `{student_id}/{lesson_id}.pdf` | PDF job (service role), overwrite | 10 MB, PDF |
  | `report-attachments` | `{report_id}/{uuid}.{ext}` | teacher/admin via signed upload URL | 25 MB, image/PDF/audio |
  | `receipts` | `{subscription_id}/{uuid}.{ext}` | admin via signed upload URL (web, mobile camera) | 10 MB, image/PDF |

  `storage.objects` policies:
  - admin: all, on the three buckets;
  - teacher: reads own report PDFs, and reads and inserts own attachments;
  - guardian: reads own children's submitted report PDFs and attachments.
- **RLS**: admin all on every new table.
  - Teacher reads own reports, their versions and attachments, and own payouts.
  - Guardian reads own children's submitted reports and attachments, subscriptions and payments.
  - `anon` has no privileges. `authenticated` has `SELECT` only, so the API (service role) is the only writer, as in migration 110.

## 3. Conventions (additions)

- **Money:** numbers with ≤ 2 decimals (`moneyAmount`); `currency` is ISO 4217 upper case; teacher money is always EGP.
- **Months:** `YYYY-MM` in routes and queries (`monthParam`), stored as the first day (`monthStart`). A lesson's month is its local date **in the teacher's tz**, for payouts.
- **Ranges:** `?from&to` are local days in **Asia/Riyadh**, inclusive, at most a year (`dateRangeQuery`). Convert with `zonedToUtc(from, '00:00', 'Asia/Riyadh')` and `zonedToUtc(to + 1 day, …)`, half-open.
- **Signed URLs:**
  - Downloads last 1 h for the UI and 7 days for a WhatsApp document (`SIGNED_URL_SECONDS`).
  - Uploads return `SignedUpload { bucket, path, token, signed_url }`. The client calls `supabase.storage.from(bucket).uploadToSignedUrl(path, token, file)` with the anon client, or PUTs to `signed_url`, then registers the path with the API.
  - The API checks `isPathOf(path, owner)` and `StorageService.exists` before storing a client path (400 `receipt_path` / `attachment_path`).
- **Errors:** `{ code, message: code, …details }`, as in Phase 2. Every code a client can see has an `ar.json` line in that feature's `error` object.
- **Audit (R-NFR-03):** `AuditService.record` on every report submit or edit (`lesson_reports`: `submit` | `edit`), every subscription/payment/expense/payout write (`create` | `update` | `delete` | `approve` | `pay` | `generate`), and task done. RPC writes put the audit row in the same transaction (Phase 2 invariant 6).
- **Lesson changes → alerts:** `LessonStore.commit`, which covers Phase 2's status, cancel and reschedule paths, calls `LessonEvents.changed(lessonIds)` after the commit. B3 subscribes in `onModuleInit` (`events.onChanged(ids => alerts.evaluateLessons(ids))`). **B1 calls `LessonEvents.changed([lessonId])` after a submit**, including when the lesson already had an outcome.

## 4. Reports (B1; R-REP-01/02/04/05, R-TCH-03, issues A5, A7, D1, D2)

| # | Route | Guard | Input | 2xx | Errors |
|---|---|---|---|---|---|
| R1 | `GET /lessons/:id/report-form` | admin, teacher (own lesson) | — | `ReportFormResponse` | 404 `lesson_not_found`, 403, 409 `lesson_cancelled` |
| R2 | `PUT /reports/:id/draft` | admin, teacher (own report) | `reportDraftSchema` | `ReportView` | 404, 403, 409 `already_submitted` |
| R3 | `POST /reports/:id/submit` | admin, teacher (own) | `reportSubmitSchema` | `ReportView` | 400 `validation_failed` (`missing_attendance`, `missing_grades`); 409 `lesson_cancelled`, `not_started`, `version_conflict`, `edit_window_closed`; 403 |
| R4 | `GET /reports/:id` | admin, teacher (own) | — | `ReportView` | 404, 403 |
| R5 | `GET /students/:id/reports?page&pageSize` | admin; teacher if the student is theirs (`students.teacher_id` or a lesson with them) | page | `StudentReportsResponse` | 404, 403 |
| R6 | `GET /reports/:id/pdf` | admin, teacher (own) | — | `SignedDownload` (1 h) | 409 `pdf_not_ready` |
| R7 | `POST /reports/:id/attachments/upload-url` | admin, teacher (own, `canEditReport`) | `attachmentUploadSchema` | `SignedUpload` | 400 `attachment_type`, `attachment_too_large`; 409 `edit_window_closed` |
| R8 | `POST /reports/:id/attachments` | same | `attachmentRegisterSchema` | 201 `ReportAttachmentView` | 400 `attachment_path` |
| R9 | `DELETE /reports/:id/attachments/:attachmentId` | same | — | 204 (row + object removed) | 404 |
| R10 | `GET /reports/:id/attachments/:attachmentId/url` | admin, teacher (own) | — | `SignedDownload` | 404 |
| R11 | `GET /teachers/me/pending-reports` | teacher | — | `PendingReportView[]` (oldest first) | 404 `teacher_not_linked` |
| R12 | `POST /reports/:id/pdf/retry` | admin | — | `ReportView` (`pdf_status = pending`) | 409 `pdf_not_failed` |

- **R1:**
  - A cancelled or moved lesson → 409 `lesson_cancelled`; no rows are created.
  - Otherwise it ensures one draft row per `lesson_students` row (`insert … on conflict (lesson_id, student_id) do nothing`, `teacher_id = lesson.teacher_id`; idempotent) and returns one entry per student:
    - `lesson_no`: `v_lesson_sequence.seq`, or the student's completed lessons before this one + 1;
    - `package`: the student's newest `v_subscription_balance` row, or null.
  - A draft's `attendance` is prefilled from `lesson_students.attendance` when the teacher already marked it (journey 2: mark attendance, then report).
  - `submit_block` = `reportBlock(...)`. The identity fields come only from the lesson (R-REP-01, D1).
- **R2:** writes only the sent fields (`sentOnly`), with last-write-wins autosave. A submitted report is edited through R3 only: the form drops autosave and shows «حفظ التعديل».
- **R3** runs in **one transaction**: B1's RPC `submit_report` calls `apply_lesson_changes` inside it, or does the same writes.
  1. Lock the report. `expectedVersion ≠ version` → 409 `version_conflict`. If the report is submitted and `!canEditReport({ role, submittedAt, now, hours: settings.report_teacher_edit_hours })` → 409 `edit_window_closed`.
  2. `reportBlock({ lessonStatus, lessonStartsAt, now })` → 409 `lesson_cancelled` / `not_started`.
  3. Write the fields, `status = 'submitted'`, and `nextVersion(...)` → `version`, `submitted_at`, `edited_at`. Set `pdf_status = 'pending'` and `pdf_error = null`.
  4. Insert `lesson_report_versions(version, snapshot = the row after the update)`, plus the audit row.
  5. Lesson outcome (R-REP-03 «mark lesson completed»), with event = `ATTENDANCE_EVENT[attendance]`:
     - **Open lesson** (`scheduled | confirmed`): the change is `outcomeChange({ lesson, to: applyLessonEvent(status, event), event, students: [{ studentId, event }], now, lateCancelHours })`. Other students of a group lesson follow the lesson-wide event until their own reports arrive.
     - **Lesson already has an outcome**: only this student's `lesson_students` row is synced: `attendance`, and `chargeable = isChargeable({ status: LESSON_EVENT_TARGET[event], startsAt, at: now, lateCancelHours })`, when it differs. The report is the source of truth for its student.
  6. After the commit, call `LessonEvents.changed([lessonId])`, which updates the balance and fires alerts.

  A resubmit re-renders the PDF at the same path. It does **not** re-send WhatsApp: `report_ready` is deduped per report (TODO(R-REP-03) owner).
- **R5:** `items` are submitted reports, newest first, paginated. `series` is every submitted report of the student, oldest first, mapped with `gradeScore` (R-REP-05, D2).
- **R11:** this teacher's lessons with `starts_at ≤ now`, status open or outcome, and not cancelled or moved, where some student has no **submitted** report. One row per (lesson, student), `report_id` included when a draft exists. Dashboard `pending_reports` counts the same rows for every teacher.

## 5. Report PDF + delivery (B2; R-REP-03, docs/07 §13)

- **The job** polls every minute, plus once at boot.
  - Claim: `update lesson_reports set pdf_status = 'rendering' where id = $1 and pdf_status = 'pending'`, compare-and-set, one instance at a time.
  - Render the HTML template (docs/07 §13: one A4 page, light tokens, self-hosted Amiri and Plex, `document.fonts.ready`) with headless Chromium. Use `playwright-core`; Chromium comes from the Playwright install.
  - Upload to `reports/{student_id}/{lesson_id}.pdf` (`StorageService.upload`, upsert), then set `pdf_path` and `pdf_status = 'ready'`.
  - On an error: `pdf_status = 'failed'` and `pdf_error` = the message (admin retry: R12).
- **Template content:**
  - Header: the emblem and the «تقرير الحلقة» cartouche.
  - The meta grid (student and code, teacher, program, date, time with zone and duration, «رقم الحلقة {n} من {total}»).
  - Attendance, the four «اللي اتعمل» fields, the 6 rubrics plus overall (pips and word), notes, homework and the next plan.
  - Footer: `packageProgress(...).remainingLabel` and «اتبعت على الواتساب …».
  - Strings from `ar.reports.*` and `ar.enums.*`.
  - File name: `AB-0183_2026-09-29_تقرير-الحلقة.pdf` (`reports.pdfFileSuffix`).
  - Tests: an HTML snapshot test, plus a PDF smoke test (bytes > 0, one page).
- **Delivery queue:** after `ready`, insert one `messages` row (R-REP-03, R-MSG-01):
  - routing: `direction 'outbound'`, `status 'queued'`, `scheduled_for = now`, `phone_e164` = guardian phone, `guardian_id`, `lesson_id`;
  - `template_key 'report_ready'`;
  - `template_params = { "1": <student name>, "2": lessonWhenText(starts_at, guardian.tz), "document": { "bucket": "reports", "path": <pdf_path>, "filename": <file name> } }`;
  - `dedup_key = 'report_ready:{report_id}'`.

  The Phase 4 sender signs the document URL (7 days) at send time and sets `lesson_reports.sent_at`. TODO(R-MSG-01): `{{1}}` and `{{2}}` against the approved template.

## 6. Subscriptions + balance + alerts (B3; R-SUB-01/02/03, issues E1, B5)

| # | Route | Guard | Input | 2xx | Errors |
|---|---|---|---|---|---|
| S1 | `GET /subscriptions?status&studentId&page&pageSize` | admin | query | `Page<SubscriptionView>` | 400 |
| S2 | `POST /subscriptions` | admin | `subscriptionCreateSchema` | 201 `SubscriptionView` | 404 `student_not_found`, 503 `fx_unavailable` |
| S3 | `GET /subscriptions/:id` | admin | — | `SubscriptionView` | 404 |
| S4 | `PATCH /subscriptions/:id` | admin | `subscriptionUpdateSchema` | `SubscriptionView` | 404 |
| S5 | `DELETE /subscriptions/:id` | admin | — | 204 (only without payments) | 409 `has_payments` |
| S6 | `GET /students/:id/balance` | admin; teacher (own student) | — | `StudentBalanceView` | 404 |
| S7 | `GET /admin-tasks?open=true&page&pageSize` | admin | query | `Page<AdminTaskView>` | — |
| S8 | `POST /admin-tasks/:id/done` | admin | — | `AdminTaskView` | 404 |

- **S2 (never a typed price):**
  1. `country = pricing.country ?? guardian.country`.
  2. `PricingService.quote({ ...pricing, country, students: 1 })` → `QuoteResponse`.
  3. Store:
     - `package = TIER_PACKAGE_SIZE[tier]` (null for `count`)
     - `lessons_total = quote.lessons`
     - `duration = quote.duration`
     - `price = quote.afterDiscount`
     - `currency = quote.currency`
     - `fx_rate` / `fx_date` from `quote.fx`
     - `price_source = quote`
  4. Status `subscriptionStatusFor({ current: 'unpaid', paid: 0, price, remaining, superseded: false })`, so price 0 → active. Then recompute the student's older packages (one may now be `expired`) and run the alerts.
- **S4:** `paused: true` → `paused`. `paused: false` → `subscriptionStatusFor` with the current numbers.
- **Statuses** are always written through `subscriptionStatusFor({ current, paid (sum of payments in the package currency), price, remaining (its v_subscription_balance row), superseded (a newer package exists) })`. Recompute after a payment write, a package create/delete, and every alerts evaluation.
- **Alerts (R-SUB-02):** `SubscriptionAlertsService.evaluateStudents(ids)` (and `evaluateLessons(lessonIds)` → their students). For each student:
  1. Compute `remaining = studentRemaining(balances)`, then `alert = alertFor({ remaining, threshold: settings.renewal_alert_remaining, status: newest.status })`.
  2. On `renewal`:
     - insert `admin_tasks (kind 'renewal_due', subject_type 'subscription', subject_id = newest.id, dedup_key = alertDedupKey('renewal', newest.id))`, `on conflict (dedup_key) do nothing`;
     - queue `messages`: `template_key 'renewal_due'`, `template_params { "1": student name, "2": packageProgress label }`, `dedup_key` the same key, and the guardian phone.
  3. On `unpaid`: the newest package's status becomes `unpaid` (via `subscriptionStatusFor`), plus the `subscription_unpaid` task (no WhatsApp: there is no approved template, TODO(R-MSG-01)).
  4. A **sweep job** runs every 15 min over students with any package, using the same evaluation. Dedup keys make every run idempotent (rule 8).
- **Flagged lessons:**
  - When `flag_future_lessons_when_unpaid` is on, the lesson views mark a student's future open lessons while that student's newest package is `unpaid` and `remaining ≤ 0`. Nothing is ever cancelled.
  - B3 exports `BalanceQueries.unpaidStudentIds(studentIds)`.
  - The web schedule, teacher card and mobile Today show `subscriptions.unpaidFlag`. The chip is computed at read time, nothing is stored.
  - TODO(R-SUB-02): the `LessonView` field (`students[].unpaid`) is added by B3 in `LessonViews` (allowed edit, `modules/lessons/lesson-views.ts` only).

## 7. Payments (B3; R-PAY-01, R-MOB-02)

| # | Route | Guard | Input | 2xx | Errors |
|---|---|---|---|---|---|
| P1 | `GET /payments?subscriptionId&studentId&from&to&page&pageSize` | admin | query | `Page<PaymentView>`, `paid_at` desc | 400 |
| P2 | `POST /payments` | admin | `paymentCreateSchema` | 201 `PaymentView` | 404 `subscription_not_found`; 400 `currency_mismatch` (+ `currency`), `paid_at_future`, `receipt_path`, `attachments_not_allowed`, `attachment_path` / `attachment_type` (+ `path`); 409 `attachment_in_use` (+ `path`). Same for `POST /sales/payments` |
| P3 | `GET /payments/:id` | admin | — | `PaymentView` | 404 |
| P4 | `PATCH /payments/:id` | admin | `paymentUpdateSchema` | `PaymentView` | 404, 400 (incl. `attachments_not_allowed`: a payment with files cannot leave `bank`); 409 `attachment_in_use` (a receipt another payment holds) |
| P5 | `DELETE /payments/:id` | admin | — | 204 | 404 |
| P6 | `POST /payments/receipt-upload-url` | admin | `receiptUploadSchema` | `SignedUpload` (bucket `receipts`, `receiptPath(...)`) | 404, 400 `receipt_type`, `receipt_too_large` |
| P7 | `GET /payments/:id/receipt` | admin | — | `SignedDownload` | 404 |
| P8 | `GET /payments/:id/attachments` | `payments.read` | — | `PaymentAttachmentView[]` (legacy `receipt_path` first, then the rows; signed 1 h; a missing object is skipped and logged) | 404 |

- **«المرفقات» (owner 2026-10-12, docs/16 row 25).** P2 and `POST /sales/payments` take `attachments: string[]` (0..5, optional), ONLY when `method = 'bank'` (400 `attachments_not_allowed`). Each path is uploaded through P6 (or, for sales, her scoped upload URL / `receipt-from-chat`) and must be the package's folder, exist and be byte-sniffed to an image or PDF (400 `attachment_path` / `attachment_type`). Rows in `payment_attachments` (migration `20261012000431`: unique path, `on delete cascade`, a trigger checks the folder, RLS admin read + sales read of the payments she recorded, API-only writes), written after the payment (idempotent per path: a replayed `clientRequestId` adds nothing twice). P5 also removes the files (best effort). `receipt_path` is untouched and shown first by P8. P4 (edit) does not change attachments. One file, one payment: a path (row or `receipt_path`) another payment already holds is 409 `attachment_in_use`. Backstop: migration `20261012000432` holds the bank-only rule, the 5-file cap and «a payment with files stays `bank`» in the database too (row lock per payment). Files are saved right after the insert, before the audit and follow-ups, and never turn a booked payment into an error (a failure is logged). Replay / race (same `clientRequestId`, rule 8): a retry that finds its payment, a send that loses the insert race, and (P2) a send refused by any pre-insert check (files, invoice and `invoice_used`, conversion, `refund_exceeds_paid`) while another send of the form booked it all answer 201 with that payment, re-run its follow-ups (`MoneyWrites.replayed`) and save the form's new paths on it best effort (bank rows only, same package, at most 5, each re-checked; never an error); with no such payment the error stands (404 `payment_not_found` for a lost race whose winner is gone).
- v1 rule: `payment.currency === subscription.currency`, else 400 `currency_mismatch` (TODO(R-PAY-01) owner: payments in another currency).
- `recorded_by = user.id`. Every write is audited and recomputes the package status. Journey 3: a full payment → `active`.
- Mobile (R-MOB-02): pick the student, then the package (S1 `studentId`), amount and method, then the camera (`expo-image-picker` / `expo-camera`) → P6 → `uploadToSignedUrl` → P2. Strings are in `payments.mobile.*`.
- **Trial → «مشترك» on payment (owner 2026-10-12).** When a payment (`kind = 'payment'`, amount > 0) is recorded on a package by ANYONE (the admin's P2 or the salesperson's `POST /sales/payments`), a student whose `students.status` is still `trial` becomes `active` in the same API flow (`MoneyWrites` → `MoneyFollowUps` → `StudentActivation`): compare-and-set on `status = 'trial'` (idempotent), audited as `students` / `status_change` with the recorder as actor and `after = { status: 'active', via: 'payment', payment_id }`. `paused` and `churned` are never changed automatically, a refund never activates. A retried form (same `clientRequestId`) whose payment is already recorded re-runs the follow-ups and the recompute (`MoneyWrites.replayed`, no second audit row of the payment): a flip lost to a failure after the insert is applied on the retry. Distinct from the package status above (`subscriptions.status`, a full payment → `active`).
- **Deleting that payment reverts the flip (owner 2026-10-12).** P5 (`PaymentsService.remove` → `MoneyWrites` → `MoneyFollowUps` with the full `before` row) of a positive `kind = 'payment'` row runs `StudentDeactivation`, ONLY when the student's newest `status_change` audit row is the automatic flip by THIS payment (`via = 'payment'`, same `payment_id`): a status set by hand afterwards, or a flip by another payment, wins. Target: no positive payment left → `trial`; another remains → as computed by the rule below (`active`, or `pending_renewal` when the subscription has ended). Compare-and-set on the current status, audited with the deleting admin as actor (`via = 'payment_deleted'`, `payment_id`), idempotent (a second call finds the newest row is no longer the flip). P4 (edit) and refunds never change the student status.
- **«بانتظار التجديد» (`pending_renewal`, owner 2026-10-12, R-STU-05).** A student whose subscription has ENDED — a package (trial packages aside) has its lessons used up OR its `renews_on` before today in the student's tz, and no package is still running and fully paid (or paused by hand) — moves `active` → `pending_renewal`; once a package runs again (a renewal payment that makes it fully paid, or the admin extending `renews_on`) it moves back `pending_renewal` → `active`. `subscriptionEnded` (`student-renewal.plan.ts`) reads the payments and balances, never the stored package statuses, so a renewal created but not fully paid keeps the student pending, and a first package paid in part (nothing ended yet) does not. `StudentRenewal.apply` runs right after every package status recompute (`SubscriptionAlertsService.evaluateStudents`: every money write, every lesson change, the 15-minute sweep `AlertsJob`), compare-and-set + audit: `via = 'subscription_ended'`; back to active `via = 'payment'` + `payment_id` (a payment create), else `via = 'subscription_renewed'`. Never touches `trial`, `paused` or `churned` (the trial → active flip above is separate). Manual PATCH wins until the next automatic event: the sweep leaves a status the admin set by hand (newest `status_change` without `via`) unless a renewal date passed on or after the day of that change; a money write or a lesson change applies the rule. Migration `20261012000400` adds the enum value (alone in its migration).
- **Where `pending_renewal` counts (owner 2026-10-12, R-STU-05).** It is a CURRENT student of the teacher (`CURRENT_STUDENT_STATUSES = trial, active, pending_renewal`, `isCurrentStudent`): teacher loads (`TeachersQueries.loads`, booking teacher-options, all-teachers calendar), dashboard teacher load, `GET /teachers/me/students` «مشتركون» list (with its own chip, web + mobile), admin teacher panel default view, sales teacher lists, «needs a teacher» note; teacher-me has no status filter. It is NOT «مشترك»: `countByKind` / `splitByStatus` / `active_count`, the dashboard «مشترك» KPI and the مشترك/تجريبي switches count `active` only, so it appears under «الكل» and in the admin status chips, filters and pickers (built from `STUDENT_STATUSES`). Never a trial: `familyChatViaSales` and the SQL trial-chat rule (`teacher_thread_phones`, `s.status <> 'trial'`, migration 20261007000001) let the teacher keep the family chat. No SQL view or function needed a change (`admin_list_users`'s status is the login status; `v_student_list` passes the status through; teacher pay reads lessons, not the student status).
- **Salesperson's transfer (owner 2026-10-12, docs/16 rows 16–22).** `POST /sales/payments` reuses P2 (`PaymentsService.create`, `recorded_by` = her) with `kind = 'payment'` and `method = 'bank'` forced, the receipt optional (owner 2026-10-12; it was required before) and her student only, in the PACKAGE currency only (400 `currency_mismatch` + `currency` before any insert; fx never runs on her path); it counts at once (no admin confirmation). The admin corrects or deletes a wrong one with P4/P5.

## 8. Payouts (B3; R-PAY-02, R-TCH-04, issue E3)

| # | Route | Guard | Input | 2xx | Errors |
|---|---|---|---|---|---|
| Y1 | `GET /payouts?month=YYYY-MM` | admin | `monthQuery` | `PayoutView[]` by teacher name | 400 |
| Y2 | `POST /payouts/:month/generate` | admin | — | `PayoutGenerateResult` | 400 `invalid_month` |
| Y3 | `POST /payouts/:id/approve` | admin | — | `PayoutView` | 404, 409 `invalid_transition` |
| Y4 | `POST /payouts/:id/pay` | admin | `payoutPaySchema` | `PayoutView` | 404, 409 `invalid_transition` |
| Y5 | `GET /teachers/me/payouts?month?` | teacher | — | own `PayoutView[]`, newest month first | 404 `teacher_not_linked` |

- **Y2**, per active teacher:
  1. Window = the month in the teacher's tz.
  2. Lessons in the window with `status ∈ payoutStatuses({ countLate, countNoShow })` from settings; duration = `(ends_at − starts_at)` minutes.
  3. `payoutFor({ lessons: per-duration counts, rates: rate_30/45/60/90 })`.
  4. If `missingRates` is not empty, skip the teacher and list them in `missing_rates` (UI: `payouts.error.rate_missing`).
  5. Otherwise upsert the **draft** row on `(teacher_id, month)` with `breakdown { lines, lesson_ids, statuses }`. Approved and paid rows are never touched (frozen). A teacher with 0 lessons gets no row, and a stale draft is deleted.

  Re-running gives the same rows (idempotent).
- **Y3/Y4:** use `canTransitionPayout`. Approve sets `approved_at/by`; pay sets `paid_at` (body or now) and `paid_by`. Both are audited.
- **CSV:** `GET /exports/payouts.csv?month=` (B4, §9). Fastify can't route `/payouts/:month.csv`.

## 9. Expenses, dashboard, exports (B4; R-RPT-01/02/03, issue E4)

| # | Route | Guard | Input | 2xx | Errors |
|---|---|---|---|---|---|
| X1 | `GET /expenses?month=YYYY-MM` | admin | `monthQuery` | `ExpenseView[]` | 400 |
| X2 | `POST /expenses` | admin | `expenseCreateSchema` | 201 `ExpenseView` | 400 |
| X3 | `PATCH /expenses/:id` | admin | `expenseUpdateSchema` | `ExpenseView` | 404 |
| X4 | `DELETE /expenses/:id` | admin | — | 204 | 404 |
| D1 | `GET /dashboard/summary?from&to` | admin | `dateRangeQuery` | `DashboardSummary` | 400 `range_too_large` |
| C1 | `GET /exports/students.csv` | admin | — | `text/csv` | — |
| C2 | `GET /exports/lessons.csv?from&to` | admin | `dateRangeQuery` | `text/csv` | 400 |
| C3 | `GET /exports/payments.csv?from&to` | admin | `dateRangeQuery` | `text/csv` | 400 |
| C4 | `GET /exports/payouts.csv?month` | admin | `monthQuery` | `text/csv` | 400 |

- **D1 definitions.** Every count comes from a status, not a formula (R-RPT-01, F3):
  - `funnel`: leads created in the range, by current status.
  - `active_students`: `students.status = 'active'`.
  - `lessons_by_status`: lessons starting in the range.
  - `needs_confirmation`: `scheduled` lessons in `[now, now + 48 h)`.
  - `pending_reports`: the R11 query across all teachers.
  - `unpaid_subscriptions`: `subscriptions.status = 'unpaid'`.
  - `open_tasks`: `admin_tasks.done_at is null`.
  - `teacher_load`: per active teacher, the occupying lessons in the range and students with `teacher_id` = them in `trial | active`.
  - `finance`, all converted to `settings.reporting_currency`:
    - `revenue` = payments with `paid_at` in the range;
    - `teacher_cost` = the paid lessons in the range (`payoutStatuses`) × the teacher's rate (EGP); a lesson counted by an approved or paid payout uses the rate frozen in that payout's `breakdown` (verifier fix: a closed month keeps what was paid);
    - `expenses` = expenses whose month falls in the range's months;
    - `gross_margin = revenue − teacher_cost − expenses`;
    - `by_source`, per `guardians.source` (null → `unknown`):
      - `leads` / `converted` (`leads.source`, created in the range);
      - `revenue` (payments of students whose guardian has that source);
      - `teacher_cost` (a lesson's cost split equally between its students);
      - `gross_margin = revenue − teacher_cost`.

      Ad spend is shown as one total (expenses `ads`), not split by source.
  - **FX:** amount in C → SAR = `amount / rate(SAR→C)` (SAR itself is 1), then × `rate(SAR→R)`, using `FxService.rateSarTo(C)`. A payment on a package quoted in USD uses its quote's `subscriptions.fx_rate` for C → SAR instead (verifier fix: closed months stay stable); packages priced at the SAR base have no snapshot and use today's rate. A currency whose rate throws (`fx_unavailable`) is left out and listed in `fx_missing`. `fx_date` = the oldest rate date used.
- **CSV:** UTF-8 **with BOM** (Excel opens Arabic correctly), a header row from `ar.json`, and `Content-Disposition: attachment; filename="<name>-<range>.csv"`. Instants are written as local Riyadh `YYYY-MM-DD HH:MM`, and E.164 phones as-is. Streams or pages internally (R-NFR-08). Quote every field (RFC 4180). The payout CSV has one row per teacher plus its breakdown lines.

## 10. UI notes

- **Report form (web, teacher and admin):**
  - The identity block is read-only (`reports.identity`, `reports.readOnlyHint`).
  - Then attendance, the 4 text fields, the 6 rubric selects (`enums.grade`, with pips via `gradeStyle`), overall, notes, homework, next plan and attachments.
  - Autosave a draft (debounced, `reports.autosaving` / `draftSaved`) and submit. After the submit: `reports.editUntil {when}` or `editClosed`.
  - Reached from the lesson card «تسجيل الحضور» flow and from R11 «تقارير لسه ما اتكتبتش» on `/teacher`.
- **Student profile:** a reports tab (R5) with the grade chart (series) and the PDF links (R6). Balances and packages come from S6, with the `packageProgress` line on the students list, the mobile card and the PDF footer.
- **Money screens:**
  - `/admin/subscriptions` (create from the calculator inputs, which reuse the pricing form pieces; the price is shown, never typed: `subscriptions.priceHint`).
  - Payments with receipt upload.
  - `/admin/payouts` (month picker, generate, approve, pay, CSV).
  - `/admin/expenses`.
  - The `/admin` dashboard: a KPI strip per docs/07 §6, replacing `admin.homeEmpty`. A numeral turns saffron only when there is work behind it.
- **Design:** docs/07 rules apply. Green marks actions, gold is ornament, and saffron is only «دورك». Western digits. Status chips use the `reportStatusStyle`, `pdfStatusStyle`, `payoutStatusStyle` and `subscriptionStatusStyle` styles.
- **E2E journeys** (`e2e/support/money.ts`: `seedPackageStudent({ teacherId, paid, guardian, student })` after `resetAbrar()`):
  - **#2:** the teacher sees today's lesson (already started) → marks attendance → opens the report → submits. Expected:
    - `reportOf(lessonId)` is submitted with version 1;
    - the PDF reaches `ready`;
    - a `report_ready` message is queued (`queuedFor(guardianId)`);
    - `balanceOf(subscriptionId)` goes 3 → 2.
  - **#3:** the admin records the payment (P2) → `subscriptionStatus` becomes `active` → the lesson is completed → `tasksFor(subscriptionId)` has `renewal_due` and a `renewal_due` message is queued.

## 11. Open questions (TODO, do not decide in code)

- TODO(R-SUB-01): are lessons attended past a package charged to the next one (FIFO, implemented)? Do `late` and `no_show` consume a lesson, as `isChargeable` says today?
- TODO(R-PAY-02): are `late` and `no_show` lessons paid to the teacher? Settings `payout_count_late` and `payout_count_no_show` are both OFF.
- TODO(R-PAY-01): payments in another currency than the package's (now 400 `currency_mismatch`), and partial payments: is a package with part payment `unpaid` until paid in full?
- TODO(R-REP-03): is an edited report re-sent to the guardian? It isn't now (dedup per report).
- TODO(R-REP-02): are the rubric grades required when the student attended? They are now.
- TODO(R-MSG-01): `renewal_due` and `report_ready` template bodies and variables; no template exists for «unpaid».
- R-LES-03 (from Phase 2): does `late` count in the lesson number?

## 12. Per-session teacher earnings and payments (migrations 176–179)

Owner request: pay a teacher for each session from the admin, and let teachers see their money. A **ledger** sits beside the monthly statement (§8); the two never count a lesson twice.

### Tables (176)
- `teacher_session_earnings` — one row per counted lesson: `lesson_id` unique, `teacher_id`, `starts_at`, `minutes` (30/45/60/90), `rate`, `amount` (= the rate: one amount per lesson, R-PAY-02), `paid_amount`, `status` `earned | partially_paid | paid`. `paid_amount` is written only by the two RPCs below.
- `teacher_payments` — one transfer: `amount`, `paid_at`, `method`, `receipt_path` (bucket `receipts`, `{teacher_id}/{uuid}.{ext}`), `note`, `created_by`, `client_request_id` (unique), `payout_id` (unique; set when the payment came from a monthly payout).
- `teacher_payment_items` — `(payment_id, earning_id, amount)`, unique per pair: one payment covers several sessions; a session can be paid in parts.
- RLS: admin all; a teacher selects only their own rows (items through their earnings); `anon` nothing; no write grant to `authenticated` (the API is the writer).

### The ledger follows the lesson (177, trigger `lessons_sync_earning`)
| Lesson | Earning |
|---|---|
| `completed` (or `late` / `no_show` when `payout_count_late` / `payout_count_no_show` is on), length 30/45/60/90, teacher has that rate | inserted at the teacher's rate **now**; the rate is then frozen |
| corrected length (`PATCH /lessons/:id/time`) while **not fully paid** | follows: re-priced with the rate of the new length; status recomputed from `paid_amount` |
| corrected length once **fully paid** | frozen, nothing changes |
| stops counting (corrected report, cancelled…) with nothing paid | deleted |
| stops counting with part paid | `amount` cut to `paid_amount`, status `paid` (money out stays) |
| teacher rate set or changed later | `resync_teacher_earnings` fills missing earnings; existing ones keep their frozen rate |

`resync_teacher_earnings(teacher?)` (service role, `POST /teacher-earnings/resync`) re-applies the rule: use it after flipping the two `payout_count_*` settings. `planEarningSync` in `@ab/shared` is the unit-tested twin of the SQL decision.

### Recording a payment (178, `record_teacher_payment`)
`POST /teacher-earnings/:teacherId/payments { amount, method, paidAt, earningIds?, receiptPath?, note?, clientRequestId? }`. The API picks the sessions (the ticked `earningIds`, else every unpaid one) and spreads `amount` **oldest lesson first** (`allocatePayment`). Less than the total = a partial payment (the newest sessions stay untouched, one session can be part paid). More than the chosen sessions still owe = **409 `overpayment`**, never carried over. The RPC re-checks inside one transaction (rows locked in id order): `allocation_mismatch` / `allocation_invalid` (400), `earning_not_found` (404), `overpayment` (409). A repeated `clientRequestId` returns the payment already recorded (`replayed: true`) and pays nothing twice; the same id for another teacher is 409 `request_reused`.

### Monthly payouts × the ledger — the rule
**The ledger is the record of what was paid.**
1. Marking a payout **paid** (`POST /payouts/:id/pay`) first calls `settle_payout_in_ledger(payout, actor, paid_at)`: it pays, in one `teacher_payments` row (`payout_id`, method `other`), only what is **still outstanding** on the payout's `breakdown.lesson_ids`, once per payout (idempotent). Sessions already paid one by one are not paid again.
2. Approving a payout changes nothing in the ledger. Paying per session first, then the month, or the month first and then trying to pay those sessions per session (nothing outstanding: 409 `nothing_outstanding`) both end with each lesson paid exactly once.
3. An open payout (draft / approved) carries `ledger_paid`, the part of it the ledger already covered; the cash due is `amount − ledger_paid`. The web and mobile payout lists show it.
4. Backfill (179): earnings for every existing counted lesson, then every payout already `paid` is settled, so past months are not shown as owed again. The earning's `amount` follows the rate at backfill time; a month paid at an older rate is recorded as paid in full.

### Routes
| Route | Guard | Result |
|---|---|---|
| `GET /teacher-earnings/:teacherId` | admin | balance: `earned`, `paid`, `outstanding`, `overpaid` (paid above a corrected session, shown apart), session counts |
| `GET /teacher-earnings/:teacherId/sessions?status=earned\|partially_paid\|paid\|unpaid&page&pageSize` | admin | `TeacherEarningView` page, newest first |
| `GET /teacher-earnings/:teacherId/payments` | admin | `TeacherPaymentView` page |
| `POST /teacher-earnings/:teacherId/payments` | admin | `{ payment, replayed }` |
| `POST /teacher-earnings/:teacherId/receipt-upload-url` | admin | signed upload for `receipts/{teacher_id}/…` |
| `GET /teacher-earnings/payments/:id/receipt` | admin | signed download (1 h) |
| `POST /teacher-earnings/resync` | admin | `{ lessons }` |
| `GET /teachers/me/earnings`, `/sessions`, `/payments`, `/payments/:id/receipt` | teacher | the same views for the teacher behind the token; the id is never taken from the URL; 404 `teacher_not_linked`; another teacher's payment is 404 |

### Subscribed-only view and the 45-minute decision (migration 183) — superseded by §13
~~Balances, session lists and the payment allocation read `v_teacher_countable_earnings`: a session counts only when its lesson is not a trial and at least one student on it has `students.status = 'active'`.~~ Since 20261005000200 the view no longer reads the student's current status (§13.1). Decision: historical 45-min sessions were priced as 1 hour before 2026-10-03; `tools/scripts/fix-teacher-data.sql` re-prices them at `rate_60`, new lessons keep 45 min = `rate_45`.

### Screens
- Web: `/admin/teachers/:id/earnings` «مستحقات المعلم» (cards, sessions with ticks, pay dialog, history) linked from the teacher profile; `/teacher/earnings` «أرباحي» (was «مستحقاتي») (the existing teacher nav entry now points here; the monthly statements stay at `/teacher/payouts`, linked from it).
- Mobile: teacher More > «مستحقاتي» (read only; the monthly statements one tap in); admin More > المعلمين > teacher > «مستحقات» with ticks and «سجّل دفعة». No new native modules or dependencies (the receipt photo reuses `expo-image-picker`).

## 13. Finance re-managed (owner 2026-10-05, migrations 20261005000200–204)

### 13.1 One teacher-pay rule (200)
`public.lesson_counts_for_pay(status, rule_id)`: `completed`; `late` / `no_show` per `payout_count_late` / `payout_count_no_show`; a trial (rule package `trial`) only with the new setting **`payout_count_trials`** (default false). Never the student's current status, so history does not shrink when a student churns. `public.teacher_rate_for(minutes, r30, r45, r60, r90)`: a standard length takes its rate (none → unrated, the admin sets it); **any other length is pro-rated per minute from the nearest length the teacher has a rate for (ties → the longer), 2 decimals** (50 min at rate_45 = 70 → 77.78; closes TODO(R-PAY-02)). The ledger trigger uses both, so `teacher_session_earnings` is the truth; `v_teacher_payable_lessons` (counted lessons + any paid session, with the frozen ledger amount, null = no rate) feeds the monthly payout and the dashboard teacher cost; `v_teacher_countable_earnings` (same columns as 183) feeds balances, lists, allocation and `settle_payout_in_ledger`. A session with money paid always counts. Twins: `lessonCountsForPay`, `teacherRateFor` (`@ab/shared/money/pay-rule.ts`). Payout `breakdown.lines` are per (length, ledger amount), `duration` is any minutes.

### 13.2 Corrections (201)
| Route | Result |
|---|---|
| `POST /teacher-earnings/payments/:id/void {reason}` | `void_teacher_payment`: allocations reversed, each session re-judged; the payment stays (`voided_at`, `void_reason`), shown struck through; a payout it settled goes back to approved. 409 `already_voided` |
| `POST /payouts/:id/pay {paidAt?, method?, note?, receiptPath?}` | `pay_payout`: ledger settlement + status in one transaction; receipt in `receipts/{teacher_id}/…` (same upload URL as per-session pay) |
| `POST /payouts/:id/unpay {reason}` | paid → approved, its settlement voided |
| `POST /payouts/:id/reopen` | approved → draft (`PAYOUT_CORRECTIONS`) |
| `GET /payouts/:id/receipt` | signed download |

Only one live settlement per payout (`teacher_payments_payout_key … where voided_at is null`). Every RPC writes its audit row. A paid payout's `method` / `note` / `has_receipt` are also in the teacher's own `GET /teachers/me/payouts`.

### 13.3 Summary and receivables (202)
`GET /teacher-earnings/summary` (`v_teacher_earnings_summary`): per teacher earned / paid / owed / oldest unpaid session + totals (EGP). `GET /receivables`: packages with `price − net paid > 0`, days since `starts_on`, aging `0_30 | 31_60 | 61_90 | 90_plus`, totals per currency and one total in `reporting_currency` (`fx_missing` listed). Dashboard KPIs «مستحق للمعلمين» / «مستحق على الطلاب».

### 13.4 Payments (203)
`payments.kind payment|refund` (a refund is a positive amount counted against paid everywhere: package status, dashboard revenue, CSV as negative). Another currency is accepted when a rate exists: `amount`/`currency` are stored in the **package** currency, the sent amount in `original_amount`/`original_currency` with `fx_rate` (newest stored rate at `paid_at`, else today's; no rate → 400 `fx_unavailable`); replaces 400 `currency_mismatch`. `invoice_id` (unique): «سجّل كدفعة» records a payment from a booking invoice, whose file is then its receipt (400 `invoice_mismatch`, 409 `invoice_used`). A refund above the net paid is 409 `refund_exceeds_paid`. `GET /payments?…&method&kind` returns `totals` per currency. «مدفوع جزئيًا» is derived (`paymentState`), filter `GET /subscriptions?paid=partial` (unpaid packages with a payment). `GET /invoices/recent?from&to&page` lists every invoice with its `payment_id`.

### 13.5 Expenses (204)
`expense_categories` (key, label_ar, label_en, sort, active; seeded with the 5 old keys + rent, salaries, platform_fees, marketing_tools; `POST /expense-categories`, 409 `category_exists`); `expenses.category` is a key (FK). New columns `paid_on`, `vendor`, `method`, `receipt_path` (`receipts/expenses/…`, `POST /expenses/receipt-upload-url`, `GET /expenses/:id/receipt`), `recurring`, `is_draft`, `template_id`. «تكرار شهري»: `ExpensesJob` (every 6 h) calls `create_recurring_expense_drafts(next month)`, idempotent on `(template_id, month)`; a draft is not counted until `PATCH {isDraft:false}`. `GET /expenses?year=YYYY`, `GET /expenses/year?year` (12 months in the reporting currency, `fx_missing`). A category's audit row uses the admin's id as `entity_id` (`audit_log.entity_id` is a uuid; the key is in `after`).

### 13.6 CSV
`/exports/payments.csv` (+ `studentId`, `method`, `kind`; kind and original amount columns), `/exports/expenses.csv?month|year`, `/exports/teacher-ledger.csv?month&teacherId?` (sessions block, then payments; a voided payment counts 0), `/exports/receivables.csv`.

### 13.7 Screens
AdminNav «المالية»: المدفوعات, الاشتراكات, مستحقات المعلمين, المصروفات, الفواتير, مستحق على الطلاب, الملخص المالي (`/admin/finance`: a year's revenue − teacher cost − expenses = net by month, converted). Teacher nav: «أرباحي» `/teacher/earnings`, «كشوف الشهر» `/teacher/payouts` (sm and up; one tap in on the phone bar).
