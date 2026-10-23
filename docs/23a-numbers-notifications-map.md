# 23a — Map: academy WhatsApp numbers, notification producers, admin UI, data model (2026-10-21)

Appendix to `docs/23-numbers-and-notifications.md`. Read-only survey of `develop` at `d181a79`. Paths are repo-relative. No `.env` file was read and no secret value is quoted. Line numbers were taken from the files; where a file is short only the file is named.

Contents: A. Lines · B. Notification engine · C. Admin UI · D. Data model · E. Design review.

---

## A. LINES (the two WhatsApp numbers)

**Correction to the brief.** Both lines can run on either driver. `WA_PROVIDER` picks the notifications line's driver and `WA_CHAT_PROVIDER` the chat line's (`apps/api/src/env.kapso.ts:16-20`, `apps/api/src/env.whatsapp.ts:63-65`). Only the defaults are `meta`. The e2e helper `e2e/support/kapso.ts:24-37` switches the **notifications** line to kapso.

### A1. Where the line type is defined

| What | File:line |
|---|---|
| Enum `public.wa_line ('notifications','chat')` | `packages/db/supabase/migrations/20261010000290_wa_lines.sql:15` |
| Generated `wa_line` type + constant | `packages/db/src/types.ts:4056`, `:4242` |
| `WA_LINES` (`as const satisfies readonly Enums<'wa_line'>[]`), `type WaLine` | `packages/shared/src/enums/messaging.ts:45`, `:52` |
| Zod `templateHealthSchema` / `templateLineSchema` (`z.enum(WA_LINES)`) | `packages/shared/src/messaging/schemas.ts:65`, `:68` |
| `LineCheckView` (line, provider, gaps, `duplicate_chat_phone`, `kapso_webhook_secret`, app_id) | `packages/shared/src/messaging/line-views.ts:8-37` |
| `ThreadView.last_inbound_line`, `reply_line`; `MessageView.line` | `packages/shared/src/messaging/views.ts:47,53,92` |
| `TemplateView.line`, `TemplateLineSync.line` | `template-views.ts:25`, `template-sync-views.ts:10` |
| `replyLine()` 24 h window rule, literal `'chat'`/`'notifications'` | `packages/shared/src/messaging/reply-line.ts:4-29` |
| Integration groups `wa_notifications`, `wa_chat`; key lists; `GROUP_OF`; `WA_PROVIDERS`, `INTEGRATION_ENUMS` | `packages/shared/src/integrations/keys.ts:7`, `:10-91`, `:106-113` |
| Per-key value checks | `packages/shared/src/integrations/checks.ts:25-45` |
| i18n `enums.waLine` («خط الإشعارات» / «خط المحادثات»), groups, `WA_CHAT_*` labels, «افحص الخطوط», `chatOptional`, `duplicateChatPhone` | `packages/shared/i18n/ar.json:3125-3128`, `:4481-4482`, `:4554-4578`, `:2652`, `:2657`, `:2679` |

### A2. Hard-coded two-line sites (grep `'chat'|'notifications'|WaLine|WA_LINES|line ===|WA_CHAT_|wa_line`)

| Area | Hits | Files | Prod / tests | Notes |
|---|---|---|---|---|
| apps/api/src | 460 | 95 | 136 / 324 | ~3 false positives (classroom chat key, sales-money) |
| apps/web | 169 | 51 | 51 / 118 | ~20 false positives (nav icon `'chat'`, receipt kind, query key) |
| apps/mobile | 33 | 16 | 13 / 20 | most prod hits false; genuine: `src/inbox/line-words.ts` + its uses, `ThreadScreen.lines.test.tsx` |
| db migrations | 15 | 7 | n/a | all genuine (D11) |
| e2e | 92 | 14 | 21 support / 71 spec | all genuine |
| tools/wa-stub | 6 (+ `lines.ts`, `state.ts:6,45`) | 3 | prod | `server.ts:9-18` reads `WA_CHAT_*`; `lines.ts:23-40` returns `[notifications, ...chat?]` with fixed display numbers |
| packages/shared/src | 65 | 13 | 47 / 18 | `classroom/room.ts:28,31` false positive |

Also: `.github/workflows/ci.yml:146-189` (`E2E_LINES: single` job), `tools/migrate/src/map/templates/write.ts:21` (`::public.wa_line` cast).

**apps/api production branches**
- `modules/whatsapp/whatsapp.module.ts:31` literal `{ notifications: new LiveWhatsappClient('notifications'), chat: new LiveWhatsappClient('chat') }`; `:49` `WHATSAPP_CLIENT = l.notifications`; `:73-79` boot gaps per line.
- `whatsapp.types.ts:90` `type WhatsappLines = Record<WaLine, WhatsappClient>`.
- `whatsapp/send-line.ts` `lineOf()` (file is 18 lines): a session text uses its stamped line or notifications; a template uses `message_templates.line`, chat only if the chat line is configured.
- `message.dispatch.ts:58-60` `multi = lines.chat.configured()` decides whether `messages.line` is stamped.
- `message.worker.ts:113` auth alert key `whatsapp_auth:${line==='chat'?'chat:':''}…`.
- `sender.queries.ts:21-22,51` chat-off filter `line.neq.chat`.
- `template.registry.ts:82` notifications fallback; `:95`, `:113-114` loop `WA_LINES`.
- `template-import.ts:63,69` restricted defaults only on chat; starter rows default to chat.
- `inbound-media.service.ts:83-84` `lines[msg.line ?? 'notifications']`, 503 for unconfigured chat.
- `lines.check.ts:85` `appIds` literal per line.
- `inbox/read-marks.ts:20`, `inbox/send-line.ts:17,20`, `inbox/threads.mapper.ts:56-70`.
- `webhook/webhook.lines.ts:13-16` `lineFor`.
- `env.gaps.ts` (whole file), `env.kapso.ts:33` `type KapsoLine`, `:36-45` `duplicateChatPhone`.
- `env.whatsapp.ts:36-42` `CHAT_KEYS`, `:44-60` `chatEnv`/`metaNotifications`, `:64`, `:74-77` literal object, `:82` `whatsappEnv = lineEnvs(env).notifications`, `:101` two app secrets, `:110-113` `lineNumbers`, `:118-130` `hasChatKeys`/`chatKeyGaps`.

