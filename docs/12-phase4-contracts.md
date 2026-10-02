# 12 — Phase 4 contracts: WhatsApp messaging, inbox, follow-ups, push

The single source for the Phase 4 builders (API B1–B3, web, mobile), so they can work in parallel without guessing each other's shapes. Requirement IDs: **R-MSG-01..05, R-LEAD-01..05, R-SCH-03 (confirm by reply), R-MOB-01 (push)**; issues C1 (132001), A9, B2. Foundation commit: «Phase 4 foundation: template registry, messaging schema, contracts, stub parity».

**Hard rules (CI fails otherwise):** ≤ 150 lines per file (blank lines and comments count) · ≤ 3 params per function (options object) · strict TS, no `any`, no `!` · unit tests beside the code in the same change (pure logic ≥ 80 %) · Arabic only in `packages/shared/i18n/ar.json` (Egyptian tone, Western digits) · UTC in the DB, IANA tz everywhere · idempotent writes and jobs (dedup keys) · RLS + Nest guards · never fake data · never invent business policy (TODO + owner question instead).

**Messaging safety (owner, 2026-10-02).** The academy's real number is live on the owner's CRM. Nothing in tests, scripts or local runs may call `graph.facebook.com`: `WA_API_BASE` has **no default**, local and e2e point it at `tools/wa-stub`. Never read `apps/api/.env.secrets`. Submitting a template to Meta happens only from the explicit admin route (§4 T3) — never at boot, never from a job. The production webhook cut-over is **not** part of Phase 4.

## 1. Who owns what

| Area | Owner | Edits only | Migrations |
|---|---|---|---|
| Foundation (done, **read-only**) | — | migrations `140–143`; `packages/shared/src/messaging/*`, `enums/messaging.ts`, the Phase 4 settings keys; `apps/api/src/env.ts`, `main.ts` (rawBody), `common/push/*`, `modules/whatsapp/whatsapp.types.ts`, the three empty modules in `app.module.ts`; `tools/wa-stub`; `e2e/support/wa-stub.ts`, `playwright.config.ts` | — |
| WhatsApp core | **B1** | `apps/api/src/modules/whatsapp/**` (not `whatsapp.types.ts`) | `2026100100015[0-2]` |
| Webhook + inbox API + lead routes | **B2** | `apps/api/src/modules/inbox/**`, `apps/api/src/modules/leads/**` | `2026100100015[3-5]` |
| Jobs + push triggers | **B3** | `apps/api/src/modules/messaging-jobs/**`; the one-line `PushService` calls in `reports` (submit) and `subscriptions` (alerts) | `2026100100015[6-8]` |
| Web | web builder | `apps/web/src/features/{inbox,templates}/**`, the lead drawer's qualification / follow-up parts, routes `/admin/inbox`, `/admin/inbox/$phone`, `/admin/templates` | — |
| Mobile | mobile builder | `apps/mobile/src/inbox/**` (thread, composer), `apps/mobile/src/push/**` (tap → screen) | — |

