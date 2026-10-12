# 03 — System Requirements

Product name (working): **Ayat Al-Bayan Academy Platform**. Arabic-first UI (RTL), clear Modern Standard Arabic in the UI (owner, 2026-10-03: no Egyptian dialect; WhatsApp templates already approved by Meta keep their text until resubmitted), English code.

Decisions already taken with the owner (2026-10-01):
- Mobile app (Expo) is for **Admin** only in v1 (teachers & parents use the web).
- WhatsApp through **Meta Cloud API** (approved templates + 24-h session messages). Click-to-chat links remain as fallback.
- Payments are **manual bank/wallet transfers, recorded in the system**; no gateway in v1.
- **One fixed meeting link per teacher** (Google Meet today).

## 1. Roles

| Role | Can |
|------|-----|
| `admin` | Everything: leads, students, teachers, scheduling, subscriptions, payments, messaging, reports, settings |
| `teacher` | See own schedule, own students, submit/edit own lesson reports, mark attendance, set own weekly availability, see own payout summary |
| `guardian` (parent / adult student) | Read-only portal via WhatsApp magic link: upcoming lessons, reports (PDF), homework, remaining lessons, payment status |

- **R-AUTH-01** Each role signs in with its own login and lands on its own home. Phone app (Expo, owner 2026-10-12): `admin`, `teacher`, `sales` («المبيعات») and the classroom `assistant` («مساعد حلقة») sign in, each to its own tree mirroring its web pages; `guardian` and `student` are told the app is not theirs («wrongApp»), a disabled account is told so, offline the token's `user_role` claim keeps the right tree open.

## 2. Domain model (entities)

```
Lead ──(converts)──► Guardian ──1..n──► Student ──n..1──► Teacher
                                          │
                                          ├──► Subscription (package) ──► Payment*
                                          ├──► ScheduleRule (weekly recurrence, tz)
                                          │        └──► Lesson (occurrence) ──► LessonReport ──► ReportPdf
                                          └──► Message* (WhatsApp in/out, linked to lead or student)
Teacher ──► TeacherAvailability (weekly slots)  ──► TeacherPayout (per lesson rate)
JobApplicant (separate from Lead)
MessageTemplate (Meta template name + variables + Arabic body)
```

Key enums (store in `packages/shared/src/enums`):
- `LeadStatus`: `new` · `contacted` · `interested_no_slot` · `trial_booked` · `trial_done` · `converted` · `no_reply` · `lost`
- `LeadSource`: `facebook_ad` · `instagram_ad` · `whatsapp_direct` · `referral` · `other`
- `LessonStatus`: `scheduled` · `confirmed` · `completed` · `late` · `excused` · `no_show` · `cancelled_by_teacher` · `cancelled_by_admin` · `rescheduled`
- `SubscriptionStatus`: `trial` · `active` · `paused` · `expired` · `unpaid`
- `Program`: `quran` · `arabic` · `islamic_studies`
- `Grade`: `excellent` · `very_good` · `good` · `acceptable` · `needs_review` (ممتاز / جيد جدًا / جيد / مقبول / يحتاج إلى مراجعة)
- `Attendance`: `on_time` · `late` · `excused` · `absent` (حضرت في الموعد / حضرت متأخرة / اعتذرت مسبقًا / غياب بدون إشعار)
- `PackageSize`: `trial` · `4` · `8` · `12` · `16` (lessons per month)
- `Duration`: `30` · `45` · `60` · `90`

## 3. Functional requirements