**apps/web production sites**
- `features/templates/api.ts:47` `otherLine` binary toggle (used by `MoveLineDialog.tsx:27-28`); `:51` `APP_ID_KEY` record; `:66` `named`.
- `features/messaging/LineRow.tsx:98` `line === 'notifications'`; `:106` `chatOptional` only for chat.
- Already generic loops over `WA_LINES`: `LinesCard.tsx:45-46`, `TemplateLines.tsx:20`, `template-filters.ts:11`.
- ~14 `t.enums.waLine[line]` label sites: `inbox/LineBadge.tsx:9-13`, `ThreadRow.tsx:64,121`, `MessageBubble.tsx:94`, `reply-from.ts:12-14`, `TemplateLineBlock.tsx:60`, `template-cells.tsx:29-33`, `SubmitTarget.tsx:19`, `use-line-sync.ts:15,33`, `use-template-actions.ts:39`.
- `use-template-lines.ts:8` `PhoneMap = Partial<Record<WaLine,string>>`; `IntegrationsForm.tsx:41` renders fixed groups.

**e2e:** `playwright.config.ts:14-37,73-106` (`E2E_WA`, `E2E_WA_CHAT_KEYS`, `E2E_LINES=single`, empty providers); support `wa-lines.ts`, `kapso.ts`, `template-numbers.ts`, `restricted-templates.ts`, `reschedule-template.ts`; specs `wa-two-lines.spec.ts` (15), `whatsapp-lines.windows.sql.spec.ts` (14), `wa-two-lines.reply.spec.ts` (13), `whatsapp-lines.sql.spec.ts` (11), `template-numbers.spec.ts` (8), `sales-starter.spec.ts` (5), `templates.spec.ts` (3), `wa-lines-check.spec.ts` (2).

### A3. Config keys per line (registry `packages/shared/src/integrations/keys.ts:10-91`)

| Group | Plain (`integration_config`) | Secret (Vault `integration:<KEY>`) |
|---|---|---|
| `wa_notifications` | `WA_PROVIDER`, `WA_API_BASE`, `WA_API_VERSION`, `WA_PHONE_NUMBER_ID`, `WA_WABA_ID`, `WA_APP_ID` | `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN` |
| `wa_chat` | `WA_CHAT_PROVIDER`, `WA_CHAT_PHONE_NUMBER_ID`, `WA_CHAT_WABA_ID`, `WA_CHAT_APP_ID` | `WA_CHAT_ACCESS_TOKEN`, `WA_CHAT_APP_SECRET` |
| `kapso` (both lines) | `KAPSO_API_BASE`, `KAPSO_API_VERSION` | `KAPSO_API_KEY`, `KAPSO_WEBHOOK_SECRET` |
| `wa_safety` (global) | `WA_ALLOWED_RECIPIENTS`, `WA_TEMPLATE_SYNC` | — |

Shared, not per line: `WA_API_BASE`/`WA_API_VERSION` (also used by a meta chat line, `env.whatsapp.ts:50,72`); the single `WA_VERIFY_TOKEN`; one Kapso project for both lines (`env.kapso.ts:36-40,51-57`). `WA_CHAT_ACCESS_TOKEN` falls back to `WA_ACCESS_TOKEN` (`env.whatsapp.ts:47`); `WA_CHAT_APP_ID` has no fallback (`env.ts:62-63`).

Env only: `MESSAGING_ENABLED` (`env.ts:110`), `INTEGRATION_CONFIG_FROM_DB` (`:108`), `SETTINGS_CACHE_MS` (`:106`), `MESSAGE_SENDER_POLL_MS` (`:91`).

**DB wins, env is fallback.** `common/integrations/integration-config.queries.ts:26-27` reads plain rows + `rpc('integration_secrets_read')`; `integration-config.service.ts:36-60` refreshes on boot, every `integrationRefreshMs` (`integration-refresh.ts`: `INTEGRATION_REFRESH_MS`, else `SETTINGS_CACHE_MS`) and after each write, keeping the last good snapshot; `env.ts:140-148` `validOverlay` drops invalid values (logged by name); `common/integrations/integration-overlay.ts:8-17` frozen snapshot; `env.ts:128-134` `loadEnv() = parse({...process.env, ...overlay})`; `integration-config.view.ts:22` source `db|env|unset`. Controller `settings/integrations` GET, PUT, `PUT|DELETE secrets/:key` (`integration-config.controller.ts:23-57`). Every new **secret** name needs a migration replacing `integration_secret_key_ok`; plain keys do not.

### A4. Clients, health check, webhooks, window choice, kill switches