- `16x` belongs to Phase 6 (`20261001000160_import_log.sql` on `phase6/foundation`).
- `app.module.ts` already registers `PushModule` (global), `WhatsappModule`, `InboxModule`, `MessagingJobsModule`. Fill your own module; never edit `app.module.ts`.
- `ar.json`: the namespaces `inbox`, `templates`, `messages`, `followUps`, `notifications` and `enums.{messageStatus,templateStatus,templateCategory,pushKind}` exist. Add keys only inside them, never rename. `nav.inbox` / `nav.templates` exist.
- HTTP helpers: `parseOrThrow`, `orNotFound`, `dbError`, `pageQuerySchema`, `Page<T>` from `apps/api/src/modules/teachers/http.ts` (import, don't copy). Errors: `{ code, message: code, …details }`.

## 2. Data model (migrations 140–143)

- **140** `message_status` gains `sent_manually` (own file: an enum value can't be used in the transaction that adds it).
- **141 `message_templates`** `(key pk, meta_name, language 'ar', category utility|marketing, header_format null|'document', body_ar, footer_ar, params jsonb [names of {{1}}…], buttons jsonb, status template_status, quality, meta_id, last_checked_at, last_error, submitted_at, updated_at)`, `unique(meta_name, language)`. RLS: admin read; the API writes.
  - `template_status`: `not_submitted | pending | approved | rejected | paused | disabled | missing`.
  - Buttons: `{type:'url', url:'https://meet.jit.si/{{1}}', text?}` or `{type:'quick_reply', text, intent: confirm|reschedule|stop}`.
- **142** `messages` gains `attempts int`, `next_attempt_at`, `expires_at`, `sent_manually_at`, `reply_to_wa_id`, `media_id`, `media_mime`, `media_path`, `interactive_payload jsonb`, `wa_conversation_id`, `wa_pricing_category`. The content check is now `direction = 'inbound' or template_key or body or media_path`. The last Meta error stays in the existing `error_code` / `error_text` (no `last_error` column on messages). Indexes `(phone_e164, created_at desc)` and unread `(phone_e164) where inbound and read_at is null`.
  - **Unread** = inbound rows with `read_at is null`. `read_at` on an **inbound** row is stamped when an admin opens the thread (and the API sends Meta the read receipt). On outbound rows `read_at` stays Meta's «read by the customer».
  - **`v_threads`** (security_invoker, service role only): one row per phone with the last message, `unread_count`, `last_inbound_at`, and lead / guardian / teacher matched **by phone** (`display_name = guardian ?? lead ?? teacher`).
  - `leads` gains `follow_up_paused bool`, `follow_up_stage int` (follow-ups sent); `next_follow_up_at` already existed.
  - Settings rows: `follow_up_hours [24, 72]`, `reminder_minutes_before 60`, `reminder_24h_enabled false`, `messaging_enabled false`. Read through `SettingsService.all()` (`AcademySettings`), PATCH via `/settings` (`followUpHours`, `reminderMinutesBefore`, `reminder24hEnabled`, `messagingEnabled`; audited).
- **143 `push_notifications`** `(profile_id, kind push_kind, title, body, data, dedup_key unique, ticket_ids text[], error, sent_at)`; `push_kind`: `new_lead | new_message | lesson_needs_confirmation | report_submitted | reminder_failed | payment_due`. RLS admin read.

### 2.1 The registry (seeded)

| key | Meta name | status | {{1}} / {{2}} / {{3}} | buttons |
|---|---|---|---|---|
| `booking_confirmation` | same | approved | names / `lessonWhenText` | URL meet.jit.si/{{1}} |
| `booking_confirmation_meet` | same | approved | names / when | URL meet.google.com/{{1}} |
| `booking_confirmation_plain` | same | approved | names / when | — |
| `lesson_reminder` | `lesson_reminder_v2` | approved | names / «17:00» | URL Jitsi |
| `lesson_reminder_meet` | same | approved | names / «17:00» | URL Meet |
| `lesson_reminder_plain` | same | approved | names / «17:00» | — |
| `teacher_lesson_reminder` | same | approved | teacher / «17:00 — سهيلة ومريم» | — |
| `teacher_lesson_reminder_meet` | same | approved | teacher / slot | URL Meet |
| `report_ready` | same | not_submitted | student / when (+ document header) | — |
| `renewal_due` | same | not_submitted | student / «فاضل حلقتين» | — |
| `follow_up_slots` | same | not_submitted (marketing) | slot / slot / tz city | quick reply «وقف الرسايل» → stop |
| `lesson_reminder_24h` | same | not_submitted | names / «17:00» | quick replies confirm, reschedule |

- The approved bodies are the shapes we were given, not Meta's exact text: `last_checked_at` is null until the first health check copies Meta's BODY / FOOTER / BUTTONS over them (§3.4).
- `report_ready` and `renewal_due` keep the variables the Phase 3 producers already queue (`report-ready.ts`, `alerts.service.ts`); builders never rename params.

### 2.2 `template_params` and dedup keys

`TemplateParams` (`@ab/shared`): `{ '1'?, '2'?, '3'?, button?, payloads?: string[], document?: { bucket, path, filename } }`. Producers build them with the shared builders: `lessonReminderMessage`, `lessonReminder24hMessage`, `teacherReminderMessage`, `followUpSlotsMessage` (existing: `confirmationDrafts`, `reportReadyMessage`, the renewal params). `payloads[i]` belongs to the i-th button; the builders set `confirm:<lessonId>`, `reschedule:<lessonId>`, `stop:<leadId>` (`quickReplyPayload`).

Dedup keys (rule 8; `insert … on conflict (dedup_key) do nothing`):

| Row | dedup_key | expires_at |
|---|---|---|
| booking (existing RPCs) | `booking_confirmation:{lesson}:{guardian}` | null (expires with the lesson, `messageExpired`) |
| day-before reminder | `lesson_reminder_24h:{lesson}:{guardian}` | the guardian's local midnight before the lesson day («بكرة» stays true) |
| same-day reminder | `lesson_reminder:{lesson}:{guardian}` | lesson start |
| teacher reminder | `teacher_lesson_reminder:{lesson}:{teacher}` | lesson start |
| follow-up | `follow_up_slots:{lead}:{cycle}:{stage}` (cycle = epoch ms of the lead's last inbound, else created_at) | the first proposed slot |
| report / renewal (existing) | `report_ready:{report}` / `renewal_due:{subscription}` | null |
| admin session text / template | `admin:{clientRequestId}` (null without one) | null |

## 3. WhatsApp: env, gate, client, sender, webhook

### 3.1 Env (`apps/api/src/env.ts`, all optional; `KEY=` means unset)
`WA_API_BASE` (no default), `WA_API_VERSION` (`v21.0`), `WA_PHONE_NUMBER_ID`, `WA_WABA_ID`, `WA_ACCESS_TOKEN`, `WA_APP_ID`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN`, `EXPO_ACCESS_TOKEN`, `MESSAGING_ENABLED` (`true|false`, default false). `whatsappEnv(env)` → `{ base, version, phoneNumberId, wabaId, accessToken, appId? } | null` (`appId` only when `WA_APP_ID` is set).

**The one send gate:** `sendingAllowed(env, settings.messaging_enabled)` = env `MESSAGING_ENABLED` **and** WhatsApp configured **and** the admin's kill switch. Any of them off → rows stay `queued` (nothing fails, nothing is lost). Call it at the top of every sender tick and before any immediate send. Inbound (webhook) processing does **not** depend on the gate. Local: `pnpm env:local` writes stub values + `MESSAGING_ENABLED=true`; staging/prod leave it unset until cut-over.

### 3.2 Client (`modules/whatsapp/whatsapp.types.ts`, B1 implements)
`WHATSAPP_CLIENT` token; `WhatsappClient`: `configured()`, `sendTemplate({ to, template: TemplateRow, params, documentUrl?, payloads? })`, `sendText({ to, text, replyTo? })`, `sendDocument({ to, url, filename, caption? })`, `markRead(wamid)`, `getTemplates()` (all pages → `MetaTemplate[]`), `submitTemplate(row, { headerHandle? })` → `{ metaId, status }`, `canUploadSamples()` (an `appId` is set), `uploadSample(file)` → header handle (Resumable Upload: `POST {base}/{version}/{appId}/uploads?file_name&file_length&file_type` with Bearer, then the bytes to the returned `upload:…` id with `Authorization: OAuth {token}`, `file_offset: 0`), `getMedia(mediaId)` → `{ bytes, mime }`. Every call throws `WaError(message, { code, status, details })`; not configured → `code null, status 0`. Graph URLs: `{base}/{version}/{phoneNumberId}/messages`, `{base}/{version}/{wabaId}/message_templates`, `{base}/{version}/{mediaId}`; header `Authorization: Bearer {token}`; `to` = E.164 digits without `+`. Template components: `body` text params in order; `button` `sub_type: url, index: i` with `params.button`; `sub_type: quick_reply, index: i` with `payload`; `header` `document { link: documentUrl, filename }`.

### 3.3 Sender (B1, `MessageSender`)
- Tick every 30 s (in-process timer, like `ReportPdfJob`) + `kick()` after an enqueue. Candidates: outbound, `status = 'queued'`, `scheduled_for <= now`, `next_attempt_at` null or due, template `approved` in the registry. A row whose template is not approved is **left untouched** (no attempt counted; the UI shows `messages.waitingTemplate`).
- Expiry first: `messageExpired({ templateKey, expiresAt, lessonStartsAt, now })` → `status failed, error_code 'expired'` (no push).
- Claim by CAS: `update … set attempts = attempts + 1, next_attempt_at = now + 2 min where id = ? and status = 'queued' and attempts = <read>`; no row back = another instance has it.
- Success → `status sent, sent_at, wa_message_id, next_attempt_at null`, `leads.last_outbound_at`. For `report_ready`: sign `params.document` for 7 days at send time and stamp `lesson_reports.sent_at` (report id = dedup key suffix).
- Failure: `isRetryableWaError(code)` and `attempts < MAX_SEND_ATTEMPTS (3)` → stay queued, `next_attempt_at = now + backoff(attempts)` (1 min, 5 min, …), `error_code/error_text` set. Otherwise `status failed` and `PushService.notifyAdmins('reminder_failed', { subject: message.id, … })`.
- Quick-reply payloads: `params.payloads[i]`, else `quickReplyPayload(button.intent, lesson_id ?? lead_id ?? id)`.

### 3.4 Template registry (B1)
- `POST /messaging/templates/health` (and once at boot when configured, **best-effort**: log and continue, never fail boot or block requests; in e2e the stub may not be listening yet): `getTemplates()`, then per row match `meta_name + language`:

  | Meta status | ours |
  |---|---|
  | APPROVED | approved |
  | PENDING, IN_APPEAL | pending |
  | REJECTED | rejected (`last_error` = rejected reason) |
  | PAUSED | paused |
  | DISABLED, LIMIT_EXCEEDED, ARCHIVED, PENDING_DELETION, DELETED | disabled |
  | not listed | `not_submitted` stays; anything else → `missing` |

  Also `meta_id`, `quality` (`quality_score.score`), `last_checked_at`; for templates Meta has, copy BODY → `body_ar`, FOOTER → `footer_ar`, URL button `text`/`url` → `buttons` (keep our quick-reply `intent` by index).
- `POST /messaging/templates/:key/submit`: only `not_submitted | rejected | missing` (else 409 `not_submittable`); a body Meta would refuse (variable at the start or end, two side by side, a numbering gap, a variable without a sample) is 409 `invalid_template { reason }` before any Meta call; builds Meta components from the row (BODY with `example.body_text` = realistic Arabic samples per param name, `template-review.ts`, FOOTER, BUTTONS, DOCUMENT header); sets `pending`, `submitted_at`, `meta_id`; audited. A DOCUMENT header (`report_ready`) uploads the built-in sample PDF first and sends its `header_handle`; without `WA_APP_ID` it is 409 `needs_app_id`. Order: 404 → 409 `not_submittable` → 409 `invalid_template` → 503 → 409 `needs_app_id`.

### 3.5 Webhook (B2, `@Public()`)
- `GET /webhooks/whatsapp?hub.mode=subscribe&hub.verify_token&hub.challenge` → 200 challenge text when the token equals `WA_VERIFY_TOKEN`, else 403.
- `POST /webhooks/whatsapp`: verify `X-Hub-Signature-256` = `sha256=` HMAC-SHA256(`WA_APP_SECRET`, **`req.rawBody`**) with `timingSafeEqual` (`main.ts` sets `rawBody: true`; tests: `createNestApplication(adapter, { rawBody: true })`). Bad/missing signature or no secret → 401, nothing stored. Valid → 200 fast, then process.
- Inbound message: `waIdToE164(from)`; `LeadsService.upsertByPhone` only when the phone is not a guardian or teacher (a guardian's message must not create a lead); insert `messages` with `on conflict (wa_message_id) do nothing` (Meta retries), `lead_id/guardian_id` by phone, `reply_to_wa_id = context.id`, `body` (text, caption, button text), `interactive_payload` (button / interactive / unsupported raw), `media_id/media_mime`. Media: `getMedia` → Storage `whatsapp/{phone}/{wamid}` (signed URLs only, like receipts) → `media_path`. A new inbound resets the lead's `follow_up_stage` to 0.
- Quick reply: `quickReplyIntent(button.payload ?? interactive id ?? text)`. The lesson = `payloadRef(payload)`, else the `lesson_id` of the outbound row `reply_to_wa_id` points at, else the latest outbound row with a `lesson_id` to that phone in the last 48 h whose lesson is open. `confirm` → the existing lessons confirm service with `confirmed_by = null` (docs/10 route 6, idempotent). `reschedule` → push `new_message` (the admin handles it). `stop` → `follow_up_paused = true` on that phone's lead; for a guardian, only the push (utility reminders continue: TODO owner). Unclear → just stored.
- Statuses: `sent/delivered/read/failed` update the row by `wa_message_id`, only forward (`queued < sent < delivered < read`; `failed` from any state except `read`), with `*_at` from the status timestamp, `wa_conversation_id`, `wa_pricing_category`, `error_code/error_text`. `failed` → push `reminder_failed`.
- Push: first message from an unknown number → `new_lead` (subject lead id); otherwise `new_message` (subject = phone + 10-minute bucket, so a burst is one push).

## 4. Routes

All admin (`@Roles('admin')`) unless marked. `MV` = `MessageView`, `TV` = `ThreadView`, `TplV` = `TemplateView` (`@ab/shared` messaging views).

| # | Route | Input | 2xx | Errors | Owner |
|---|---|---|---|---|---|
| W1 | `GET /webhooks/whatsapp` (public) | hub.* query | 200 challenge | 403 | B2 |
| W2 | `POST /webhooks/whatsapp` (public, signed) | Meta payload | 200 | 401 | B2 |
| T1 | `GET /messaging/templates` | — | `TplV[]` by key | — | B1 |
| T2 | `POST /messaging/templates/health` | — | `TplV[]` | 503 `not_configured`, 502 `meta_error` | B1 |
| T3 | `POST /messaging/templates/:key/submit` | — | `TplV` | 404, 409 `not_submittable` / `invalid_template` / `needs_app_id`, 503, 502 | B1 |
| M1 | `POST /messages/:id/retry` | — | `MV` (queued, attempts 0, error cleared) | 404, 409 `not_retryable` (only failed) | B1 |
| M2 | `POST /messages/:id/sent-manually` | — | `MV` (`sent_manually`, `sent_manually_at`) | 404, 409 `not_manual` (only outbound queued/failed) | B1 |
| H1 | `GET /threads?search&unread&page&pageSize` | page query | `Page<TV>` by `last_message_at` desc | 400 | B2 |
| H2 | `GET /threads/:phone?before&limit` | E.164 (url-encoded `+`) | `ThreadDetail`; stamps inbound `read_at` + `markRead` the newest inbound | 400 `invalid_phone` | B2 |
| H3 | `POST /threads/:phone/text` | `threadTextSchema` | 201 `MV` | 409 `session_closed` (`sessionWindowOpen`) | B2 |
| H4 | `POST /threads/:phone/template` | `threadTemplateSchema` | 201 `MV` | 409 `template_not_approved`, 400 | B2 |
| L1 | `PATCH /leads/:id/qualification` | `leadQualificationPatchSchema` (merge; null clears) | lead row | 404, 400 | B2 |
| L2 | `PATCH /leads/:id/follow-up` | `leadFollowUpSchema` | lead row (resume recomputes `next_follow_up_at`) | 404 | B2 |
| S | `PATCH /settings` | the four Phase 4 keys | `AcademySettings` | 400 | done |

- H3/H4 insert a queued outbound row (`created_by` = admin, `dedup_key admin:{clientRequestId}`) and ask the sender to send it now; with the gate closed the row stays `queued` and the response says so (`inbox.messagingOff`). Every outbound `MV` on `queued/failed` carries `click_to_chat = clickToChatLink(phone, fallbackText({ template, params, documentUrl }))` (R-MSG-03); M2 records that the admin used it.
- Audit (`AuditService`): T3, M1, M2, L1, L2, H3, H4.

## 5. tools/wa-stub (local `:4010`, e2e `:4110`)

Graph (bearer required; `WA_ACCESS_TOKEN` set on the stub → must match):
- `POST /v*/{phone}/messages`: template (132001 missing / pending / rejected, 132015 paused, 132000 wrong body param count), text / document / interactive (131047 without an inbound in 24 h), `{status:'read', message_id}` → `{success:true}`. Response `{ messages: [{ id: 'wamid.…' }] }`.
- `GET /v*/{waba}/message_templates[?name=]` → `{ data: [{ id, name, language, category, status, quality_score: { score }, components }], paging }`: the 8 approved templates; the other 4 absent.
- `POST /v*/{waba}/message_templates` → `{ id, status: 'PENDING', category }` (duplicate / bad name → 400).
- `GET /v*/{media_id}` → `{ url, mime_type, … }`; `GET /__stub/media/{id}` → bytes (bearer).

Control (no auth): `GET /__stub/health`, `GET|DELETE /__stub/messages`, `GET /__stub/reads`, `GET /__stub/templates`, `POST /__stub/reset`, `POST /__stub/inbound` `{ from, name?, text? | button?{text,payload} | interactive?{id,title} | media?{kind,mime,caption?,filename?,base64?}, context?, timestamp? }` → signed webhook to `WA_WEBHOOK_URL`, returns `{ forwarded, status, id, mediaId }`; `POST /__stub/status` `{ id, status, errorCode? }`; `POST /__stub/templates/{name}` `{ status, quality? }` (Meta's review); `POST /__stub/fail` `{ to, code }` (next send to that number fails). e2e helpers: `e2e/support/wa-stub.ts` (`stubReset`, `stubSent`, `stubInbound`, `stubStatus`, `stubTemplateStatus`, `setMessaging`).

## 6. Push (`common/push`, done)
`PushService.notifyAdmins(kind, { subject, vars, data? })`: one `push_notifications` row per admin (`{kind}:{subject}:{profile}`, so a retry never pushes twice), title/body from `ar.json notifications.<kind>` with `vars`, Expo push to that admin's `profiles.push_tokens`, tickets stored, `DeviceNotRegistered` tokens pruned. Never throws. `data` for navigation: `{ kind, phone }` (messages), `{ kind, lessonId }`, `{ kind, subscriptionId }`.

| kind | When | subject | vars | Owner |
|---|---|---|---|---|
| new_lead | first inbound from an unknown number | lead id | name, text | B2 |
| new_message | inbound on a known thread | `{phone}:{10-min bucket}` | name, text | B2 |
| lesson_needs_confirmation | at the same-day reminder time the lesson is still `scheduled` | lesson id | names, when | B3 |
| report_submitted | first submit of a report | report id | student, teacher | B3 |
| reminder_failed | an outbound row ends `failed` | message id | template, name | B1/B2 |
| payment_due | a `renewal_due` / `subscription_unpaid` task is newly raised | task dedup key | student, left | B3 |

## 7. Jobs (B3)
Tick every 5 min (R-MSG-02) + on boot; each tick idempotent through the dedup keys.
- **Reminders:** lessons `scheduled|confirmed` starting in the next 25 h. Per guardian of the lesson's students: `reminderDue({ kind: 'same_day', startsAt, tz: guardian.tz, minutesBefore: settings.reminder_minutes_before, now })` → `lessonReminderMessage`; when `settings.reminder_24h_enabled` and `reminderDue({ kind: 'day_before', … })` → `lessonReminder24hMessage`. Teacher (if `teachers.phone_e164`): same-day with the teacher's tz → `teacherReminderMessage`. `expires_at` = lesson start.
- **Follow-ups (R-LEAD-05):** leads with `nextFollowUpAt(lead, settings.follow_up_hours) <= now` (also keep `leads.next_follow_up_at` = that value for the UI). Two free starts from real availability (`AvailabilityQuery.freeSlots` over active teachers of the lead's program, next 7 days, ≥ 12 h ahead) → `followUpSlotsMessage({ slots, tz: lead tz ?? qualification.tz ?? Asia/Riyadh, tzCity: ar.tz[tz], leadId })`, then `follow_up_stage += 1`. No two free slots → no message, `followUps.noSlots` on the lead, retry next tick. Paused, or a status outside `FOLLOW_UP_STATUSES` → nothing.
- **Pushes:** `lesson_needs_confirmation`, `report_submitted`, `payment_due` as in §6.

## 8. UI notes (web + mobile)
- Strings: `inbox.*` (thread list, composer, `inbox.sessionClosed` verbatim when `session_open` is false, `inbox.messagingOff`), `templates.*` (health table, `templates.names.<key>`, submit with `templates.submitConfirm`), `messages.*` (retry, click-to-chat, `messages.errors.<code>`), `followUps.*`, `notifications.*`. Status chips: `messageStatusStyle` / `templateStatusStyle` + `enums.messageStatus` / `enums.templateStatus`.
- Outbound template rows render with `renderTemplateBody` (MessageView.body already rendered). Times: recipient-local + Riyadh, Western digits; phones LTR islands.
- Design system docs/07: green acts, gold ornament, saffron only for «دورك» (failed send, template to fix, unread).

## 9. e2e
Journey #1 (docs/03 §5) runs against the e2e stub (`:4110`, started by `playwright.config.ts` with the e2e WhatsApp env and `MESSAGING_ENABLED=true`). `settings.messaging_enabled` stays false (seeded default) so journeys 2–4 still see `queued`; a messaging journey calls `setMessaging(true)` and `stubReset()` first and `setMessaging(false)` after. `resetDb` keeps `message_templates`; a journey that changes a template's status restores it.

## 10. Open questions (TODO, do not decide in code)
- R-MSG-01: exact bodies of the 8 approved templates (synced from Meta by the first health check at cut-over); `{{2}}` of the reminders assumed to be the time; `{{1}}` = students' names.
- R-MSG-01: `report_ready` / `renewal_due` / `follow_up_slots` / `lesson_reminder_24h` wording for the owner to approve before submitting; `follow_up_slots` is filed as marketing.
- «stop» from a guardian: also stop utility reminders? Now only follow-ups stop.
- Quiet hours for follow-ups (no night sends)? Not enforced.
- Phase 6: CRM messages carry Meta names (`lesson_reminder_v2`); map them to registry keys by `meta_name` when importing. `messages_content_check` rejects an **outbound** row with no `template_key`, `body` or `media_path`: give imported outbound media rows a `media_path` or a `body`.

## 11. Changes from the Phase 4 verification (fixer, 2026-10-02)
- **Follow-ups (R-LEAD-05):** key per silence (`cycle`, above), so a lead who replied gets later follow-ups. The stage advances only once the stage's row left (sent / sent by hand, or failed for good with the admin pushed); a row that expired or went stale unsent is replaced with fresh slots. Migration 144: `leads.follow_up_note` (`queued | waiting_template | no_slots`, written by the job) and `leads.follow_up_paused_by` (`lead` = «وقف», `admin` = L2); the panel shows them and asks before resuming a lead's own «وقف».
- **Quick replies (§3.5 as written):** a payload lesson counts only if it exists and is the guardian's child's; a typed reply uses the latest outbound row with a `lesson_id` to that phone in the last 48 h whose lesson is open; anyone not a guardian → stored only. «تم» confirms only on its own; money / renewal words block a «yes». Inbound rows keep Meta's timestamp as `created_at` (24 h window, thread order). `MessageView.lesson` (`{starts_at, status}` on thread pages) lets the UI say «اتأكدت حلقة …» / «مفيش حلقة اتأكدت» from what happened.
- **Webhook:** any item that fails (not a parse problem) → 500 after all items were tried, so Meta re-sends; replays stay no-ops.
- **Sender (§3.3):** the gate is re-read before every row; send-time staleness (`failed` / `stale`, see docs/09); the claim writes `error_code = 'sending'` before Meta is called — a row still `sending` on a later pass, or a timeout / dropped connection after the request left, becomes `failed` / `uncertain` (pushed, never resent blindly); Meta 190 / 10 / 200 hold the row 15 min uncounted, stop the pass and push once a day; `reminder_failed` is keyed per failed try (`{message}:{claim ms}`, `{message}:{wamid}` from statuses). A `renewal_due` row is failed `stale` when its renewal task closes.
- **Routes:** `GET /messages/gate` → `SendGateView { open, reason: env_off | not_configured | switch_off | null, queued }`; `POST /messages/:id/hand-off` (M3): an outbound queued / failed row → `failed` / `handed_off` (the sender never reads failed rows) until M2 (sent by hand) or M1 (back to the queue); audited. `ThreadDetail.lessons` (first page): the guardian's / teacher's next open lessons in the recipient's tz; template composers fill `lesson_when` / `lesson_time` / `lesson_slot` from the picked lesson (rule 6) and send its `lessonId`; teacher templates only on teacher threads.
- **Push:** `lesson_needs_confirmation` at the same-day reminder time (§6). `EXPO_API_BASE` (no default; production `https://exp.host`) — unset = pushes recorded, never sent. A reschedule request's push is titled «طلب تغيير ميعاد من {name}».
- **Settings:** `crm_cutover_done` (PATCH `crmCutoverDone`) retires the CRM warning after the cut-over.