### 3.1 Leads & WhatsApp inbox
- **R-LEAD-01** Inbound WhatsApp messages (Meta webhook) create or update a `Lead` keyed by E.164 phone; store every inbound/outbound message in `messages`.
- **R-LEAD-02** Admin inbox view (web + mobile): list leads by status, last message, source, age of lead; open a thread; reply (session message) or send a template.
- **R-LEAD-03** Lead qualification fields captured in-thread (optional, structured): student name, age, gender, country/time zone, level, memorized, goal, riwaya, available days, preferred time range. Replaces the deleted form questions (issue A9).
- **R-LEAD-04** Job applicants are a separate entity (`job_applicants`) with their own status; a lead can be re-classified with one click. Never counted in sales funnel (issue C4).
- **R-LEAD-05** Follow-up automation: a lead in `interested_no_slot` or `no_reply` for N hours (configurable, default 24h then 72h) gets a queued follow-up template with two free slots proposed from real teacher availability. Admin can pause per lead.
- **R-LEAD-06** Convert lead → creates Guardian + Student(s) + trial Lesson in one wizard (see 3.3).

### 3.2 Students & guardians
- **R-STU-01** `students` is the single table of truth; every other record references `student_id` (UUID) — the human code `AB-nnnn` is a generated display column, unique, never typed by a human.
- **R-STU-02** Phone numbers normalised to E.164 on write (`+966…`); country inferred; validation rejects handles/short numbers.
- **R-STU-03** Duplicate detection on create: same phone + similar name (normalised Arabic: strip hamza/taa marbuta/ya variants) → warn and offer merge. Merge tool keeps history.
- **R-STU-04** A guardian can have many students; each sibling is a separate student with own lessons, reports and package. A lesson can have many students (group lesson) via `lesson_students`.
- **R-STU-05** Student profile: level, memorized (surah/juz), goal, riwaya, time zone, notes, program, status (`trial`/`active`/`paused`/`churned`), assigned teacher, meeting link (defaults to teacher's).
- **R-STU-06** Student timeline: all lessons, reports, messages, payments in one view.

### 3.3 Scheduling
- **R-SCH-01** All times stored UTC; every student and teacher has an IANA time zone; UI shows both Riyadh and student local time. No free-text times.
- **R-SCH-02** `schedule_rules` (weekly byday + start time + duration + teacher + students + tz) generate `lessons` rows for a rolling horizon (default 5 weeks). Re-generation is idempotent (upsert by rule_id + date), never duplicates (issue B1).
- **R-SCH-03** Lesson status lifecycle (`scheduled → confirmed → completed/…`). Confirmation can come from student reply ("نعم"/button) or teacher/admin action. Dashboards count by real status (issue B2).
- **R-SCH-04** Conflict check at booking time: teacher busy, student busy, outside teacher availability → hard block with a clear message; admin may override with a reason.
- **R-SCH-05** Optional Google Calendar mirror (teacher calendar) is write-only from the system, keyed by `lesson_id` in extended properties, update-in-place; can be disabled per teacher. Not the source of truth.
- **R-SCH-06** Booking wizard: pick student(s) → pick teacher (filtered by gender preference, program, availability) → pick slot from a real availability grid → set package → create rule + lessons + confirmation message in one transaction.
- **R-SCH-07** Reschedule / cancel single occurrence or whole rule; cancellations by teacher do not consume the student's package; late cancels by student (<N hours) optionally consume one lesson (setting).
- **R-SCH-08** Teacher self-service: view week, mark attendance, propose reschedule (admin approves).
- **R-SCH-09** All-teachers calendar (owner request 2026-10-02): every teacher — empty ones too — with programs, gender, tz, load (n of max), weekly windows, time off, free gaps (≥ 30 min) and lessons (trial lessons tagged «تجريبية»), as a web day/week board and a mobile agenda, from one batched read (`GET /lessons/overview`, docs/10 §9).
- **R-SCH-10** Booking type (owner request 2026-10-03): a booking is `trial` (حلقة تجريبية), `package` (اشتراك) or `makeup` (حجز تعويضي), sent as `kind` (derived from `package` when omitted, so old clients keep working). A makeup is ONE lesson for ONE existing student that replaces a lesson they missed: `lessons.makeup_of_id` links it, its rule has no package and ends that day, it never offers «اعمل الاشتراك», and it never consumes a package unit (`v_package_lessons`, `v_subscription_balance`; the lesson still counts in the lesson number and in the teacher's payout, like any completed lesson). Only a lesson the package already charged can be made up: `no_show`, or an `excused` that counted as a late cancel, within 60 days, not a trial, not itself a makeup, with no active makeup yet FOR THAT STUDENT (`lessons.makeup_student_id`; in a group lesson A and B each get their own makeup; 409 `makeup_not_eligible` / `makeup_exists`). A cancel by the teacher or admin and a `rescheduled` lesson are never charged, so «غيّر الميعاد» covers them (a free makeup there would be an extra free lesson). The guardian gets the usual booking confirmation with {{1}} = «تعويضية لـ{name}». A makeup moves one lesson at a time (scope `rule` → 400 `makeup_scope_one`).
- **R-SCH-11** «عدّل الوقت» (owner request 2026-10-03: "make an option to edit the time of the session"): an admin edits ONE lesson's date, start and length IN PLACE (`PATCH /lessons/:id/time`, docs/10 §10): same row, same report and payments, no `rescheduled` twin (that stays «غيّر الميعاد», which can also move a whole series; this action is single-lesson only). A scheduled / confirmed lesson MOVES to a future time (conflict check for teacher and students always applies, an admin may override with a reason; a confirmed lesson goes back to «يحتاج تأكيد»; the guardian gets the usual booking confirmation for the new time when asked, an admin action that is queued even with `auto_messages_enabled` off). A completed / late lesson is CORRECTED on its own day with a required reason (e.g. it ran 60 min, not 45): status, attendance and `chargeable` are frozen, the report PDF is re-rendered (the guardian is not re-sent it), and a payout month that is approved or paid blocks a change of length (409 `payout_locked`; a draft month is flagged to recalculate). Cancelled, rescheduled, excused and no-show lessons cannot be edited. Every edit is audited (who, when, old → new, reason). A teacher can only propose (R-SCH-08) or note it in the report; an admin edits directly.

### 3.4 Teachers
- **R-TCH-01** `teachers` table: display name (ar/en), gender, programs, phone, email (auth), meeting link, per-lesson rate (EGP) by duration, status, max students.
- **R-TCH-02** Weekly availability grid (`teacher_availability`: weekday, start, end, tz) + one-off unavailability (`teacher_time_off`).
- **R-TCH-03** Teacher web dashboard: today / this week, join link, pending reports, students list. Teacher mode (owner request 2026-10-02, web + mobile): a teacher signs in and sees only their own chats, report forms, calendar, submitted reports and payouts (docs/10 §9); every scope is enforced server-side.
- **R-TCH-04** Teacher payout report per month: completed lessons × rate; export CSV.

### 3.5 Lessons & meeting links
- **R-LES-01** Each lesson row stores teacher, students, start/end UTC, status, meeting link (copied from teacher at creation, overridable).
- **R-LES-02** Join link sent to guardian automatically (confirmation + reminder); same link every time for that teacher (issue B8).
- **R-LES-03** Lesson sequence number per student computed (`row_number` over completed lessons) — never typed (issue A5).

### 3.6 Lesson reports
- **R-REP-01** Teacher opens the report from the lesson itself; student id, teacher, student, date, lesson no., link are pre-filled and read-only; the program is pre-filled from the student and the teacher can change it (issues A2, A3, D1; R-FRM-02).
- **R-REP-02** Form fields: attendance, recited, new memorization, revision, theory/tajweed, 6 rubric grades, overall grade, notes, homework, next plan, attachments (Supabase Storage). Validation: date not in future, not before lesson date; drafts auto-saved; editable by teacher for 24h, by admin always; versioned.
- **R-REP-03** On submit: generate branded PDF (HTML template → PDF, Arabic fonts, RTL), store in Storage under `reports/{student_id}/{lesson_id}.pdf`, send to guardian via WhatsApp template with document, mark lesson `completed`, decrement package balance.
- **R-REP-04** One report per lesson (unique constraint `lesson_id, student_id`); resubmission updates (issue A7).
- **R-REP-05** Student report history and progress view (grades over time) replaces per-student sheets (issue D2).

### 3.7 Subscriptions & payments
- **R-SUB-01** `subscriptions`: student, package size, price, start date, lessons_total, lessons_used (derived), status, renews_on. Balance decrements only on `completed` or chargeable statuses (issue E1).
- **R-SUB-02** Alerts: 2 lessons remaining → WhatsApp renewal reminder to guardian + admin task; 0 remaining → status `unpaid`, future lessons flagged (not auto-cancelled; setting).
- **R-SUB-03** Package end date derived from actual completed lessons, not fixed at creation (issue B5).
- **R-PAY-01** `payments`: subscription, amount, currency, method (bank/wallet/cash), paid_at, receipt image (Storage), recorded_by. Manual entry in v1.
- **R-PAY-03** Invoice (فاتورة) on a booking (owner request 2026-10-03): every booking but a trial carries one image or PDF (≤ 10 MB) as payment proof, required by `POST /booking` (400 `invoice_required`; not by `/booking/check`, which runs before one exists). It is uploaded to a signed URL (`POST /booking/invoice-upload-url`, `invoices/{clientRequestId}/…`) or saved from the family's WhatsApp chat (R-MSG-06). Stored in the private `invoices` bucket and the admin-only `invoices` table in the booking's own transaction (idempotent with the booking's `clientRequestId`); mime and size are read from Storage, never from the client. Admin-only reads: `GET /invoices?ruleId|studentId`, `GET /invoices/:id/download`; a teacher gets 403. It records proof only: the payment itself stays R-PAY-01.
- **R-PAY-02** Teacher payout: `lessons.completed × teacher.rate` per month, with approve/paid flag (issue E3).

### 3.8 Messaging (WhatsApp Cloud API)
- **R-MSG-01** Outbound: templates registered in Meta (`booking_confirmation`, `lesson_reminder_24h`, `lesson_reminder_1h`, `report_ready`, `renewal_due`, `follow_up_slots`, `lesson_feedback_request` for «رأيك يهمّنا», R-FRM-03). Template names and language codes live in DB `message_templates`; a startup health check verifies each exists in Meta and surfaces missing ones in admin settings (issue C1).
- **R-MSG-02** Scheduler (cron every 5 min) queues reminders: 24h and 1h before lesson start, in guardian's time zone wording; dedup key `lesson_id+type`; retry with backoff; failures visible in admin.
- **R-MSG-03** Fallback: every outbound message has a `wa.me` click-to-chat deep link with prefilled text for manual sending; marks `sent_manually` when admin taps it.
- **R-MSG-04** Inbound webhook: verify signature, store message, match to lead/guardian by phone, handle quick replies (confirm / reschedule / stop).
- **R-MSG-05** Message log per contact with delivery status (sent, delivered, read, failed + error code). A row a teacher sent from their inbox names them («بعتها: {name}», `messages.sent_by_teacher_id`) and its audit row carries their name. From the inbox, every role without `templates.manage` or `templates.send_all` (teachers, sales, classroom assistants, custom roles) sends only the restricted allow-list, `free_trial_invite` and `welcome_greeting` by default (owner 2026-10-12, docs/16 §15); teachers no longer send the lesson reminders by hand (the automatic reminders, R-MSG-02, are unchanged).
- **R-MSG-06** Save a WhatsApp file (owner request 2026-10-03): the admin can use an inbound image or PDF of a chat as the booking's invoice without downloading it to the device. `GET /threads/:phone/media` lists the chat's last 30 days of images / PDFs (metadata only, ≤ 12, admin only); `GET /threads/:phone/media/:messageId` returns a signed URL, downloading from Meta on first use into the private `wa-media` cache (410 `media_expired` after 29 days; Meta keeps a media id about 30 days). `POST /booking` with `invoice: {source: 'whatsapp', messageId}` copies it server-side into `invoices`, only when the message belongs to a booked guardian's phone (400 `invoice_message` otherwise); saving the same message twice lands on the same object.

### 3.9 Reporting / dashboard
- **R-RPT-01** Admin dashboard: funnel (new → trial_booked → trial_done → converted), active students, lessons this week by status, pending reports, unpaid subscriptions, teacher load. Numbers come from statuses, not formulas (issue F3).
- **R-RPT-02** Lead source → conversion → revenue attribution; monthly revenue, teacher cost, gross margin by source (issue E4). Ads/content spend entered manually as `expenses`.
- **R-RPT-03** Exports: students, lessons, payments, payouts CSV.

### 3.10 Admin mobile app (Expo)
- **R-MOB-01** Login (admin, teacher, sales, classroom assistant; R-AUTH-01), push notifications (to holders of `notifications.push`, admin by default; the sales and assistant trees register only when it is granted) for: new lead, lesson needing confirmation, report submitted, reminder failed, payment due.
- **R-MOB-02** Screens: Inbox (leads + threads, reply, send template), Today (lessons across teachers, statuses), Student quick view, Approve/confirm lesson, Record payment (with camera receipt), Quick book trial. Also «الجدول»: the all-teachers agenda (R-SCH-09) for the admin, and a teacher tree (اليوم، جدولي، المحادثات، التقارير، المزيد) for a teacher login (R-TCH-03). A sales tree (المحادثات، الطلاب، جدول الحلقات، المزيد: the web SalesNav pages, docs/16 «Mobile») for a sales login, and an assistant tree (حلقاتي with internal meetings، المزيد: the web /assistant/ page) for a classroom-assistant login.
- **R-MOB-03** Offline-tolerant reads (TanStack Query persist), optimistic status updates.

### 3.11 Migration from Google
- **R-MIG-01** One-off import scripts (`tools/migrate`) for: teachers (11), students (dedupe per A1 rules; review queue for ambiguous merges), schedule rules from «تقويم الحجوزات» rows with status مؤكد/مشترك, completed lessons + reports from «سجل تقارير الحلقات» (skip Lorem/test rows and dates outside 2026-08-01..today), subscriptions + payments from «Heart › subscription», leads from «كل المحادثات» (exclude توظيف → job_applicants, exclude جروب حلقة), existing PDFs copied into Storage by link.
- **R-MIG-02** Dry-run mode producing a diff report; import report with counts and rejected rows.
- **R-MIG-03** Keep Google Calendar mirror on for teachers during transition; stop Apps Script triggers at cut-over.

### 3.12 The three forms (docs/13-forms-spec.md)
- **R-FRM-01** «استمارة تسجيل طالب جديد»: every registration surface (booking wizard, add student, lead panel, mobile) shows the spec's titles, option wording, order and required marks; `other` is no longer offered as a source and 20/28 no longer as a package at registration.
- **R-FRM-02** «تقرير الحلقة»: identity order and labels, section headings, «البرنامج *» as an editable choice (`lesson_reports.program`) on web, mobile and the PDF.
- **R-FRM-03** «رأيك يهمّنا»: the admin asks after a completed lesson («ابعت طلب الرأي»); the family answers once on a public signed page (rating 1–5 *, recommend نعم/ربما/لا *, note, contact phone); the admin reads all answers with a per-teacher average, a teacher reads only their own. Template `lesson_feedback_request` is submitted to Meta only by the admin.

### 3.13 Assistants — base role `sales`, shown «مساعد/ة» (owner, 2026-10-06)
- **R-ASST-01** Registration and attribution: an assistant registers a free TRIAL (no package, no invoice, no custom meeting link, no clash override) for a family of one of her own leads or one of her own students through the booking wizard; the student she creates is recorded as brought by her (`students.brought_by` / `brought_at`), and an admin sets, changes or clears it, singly or in bulk, audited.
- **R-ASST-02** Commission: per assistant an admin sets a percent (of the subscription price, in its own currency) or a fixed amount, with a start day; ONE commission per student, only when the student's FIRST subscription became fully paid on or after both that start day and the day the student was brought (nothing is retroactive: attributing a student who already paid in full earns nothing); a refund or a deleted payment voids it, paying again reinstates it for the current assistant, a manual void stays.
- **R-ASST-03** Salary and statements: a monthly salary with a start day (a new start day cannot be in the past, a saved one cannot move earlier); a statement per assistant and month (salary + commissions ± adjustments, per currency, never summed across currencies) goes draft → approved → paid, is rebuilt on approval, frozen once approved, and a correction after approval is an adjustment in the next open month; approve, reopen and un-pay need `assistantpay.approve`.
- **R-ASST-04** Scope: an assistant sees only the students she brought (code, name, whether the first subscription is paid, her commission), the payments she recorded, her own commissions, terms and approved or paid statements, and the chats of the families of students she brought; never a price, a draft, another assistant's money or a student's notes, enforced by the API and by RLS (own-row policies, column grants, an owner-rights view).
- **R-ASST-05** Admin console «المساعدون»: terms, the commission ledger (filters, void with a reason), monthly statements (generate, approve, pay with receipt, reopen, un-pay), manual ± adjustments (idempotent by a request key) and «جُلب بواسطة» on the student profile plus bulk assignment; every money change is one RPC with its audit row.
- **R-ASST-06** The assistant's own pages «طلابي، مدفوعاتي، أرباحي»: read-only lists of her brought students, the payments she recorded, and her terms, this month so far and statements.

## 4. Non-functional requirements
- **R-NFR-01** Arabic RTL UI, Arabic + English teacher names, Hijri date optional display; UI text in clear Modern Standard Arabic (owner, 2026-10-03); Meta-approved WhatsApp templates keep their approved text until resubmitted.
- **R-NFR-02** Secrets only in environment / Supabase Vault; no keys in repo or Drive. RLS on every table; teachers see only own rows.
- **R-NFR-03** Audit log for status changes, payments, merges, report edits.
- **R-NFR-04** Separate `dev` / `staging` / `prod` Supabase projects; seed data clearly marked; no test rows in prod (issue A6).
- **R-NFR-05** Code constraints (enforced by ESLint + CI): max 150 lines per file, max 3 parameters per function, strict TypeScript, no `any`.
- **R-NFR-06** Tests: unit tests on every package (Vitest/Jest), API e2e (Supertest against local Supabase), web e2e (Playwright) for the 6 core journeys, mobile component tests (jest-expo + RNTL). CI must be green to merge.
- **R-NFR-07** Observability: structured logs, Sentry (api/web/mobile), health endpoint, WhatsApp failure alerts.
- **R-NFR-08** Performance: inbox and schedule views < 300 ms p95 on 10k lessons; all list endpoints paginated.
- **R-NFR-09** Backups: Supabase PITR; nightly export of PDFs bucket.

## 5. Core user journeys (drive Playwright e2e)
1. Lead arrives on WhatsApp → appears in inbox → admin replies → books trial via wizard (no invoice) → confirmation sent → lesson on teacher calendar. A paid booking from the same chat needs the invoice: uploaded, or picked from the chat (R-PAY-03, R-MSG-06).
2. Teacher logs in → sees today's lesson → marks attendance → submits report → PDF generated → guardian receives WhatsApp → package balance decremented.
3. Admin records payment → subscription active → renewal reminder fires at 2 lessons left. A student's missed lesson (`no_show` / charged excuse) is replaced by a «حجز تعويضي» with its invoice; the package balance does not move (R-SCH-10).
4. Admin reschedules one occurrence → conflict detected → chooses another slot → guardian notified.
5. Teacher sets availability → booking wizard only offers those slots.
6. Duplicate student creation blocked and merged.