- **Clients.** `whatsapp.module.ts:30-32,48-49` provide `WHATSAPP_LINES`; injected into `MessageDispatch` (`message.dispatch.ts:48`), `TemplateRegistry` (`template.registry.ts:36`), `InboundMedia` (`inbound-media.service.ts:51`), `ReadReceipts` (`inbox/read-receipts.ts:22,35`). `live-client.ts:11-55` rebuilds an `HttpWhatsappClient(lineEnvs(env)[line])` when the config fingerprint changes. `env.whatsapp.ts:71-78` `lineEnvs()`; `chatEnv` is null when the chat phone id equals the notifications one (`:49`). Drivers: `graph.ts:32-34` (Bearer vs `x-api-key`), `kapso.ts:21-57` (paging, edit path, media), `whatsapp.client.ts:41-133` (`canUploadSamples` false on kapso; allow-list check before every request, `WaError 131030`).
- **«افحص الخطوط».** `POST /messaging/lines/check` (`lines.controller.ts:15-26`, `templates.manage` + `TemplateManagerGuard`) → `lines.check.ts:81-139`: per line provider, gaps by key NAME (`env.gaps.ts:24-45`, `env.kapso.ts:60-67`), duplicate phone, kapso webhook secret set?, then `GET {phone_id}` and (meta) `GET {waba}/subscribed_apps`. Result is not stored.
- **Webhooks.** Meta: `webhook/webhook.controller.ts:37` (`/webhooks/whatsapp`); GET handshake with single `WA_VERIFY_TOKEN` (`:45-52`); POST signature must match any of `[WA_APP_SECRET, WA_CHAT_APP_SECRET]` (`env.whatsapp.ts:100-103`, `webhook.signature.ts:23`). Kapso: `webhook/webhook.kapso.controller.ts:22,36-46` (`/webhooks/kapso`), HMAC with the single `KAPSO_WEBHOOK_SECRET`. Both feed `WebhookService.handle`; `webhook.parse.ts:101-118` reads `metadata.phone_number_id`; `webhook.lines.ts:7-10` `acceptsNumber`, `:13-17` `lineFor` stamps only while a chat line exists; `webhook.inbound.ts:75-76` writes `line` only when stamped.
- **24 h window.** DB per-line windows in `v_threads` (`…290_wa_lines.sql:40-42,54`, null line = notifications). Rule `reply-line.ts:24-29`: chat if its window is open and chat configured → notifications if its window is open → chat if only chat open (503) → null (409). API: `inbox/threads.mapper.ts:56-70`, `inbox/send-line.ts:15-22`, `inbox/thread-send.service.ts:51-55`.
- **Kill switches.** `env.whatsapp.ts:90-92` `sendingAllowed` = env `MESSAGING_ENABLED` AND the **notifications** line configured AND `settings.messaging_enabled`. `whatsapp/send-gate.ts:24-27` `open()`, `:30-32` `automaticOn()` = `settings.auto_messages_enabled`, `:38-49` reasons `env_off|not_configured|switch_off` + `restricted`. `message.sender.ts:71-93` checks the gate, holds automatic rows, re-checks per row, pauses a line for the pass on auth failure (comment at `:80` about chat texts starving notifications). Jobs also read `auto_messages_enabled` (`reminders/reminders.job.ts:72`, `follow-ups/follow-ups.job.ts:80`). `WA_TEMPLATE_SYNC=false` stops sync and submit (`env.ts:66-67`, `template.registry.ts:78`).

### A5. Cost of N numbers instead of 2

The two lines are two **roles**, not a list: notifications is mandatory and the fallback everywhere; chat is optional and preferred for replies; "stamp `line` only when chat exists" is a compatibility rule.

- **DB:** replace the enum with a table (Postgres cannot drop enum values); FK in `messages.line` and `message_templates.line`; `v_threads` per-line columns become a per-(phone, number) view (drop and recreate, since the view may only append columns); `message_templates` PK `key` + `unique(meta_name, language)` allows one number per template, so the same template on several WABAs needs a child table; Vault allow-list must become pattern- or id-based; seed literals in migrations 340, 382, 460; the `tools/migrate` cast.
- **shared:** `WA_LINES`/`WaLine`, `z.enum`, `replyLine()` over a list, `duplicate_chat_phone`, fixed integration groups and checks, `enums.waLine` labels → data.
- **api:** the static `Env` schema and `env.whatsapp.ts`/`env.kapso.ts`/`env.gaps.ts` (largest rewrite), the client factory → `Map<id, client>`, webhook lookup and app-secret list, `send-line`, `dispatch.multi`, worker stamp rule, sender chat-off filter, inbox reply line, media default line, template registry/import/move/submit, lines check, `sendingAllowed`.
- **web:** `LineRow`, `templates/api.ts` toggle, `MoveLineDialog` target picker, ~14 label sites, integrations groups → a numbers editor.
- **mobile:** small (`line-words.ts` already falls back to the raw value).
- **e2e/stub/CI:** fixed env sets, `E2E_LINES=single` job, 8 specs, stub needs list-valued config.
- **Size:** ~30 api prod files, ~15 web files, 7+ migrations, 60–80 test files (~530 assertions).
- **Already generic:** `LiveWhatsappClient`, per-line pause in the sender, read receipts, `LinesCard`/`TemplateLines` loops, mobile `lineWord`, Kapso phone-id routing, stub `stubLines` array.

---

## B. NOTIFICATION ENGINE

### B0. Headline facts
1. **No pg_cron / pg-boss.** Every scheduled producer is an in-process timer in the one API instance (`modules/reminders/ticker.ts`: "Move to pg_cron / pg-boss when the API scales out"). DB-side producers are only the booking/reschedule RPCs that insert `messages` rows in the same transaction.
2. **Two pipelines.** WhatsApp: the `public.messages` table is the queue (`status='queued'`, unique `dedup_key`), drained by `MessageSender` (`whatsapp/message.sender.ts`, 50 rows per pass `:16`, every 30 s `whatsapp/sender-timing.ts:2`). Bell + web push + Expo: `PushService` (`common/push/push.service.ts`) writes one `push_notifications` row (dedup `{kind}:{subject}:{profile_id}`, `:37`) then fans out without awaiting (`push.channels.ts`). **Email: none** (`me/account.auth.ts:20` "no SMTP").
3. **Gates.** Every WhatsApp send: env `MESSAGING_ENABLED` + notifications line configured + `settings.messaging_enabled` (`send-gate.ts:24-26`), plus `WA_ALLOWED_RECIPIENTS`. While closed, rows stay queued.
4. **`auto_messages_enabled`** governs only `AUTOMATIC_KEYS` = reminder keys + `follow_up_slots` + `renewal_due` + `lesson_rating` with `created_by` null (`whatsapp/send-stale.ts:96`). OFF: jobs don't queue them and the sender fails queued ones `auto_off`. Booking confirmations, `report_ready`, `teacher_new_student`, meeting invites and admin sends are not affected.
5. **Language fixed to Arabic**: one `message_templates` row per key, `language default 'ar'`; parameter text Arabic (`server-text.ts:10` "owner decision pending on English").
6. **Line per template**: `message_templates.line` (default notifications; all 15 producer keys seeded notifications, `…340_template_lines.sql:27-33`); admin can move it (`PATCH /messaging/templates/:key/line`). Session texts prefer the chat line while its window is open.
7. **Retries** (all WhatsApp): `MAX_SEND_ATTEMPTS = 3`, backoff 1/5/25 min (cap 1 h), only throttling/outage retried, `uncertain` fails at once, auth failure holds the line 15 min uncounted (`whatsapp/send-plan.ts:27,57-69`). Final failure / Meta `failed` webhook → `reminder_failed` push to admins (`message.worker.ts:113-124`). Admin recovery: `POST /messages/:id/retry|sent-manually|hand-off`.
8. **Bell/push recipients** filtered at send time by permission (`packages/shared/src/notifications/kind-permissions.ts`); no per-person preferences, quiet hours or opt-out table.
9. **Texts.** Template bodies (`body_ar`) are seeded by migration and approved by Meta; no in-app editor. Push texts and meeting-invite texts are editable at `/admin/translations` (`notifications.*`, `meetingInvites.*`).

### B1. Jobs

| Job | File | First / every | Produces |
|---|---|---|---|
| RemindersJob | `modules/reminders/reminders.job.ts` | 30 s / 5 min | W4–W7, P3, drops cancelled reminders (`:72`, `:77`) |
| FollowUpsJob | `modules/follow-ups/follow-ups.job.ts` | 60 s / 5 min | W13 |
| RatingJob | `modules/lesson-rating/rating.job.ts` | 45 s / 5 min + LessonEvents | W14 |
| AlertsJob | `modules/subscriptions/alerts.job.ts` | 5 min / 15 min + LessonEvents | W11, P5, admin tasks |
| ReportPdfJob | `modules/report-pdf/report-pdf.job.ts` | 30 s / 60 s + kick | W10 |
| MessageSender | `whatsapp/message.sender.ts` | 30 s / 30 s + kicks | all WhatsApp |
| PushReceiptsJob | `modules/push/push-receipts.job.ts` | 2 min / 15 min | Expo receipts, dead tokens |
| TemplateRegistry boot check | `whatsapp/template.registry.ts` | 5 s after boot | template status sync |

Event bus: `LessonEvents` (`common/events/lesson-events.ts`), in-process, after commit.

### B2. WhatsApp producers (gates, retries, `ar` and template-line rules of B0 apply to all)

| # | Producer | Audience | Trigger | Template + choice | Switches | Timing | Dedup | Admin control today |
|---|---|---|---|---|---|---|---|---|
| W1 | Booking confirmation | guardian (each) | `create_booking` RPC (`…20261018000465_booking_day_times.sql:210`) | by link host: Jitsi `booking_confirmation`, Meet `_meet`, else `_plain` (`shared/messaging/booking-confirmation.ts:28`) | none (always) | immediate | `booking_confirmation:{lesson}:{guardian}` | none |
| W2 | Reschedule (one/rule/course) | guardian | `apply_lesson_changes_v3` (`…475…sql:86`) via `reschedule-one/rule.service.ts`, `course-change.payload.ts` | same `booking_confirmation*` | none | immediate | `booking_confirmation:{new_lesson}:{guardian}` | none |
| W3 | Lesson time edit | guardian | `lessons/time-edit.service.ts` → `edit_lesson_time` (`…175…sql:60`) | same | per-edit `notify` flag | immediate | `…:{lesson}:{guardian}:{startMs}`; old queued rows expired, reminder keys freed (`…175…sql:41-51`) | checkbox on the edit |
| W4 | Same-day reminder | guardian | RemindersJob | `lessonReminderTemplate(link)` (`templates.ts:61`): `lesson_reminder` (Meta `lesson_reminder_v2`) / `_meet` / `_plain` | `auto_messages_enabled` | `reminder_minutes_before` (60) until start (`shared/messaging/timing.ts:115-119`); lookahead `reminder_lookahead_hours` | `lesson_reminder:{lesson}:{guardian}` | settings «الرسائل والواتساب» |
| W5 | Day-before reminder (confirm/reschedule buttons) | guardian | RemindersJob | `lesson_reminder_24h` | `reminder_24h_enabled` (false) + approved + auto | lesson's wall-clock time the previous local day (`timing.ts:79-82`), hard-coded | `lesson_reminder_24h:{lesson}:{guardian}` | toggle only |
| W6 | Teacher lesson reminder | teacher | RemindersJob (`reminders.plan.ts:43,99`) | `teacherReminderTemplate` (`templates.ts:71`): `_meet` or plain with link in {{2}} | `teacher_whatsapp_lesson_reminder` (true) + auto | same `reminder_minutes_before` | `teacher_lesson_reminder:{lesson}:{teacher}` | toggle; no per-teacher opt-out |
| W7 | Classroom join link (auto) | guardian per student | RemindersJob (`reminders.links.ts`) | `lesson_join_link` | LiveKit + approved + platform mode (`teachers.meeting_mode` else `meeting_link_auto`) + auto | as W4 | `lesson_reminder:{lesson}:{student}:room` | classroom section, per-teacher mode |
| W8 | Join link by hand | guardian | `POST /lessons/:id/join-link` (`classroom/join-link.service.ts`) | `lesson_join_link` | admin action | immediate | `lesson_join_link:{lesson}:{student}:{5-min bucket}` | button |
| W9 | Teacher new student | teacher | `booking/teacher-alert.service.ts` after booking | `teacher_new_student` | `teacher_whatsapp_new_student` (true) + approved | immediate | `teacher_new_student:{first_lesson}:{teacher}` | toggle |
| W10 | Report PDF | guardian | report submit → ReportPdfJob → `report-pdf.queries.ts` | `report_ready` (document header, 7-day signed link) | **none** | once rendered | `report_ready:{report_id}` (never re-sent after edit) | PDF retry only |
| W11 | Renewal due | guardian | `subscriptions/alerts.service.ts` (events, money writes, 15-min sweep) | `renewal_due` | auto + `renewal_alert_remaining` (2) | remaining ≤ threshold | `renewal_due:{subscription}` | accounts + messaging sections |
| W12 | Unpaid / expiry | — | **no WhatsApp** (TODO R-MSG-01 in `alerts.service.ts:14-15`) | — | — | — | — | — |
| W13 | Lead follow-up with 2 slots | lead | FollowUpsJob | `follow_up_slots` (+ «وقف الرسايل» `stop:<lead>`) | auto; lead status; not paused | `follow_up_hours` [24,72]; slots `follow_up_slots_from_hours` 12 → `_to_days` 7 | `follow_up_slots:{lead}:{cycle}:{stage}` | settings; per-lead pause |
| W14 | Lesson rating buttons | guardian | RatingJob | `lesson_rating` | `feedback_mode=='buttons'` + auto + approved | after completed/late; expires 72 h | `lesson_rating:{lesson}:{guardian}` | FeedbackModeSwitch |
| W15 | Rating by hand | guardian | inbox (`lesson-rating/rating.send.service.ts`) | `lesson_rating` | admin | immediate | `admin:{phone}:rating:{reqId}` | button |
| W16 | Feedback link | guardian | `POST /lessons/:id/feedback-request` (`feedback.write`) | `lesson_feedback_request` (14-day token) | admin; env `FEEDBACK_TOKEN_SECRET` | immediate | `lesson_feedback_request:{lesson}:{student}:{exp}` | button only |
| W17 | Inbox templates by hand (`trial_reschedule`, `free_trial_invite`, `welcome_greeting`, …) | lead / guardian | `inbox/thread-send.service.ts` | user picks; restricted roles see `sales_starter` rows (`shared/messaging/restricted-templates.ts`) | `templates.send_all` / `templates.manage` | immediate | `{actor}:{phone}:{reqId}` | starter toggle |
| W18 | Meeting invite text | non-staff invitees | `classroom/meeting-invite.flow.ts` | **session text** `meetingInvites.message.invite`; line via `pickSendLine` | `inbox.send`; window must be open else `window_closed` | immediate | `meeting_invite:{meeting}:{phone}:{startsAt\|instant}` | text in translations; caps 30/meeting, 100/day (migration 414) |
| W19 | Meeting cancelled text | families reached | `classroom/meeting-schedule.service.ts` | session text `meetingInvites.message.cancelled` | same | immediate | `meeting_cancel:{meeting}:{phone}` | text in translations |

Expiry: lesson-timed keys drop if the lesson started, was cancelled or moved (`shared/messaging/templates.ts:101-124`, `whatsapp/send-stale.ts`).

### B3. Bell / web push / Expo (`push_notifications`; text `ar.notifications.<kind>`, editable in translations; failures logged, not retried)

| # | Kind | Audience | Trigger | Switch |
|---|---|---|---|---|
| P1 | `new_lead` | admins + sales | inbound from unknown number (`webhook/webhook.inbound.service.ts`) | permission only |
| P2 | `new_message` | admins + owning sales | inbound (10-min bucket per phone) | permission only |
| P3 | `lesson_needs_confirmation` | admins | RemindersJob, lesson still `scheduled` within `reminder_minutes_before`; runs even with auto OFF | — |
| P4 | `report_submitted` | admins | `reports/report-follow-up.ts` | — |
| P5 | `payment_due` | admins | renewal/unpaid task raised | threshold |
| P6 | `reminder_failed` | admins | final WhatsApp failure; auth failure once per line per day | — |
| P7 | `new_student` | the teacher | after booking (`booking/teacher-alert.plan.ts`), always on | — |
| P8 | `meeting_invite` | invited staff | invite / move / cancel | — |

### B4. Sends nothing today
Lesson cancelled; teacher proposes a new time; payment received / receipt / invoice; unpaid / expired subscription (admin task only); sales registration; job applicant; recording ready; trial reminders beyond normal reminders; feedback with `feedback_mode='link'` (rating stops, nothing replaces it); no auto-reply; no email.

### B5. Hard-coded that an admin may want to customise
- **Timing:** one same-day reminder shared by guardians and teachers; day-before hour fixed; job cadences; rating look-back 36 h / expiry 72 h; feedback TTL 14 days; retry policy; push buckets; invite caps.
- **On/off:** booking/reschedule confirmations, `report_ready`, all staff bell kinds are always on; no per-teacher or per-user mute; no per-booking "don't notify".
- **Recipients:** admin pushes go to every admin; families = guardian phone only; teachers not told when a family confirms or asks to reschedule.
- **Text/language:** bodies only via SQL + Meta resubmission; param wording in code (`params.ts`); Arabic only.
- **Channels:** families WhatsApp only, staff push/bell only; no fallback channel; template variant (Jitsi/Meet/plain) chosen in code.
- **Ops:** no DB-visible job schedule or history.

### B6. Settings that drive notifications today
Messaging form (`SETTINGS_LAYOUT.messaging` in `packages/shared/src/settings/layout.ts`; entries in `settings/domains/*.ts`): `reminder_minutes_before` 60, `reminder_24h_enabled` false, `teacher_whatsapp_new_student` true, `teacher_whatsapp_lesson_reminder` true, `follow_up_hours` [24,72], `reminder_lookahead_hours` 25, `follow_up_slots_from_hours` 12, `follow_up_slots_to_days` 7, `quick_reply_window_hours` 48. Self-saving: `messaging_enabled`, `auto_messages_enabled`, `feedback_mode`, `crm_cutover_done` (UI-only). Accounts: `renewal_alert_remaining` 2, `subscription_expiry_days` 7. Classroom: `meeting_link_auto`, `join_opens_before_min` 15, `join_closes_after_min` 120. Per teacher: `teachers.meeting_mode`.

---

## C. ADMIN UI TODAY

### C1. Web `/admin/settings`
Route `apps/web/src/routes/admin/settings.tsx` → `features/settings/SettingsPage.tsx`; guard `requireRole('admin')` (`routes/admin.tsx:9`) and `settings.read` (`features/auth/admin-access.ts:26`). **No `settings.write` / `templates.manage` checks in the web UI.** Section order (`features/settings/page-sections.tsx`, `PAGE_SECTIONS`): Messaging → schedule, classroom, reports, accounts, uploads, academy → sales → appearance → **Integrations** → custom values. **Four save models on one page**: sticky «حفظ» for registry fields, instant switches, «حفظ التكاملات», per-row secret saves.

**A. «الرسائل والواتساب» (`features/settings/sections/MessagingSection.tsx`)**

| # | Control | File | Edits | API permission |
|---|---|---|---|---|
| A1 | CRM cut-over | `features/messaging/MessagingSwitch.tsx` | `settings.crm_cutover_done` | `settings.write` |
| A2 | Kill switch «إرسال الرسائل» (confirm on enable only) | `features/messaging/MessagingSwitch.tsx` | `settings.messaging_enabled` | `settings.write` |
| A3 | Server gate note + queued count | `ServerGateNote.tsx:15-28` | read-only (`GET /messages/gate`) | `messages.read` |
| A4 | «الرسائل التلقائية» (no confirm) | `features/messaging/AutoMessagesSwitch.tsx` | `auto_messages_enabled` | `settings.write` |
| A5 | «بعد انتهاء الحلقة» chips (save on change) | `features/messaging/FeedbackModeSwitch.tsx` | `feedback_mode` | `settings.write` |
| A6 | «خطوط واتساب» + «افحص الخطوط» (nothing on mount) | `LinesCard.tsx`, `LineRow.tsx`, `LineFacts.tsx`, `LineDriver.tsx` | read-only | `templates.manage` + guard |
| A7 | Registry fields (bottom «حفظ») | `features/settings/registry-form/RegistryField.tsx` | the B6 messaging keys | `settings.write` (audited) |
| A8 | Template health | `TemplateHealth.tsx:43-48` | — | `messages.read` |
| A9 | «القوالب حسب الرقم» + «مزامنة مع Meta» | `TemplateLines.tsx`, `TemplateLineBlock.tsx:56-83` | template status/quality/body sync | `templates.manage` |
| A10 | «متاح للمعلمين والمبيعات» | `template-columns.tsx:101-115`, `StarterToggle.tsx` | `message_templates.sales_starter` | `templates.manage` |
| A11 | «إرسال إلى ميتا» | `SubmitTemplateDialog.tsx` | status → pending | `templates.manage` |
| A12 | «نقل إلى الرقم الآخر» | `MoveLineDialog.tsx` | `message_templates.line` | `templates.manage` |

**B. Academy section:** `academy_whatsapp_e164` «رقم واتساب الأكاديمية» (`packages/shared/src/settings/domains/academy.ts`) — a third "number", the public contact, unrelated to either line in the UI.
**C. Sales:** `features/sales/SalesAutoAssignSwitch.tsx` in `features/settings/sections/SalesSection.tsx` (`sales_auto_assign`, no confirm).
**D. «التكاملات»** (`features/integrations/IntegrationsPanel.tsx`), groups `wa_notifications`, `wa_chat`, `kapso`, `wa_safety`, `livekit`, `expo`, `web_push`, `fx`. Plain keys (`PlainIntegrationRow.tsx`, placeholder = raw key) saved together; secrets write-only per row (`SecretIntegrationRow.tsx`, confirm only on clear). Writes need `settings.write`; audit records key names only.
**E. Custom values** (`features/custom-config/CustomValuesPanel.tsx`; the concepts: docs/25).

### C2. Other places
`/admin/inbox` (line badges, «سيصل ردّك عبر …» in text mode only, gate note, follow-up pause, retry / sent manually / hand-off); `/admin/roles` (grants `templates.*`, `settings.write`, `messages.*`, `notifications.push`); `/admin/translations` (push and invite texts); bell panel web-push toggle per device (`features/notifications/WebPushToggle.tsx`, `PUT|DELETE /me/web-push`).

### C3. Mobile admin (Expo)
`app/(tabs)/more/ops/settings.tsx` → `SettingsScreen.tsx` (guard `settings.read`): 7 editable fields (`SettingsFields.tsx:133-190`, incl. `follow_up_hours`, renewal alert, expiry days); read-only `messaging_enabled`, `auto_messages_enabled`, `crm_cutover_done` («تُدار من الموقع فقط», `ReadOnlySettings.tsx:71-88`) — shown as «مفعّل» even when the server gate blocks. `more/notifications.tsx` list + mark all read; push registered automatically, no toggle. Inbox shows line and gate notes. **Missing:** lines check, templates, integrations, feedback mode, teacher toggles, reminder minutes, 24 h reminder, follow-up slot windows, quick-reply window.

### C4. Not editable from any UI
Env: `MESSAGING_ENABLED`, `INTEGRATION_CONFIG_FROM_DB` (when false the UI still labels DB values «من الإعدادات», `integration-config.service.ts:65-68`), `SETTINGS_CACHE_MS` (changes apply within ~30 s), `MESSAGE_SENDER_POLL_MS`, `FEEDBACK_TOKEN_SECRET`. Code: job cadences, day-before hour, `TEMPLATE_KEYS` and which event sends which template, stale rules, restricted defaults. SQL: template `body_ar`, `footer_ar`, `params`, `buttons`, `meta_name`, `category`, `language`, `header_format`.

### C5. "Which number sends what, and is it on?" needs
(1) Messaging «خطوط واتساب» (phone only after a live check), (2) template table «الرقم» (line name; phone only if (1) ran this session), (3) timing fields + auto switch, (4) academy section number, (5) Integrations (ids, provider, allow-list), (6) `/admin/roles`, (7) `/admin/inbox`, (8) server env. **Five sections of one page, two more pages and the server env; nothing on mobile.**

---

## D. DATA MODEL (`packages/db/supabase/migrations/`)

Access rule throughout: clients read through RLS, the API (service_role) does every write; authenticated has no insert/update/delete on any messaging table (`20261001000110_lesson_hardening.sql:84-88`).

| Object | Created | Later | RLS / grants |
|---|---|---|---|
| enums `message_direction`, `message_status` (+`sent_manually`), `template_status`, `template_category` | 072, 140, 141 | — | — |
| enum `push_kind` | 143:5-7 | 381 adds `new_student`, `meeting_invite` | — |
| **enum `wa_line`** | **290:15** | — | — |
| `messages` (queue + log; `dedup_key unique`, `wa_message_id unique`) | 072:7-36 | 142:14-38 (attempts, next_attempt_at, expires_at, media, interactive); 164 (`sent_by_teacher_id`); **290:17 `line wa_line` nullable, no default/backfill**; 413/414 invite cap index + trigger; 500 media index; 505 `media_name`; 510 FK to profiles | `messages_admin_read`; `messages_teacher_read` (164, replaced 168 hides feedback link); `messages_sales_read` (187); none filters on `line` |
| `v_threads` (security_invoker; service_role only) | 142:43-69 | **290:30-63** adds `last_inbound_line`, `last_chat_inbound_at`, `last_notifications_inbound_at` (null = notifications) | revoke anon/authenticated |
| thread helpers `teacher_thread_phones`, `my_thread_phones`, `teacher_thread_reads`, `teacher_unread`, sales helpers | 164, 165, 187, latest 441 | — | self/admin policies |
| `message_templates` (PK `key`, `unique(meta_name, language)`) | 141:10-33 | **340:17-33 `line wa_line not null default 'notifications'` + `sales_starter`, backfill chat for non-producer keys**; 360 restricted semantics; 460 `trial_reschedule` (chat) | `message_templates_admin_read` |
| `settings` (key PK, value jsonb) | 073 | keys inserted in 123, 142, 162, 187, 195, 206, 330, 382, 441 (B6) | `settings_admin_read` |
| `integration_config` (key regex `^[A-Z][A-Z0-9_]{2,63}$`, value ≤ 4096) | 310:10-26 | — | `integration_config_admin_read`; no write policy |
| Vault RPCs `integration_secret_key_ok/set/clear/read/status` (names `integration:<KEY>`) | 310:29-100 | allow-list replaced in 380:50-59, **450:13-23** | service_role only |
| `custom_config` | 250 | — | admin read |
| bucket `wa-media` | 170:53-58 | 500 (16 MiB, audio/video) | admin storage policy |
| `profiles.push_tokens text[]` | 050:4 | — | profiles RLS |
| `push_notifications` (dedup unique) | 143:9-30 | 185 own-read; 380 `read_at` + unread index | `push_notifications_own_read` |
| `web_push_subscriptions` | 380:26-46 | — | own read |
| `meeting_invitees` (`channel in in_app/whatsapp/link`, status) | 411 | 412 RLS, 414 caps, 415 hide columns | admin / invitee / creator |
| lead follow-up columns `follow_up_paused`, `_stage`, `_note`, `_paused_by` | 142:73-77, 144 | — | leads RLS |
| `teachers.meeting_mode` | 490 | — | — |
| permissions (`role_permissions` rows) | 220:59-79 | 300, 360, 380, 433 | — |

**Not present:** no pg_cron / pg-boss / outbox tables (`messages` is the queue); no per-person notification preference table; no line column on media; seed (`seed.sql`) has no rows — templates, settings and permissions come from migration INSERTs (`free_trial_invite`, `welcome_greeting` arrive from Meta sync).

### D11. Everything that bakes in exactly two lines
1. `290:15` enum; 2. `290:17` `messages.line`; 3–4. `290:40-42,54` one `v_threads` column per line, binary `is distinct from 'chat'`; 5. `340:18` template `line` default; 6. `340:29-33` two-way backfill; 7. `382:18` and 8. `460:32` seed literals; 9. secret allow-list `WA_*` + `WA_CHAT_*` (`310:32`, `380:53`, `450:16`); 10. `WA_PROVIDER`/`WA_CHAT_PROVIDER` documented only (DB accepts any key); 11. comments in 290, 340, 460. No CHECK, index or RLS policy references `line`; no index on either `line` column; no SQL RPC sets `line` (the API decides).

---

## E. DESIGN REVIEW (heuristics vs `docs/07-design-system.md`)

| ID | Sev | Finding | Evidence | Suggestion |
|---|---|---|---|---|
| H1 | high | No single view of "which number sends what, and when" | static lines intro (`ar.json:2651`); template table has no trigger/timing column (`template-columns.tsx:34-122`); automatic keys revealed only inside `MoveLineDialog.tsx:8,53-57` | «ماذا يُرسل ومتى» overview: one row per notification with trigger, template + approval chip, number, audience, governing switch |
| H2 | high | Phone numbers hidden until a manual Meta call; "number" column shows a line name | `LinesCard.tsx:37`; `ar.json:2539`; `template-cells.tsx:29-38`; session-only cache `messaging/api.ts:27-31` | persist last good display number per line server-side; show «خط الإشعارات · +966…» everywhere |
| H3 | high | Env key names shown to humans | `PlainIntegrationRow.tsx:52` placeholder; `LineDriver.tsx:27`; `ar.json:2626, 2672, 2687, 2574, 2617, 4598`; search on raw keys | Arabic labels, link to the field, move raw keys under «للمطوّر» |
| H4 | high | Dangerous changes save without confirmation | `AutoMessagesSwitch.tsx:38-45`; `MessagingSwitch.tsx:46`; `FeedbackModeSwitch.tsx:33`; `IntegrationsForm.tsx:33-37,49`; `SecretIntegrationRow.tsx:61` | confirm dialogs with consequences; diff-and-confirm for number/provider/allow-list changes |
| H5 | high | Allow-list copy contradicts itself and clearing it is unconfirmed | `ar.json:4594` vs `:4495`, `integrations-form.ts:51` | show the effective list; confirm when it becomes empty |
| H6 | high | Mobile admin has none of this, and shows «مفعّل» when the server gate blocks | `apps/mobile/src/ops/SettingsFields.tsx:133-190`, `ReadOnlySettings.tsx:73-77` | mobile «حالة الإرسال» card + catalogue toggles |
| M1 | med | Kill-switch chip says «الإرسال يعمل» while the server gate is closed | `MessagingSwitch.tsx:62`, `ServerGateNote.tsx:16-24` | «مفعّل هنا · متوقف من الخادم», half glyph |
| M2 | med | Copy says "on the server" for things now editable in the UI | `ar.json:2687` and `notConfigured`, `gateNotConfigured` | point to the right section |
| M3 | med | Lines (section 1) and their credentials (second to last) are far apart; academy number elsewhere | `SettingsPage.tsx:60-66` | group by number in one module |
| M4 | med | Hidden dependencies (auto switch, template approval) not shown on dependent fields | `ar.json:2644` | inline approval chip; dim with «لن يعمل: …» |
| M5 | med | Edit controls shown to roles that cannot write | `admin-access.ts:26`; `template-manager.guard.ts:16` | `canDo()` → read-only + «للاطلاع فقط» |
| M6 | med | «من الإعدادات» shown even when the server ignores DB values | `integration-config.service.ts:65-68`, `IntegrationSourceNote.tsx:6-15` | per-key `effective_source` / `rejected` |
| M7 | med | ~12 filled primary buttons on one screen (rule 4) | `SecretIntegrationRow.tsx:61`, `SettingsPage.tsx:72` | secondary per-row buttons |
| M8 | med | Four save models in one section | `SettingsPage.tsx:71` | one model per section, «يُحفظ فوراً» tags |
| M9 | med | Family-reaching fields not marked | `RegistryField.tsx:39-42` never passes `danger` | `reachesFamilies` flag |
| M10 | med | Template table heavy on phones; starter switch on automatic rows | `template-columns.tsx:36-120` | default filter «يحتاج انتباه»; disable starter on producer keys |
| L1 | low | Saffron text without a glyph (rule 3) | `TemplateHealth.tsx:50-52`, `AutoMessagesSwitch.tsx:47`, `LineDriver.tsx:25,31` | add nuqta |
| L2 | low | Raw Graph words (CONNECTED, GREEN) | `LineFacts.tsx:26-35` | Arabic gloss |
| L3 | low | Raw ids in line facts | `LineFacts.tsx:14-18`, `TemplateLineBlock.tsx:27-28` | «تفاصيل تقنية» disclosure |
| L4 | low | Heading levels (`h2` inside `h2`) | `TemplateHealth.tsx:43` | `h3` |
| L5 | low | Template mode in the inbox hides which number sends | `reply-from.ts:4-10` | «سيصل عبر …» |
| L6 | low | Mobile currency free text | `apps/mobile/src/ops/SettingsFields.tsx:182-188` | picker |
| L7 | low | No per-user notification preferences | `WebPushToggle.tsx:20`, `NotificationsScreen.tsx` | «إشعاراتي» |
| L8 | low | Weak empty/loading states | `TemplateHealth.tsx:55-58`, `LinesCard.tsx:45-47` | §10 pattern |

Already good: confirm dialogs for enabling the kill switch, submit, move and clearing a secret; consistent LTR isolation; secrets never shown; field errors with glyph + `aria-describedby`; settings search; audit on every write.
