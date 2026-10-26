# 23 — Academy numbers and the notification engine: one module «أرقام الأكاديمية والإشعارات»

Owner request 2026-10-21: «the academy mobile numbers and its integrations with the notification engine to be more organized and in a separate module / more customizable». Design only; nothing here is built yet. Evidence and the full survey (lines, producers, UI, data model, design review): `docs/23a-numbers-notifications-map.md` (§A–§E below refer to it). Builds on docs/12 §13, docs/15, docs/19, docs/21.

## Owner answers (2026-10-22) — these override §2–§5 below

1. **Any number of live numbers (option B).** Numbers are records (§2a) AND routing is per number: each
   template and each notification-catalogue row picks its number; inbound and replies follow the number the
   family wrote to / was last written from (per (phone, number) reply windows). The two roles become
   presets/defaults, not a hard limit. This makes phase 7 of §3 core work, not optional.
2. **Remove the env fuse `MESSAGING_ENABLED`.** Sending is governed only by the DB switch
   `messaging_enabled` («إرسال الرسائل») and the allow-list. The removal must be FAIL-CLOSED: the deploy that
   removes the env check must not change the effective state anywhere (staging has `messaging_enabled = false`
   and real families); a missing/unknown DB value means OFF; the overview states plainly what is on.
3. **Essential notifications (booking confirmations, report PDF) may be turned off** with a typed
   confirmation and an activity-log entry (option a of Q3).
4. **Personal mutes: later**, after the module ships (option a of Q4).

## 1. Today (pain points, with evidence)

1. **A number is not a thing.** A WhatsApp number exists only as ~20 env-style keys split into two fixed groups (`WA_*`, `WA_CHAT_*`, plus shared `KAPSO_*`, `WA_API_*`, one `WA_VERIFY_TOKEN`) (§A3). The phone itself is shown only after a live «افحص الخطوط» call and is forgotten on reload (§E H2).
2. **Two lines are baked in everywhere:** enum `wa_line`, `v_threads` one column per line, the Vault allow-list, the client factory, `replyLine()`, ~530 test assertions (§A2, §D11).
3. **No catalogue of what is sent.** 19 WhatsApp producers and 8 bell/push kinds (§B2, §B3); which one is on depends on 8 scattered switches (`messaging_enabled`, `auto_messages_enabled`, `reminder_24h_enabled`, `feedback_mode`, `teacher_whatsapp_*`, `meeting_link_auto`, per-teacher `meeting_mode`, template approval) and env `MESSAGING_ENABLED`.
4. **Some cannot be turned off at all:** booking/reschedule confirmations, `report_ready`, every staff bell kind (§B5).
5. **Timings are partly hard-coded:** one same-day reminder shared by families and teachers; the day-before hour is fixed; no second reminder (§B5).
6. **Answering "which number sends what" takes five sections of one page, two more pages and the server env**; mobile has none of it (§C5, §C3).
7. **Humans see developer words:** `WA_PHONE_NUMBER_ID`, `MESSAGING_ENABLED`, template keys, «اكتب false» (§E H3); dangerous switches save with no confirmation (§E H4, H5).
8. **A third "number"** (`academy_whatsapp_e164`, the public contact) lives in the academy section, unrelated to either line (§C1 B).

## 2. Target design

One NestJS area, one admin place, two concepts: **numbers** (who sends) and **notifications** (what is sent, when, to whom, how). The send pipeline (outbox in `messages`, `dedup_key`, gate, sender, retries, webhook parser, drivers `meta`/`kapso`) is unchanged: it is already correct and tested. What changes is where its *configuration* comes from and how an admin sees it.

### 2a. Numbers as first-class records

New table `public.wa_numbers` (RLS: admin read; writes by service_role only, like every messaging table):

| Column | Notes |
|---|---|
| `id uuid pk` | |
| `label text` 1..60 | Arabic name shown everywhere, e.g. «رقم المحادثات» |
| `purpose wa_line not null` | the existing enum, kept as the **role**: `notifications` or `chat` |
| `provider text check in ('meta','kapso')` | per number; replaces `WA_PROVIDER` / `WA_CHAT_PROVIDER` |
| `phone_number_id`, `waba_id`, `app_id` | the ids that are plain keys today |
| `display_phone_e164 text` | cached from the last good health check (fixes §E H2) |
| `enabled boolean` | off = configured but not used; no sends, inbound still logged |
| `health jsonb`, `checked_at` | last «افحص» result (status, quality, webhook, missing fields by **label**) |
| `updated_at`, `updated_by` | audited like settings |

- **Unique `(purpose) where enabled`**: one live number per role (see the choice below).
- **Credentials in Vault**, never in the row: names `wa_number:<id>:access_token`, `:app_secret` through four new service_role RPCs `wa_number_secret_set / clear / status / read` (same shape as `integration_secret_*`, id-validated, so adding a number needs no migration). Kapso stays one project (`KAPSO_API_BASE`, `KAPSO_API_KEY`, `KAPSO_WEBHOOK_SECRET` in «التكاملات»), because Kapso authenticates per project and its webhook is per project (docs/19).
- **Global, not per number:** `WA_VERIFY_TOKEN`, `WA_API_BASE`/`WA_API_VERSION` (Meta), the allow-list `WA_ALLOWED_RECIPIENTS`, `WA_TEMPLATE_SYNC`. They move into the module's «الحماية» section but keep their `integration_config` storage.
- `messages` gains nullable `number_id uuid` (FK, set by the worker at claim, for audit and per-number stats). `messages.line` and `message_templates.line` stay as the role.

**N numbers vs 2 named roles.**

| | A. Two named roles, numbers as records (recommended) | B. N numbers, routing by rules |
|---|---|---|
| What the admin gets | a card per number, swap a number without touching keys, add a spare number (disabled) ready to switch to | any number of live numbers; each template / notification picks a number |
| Routing | unchanged: templates by `line`, replies by `replyLine()` | new: per-template number, per-thread reply number, fallback order |
| Schema | 1 table + 1 nullable column + Vault RPCs; enum and `v_threads` untouched | enum → FK table in `messages` and `message_templates`; `v_threads` rewritten per (phone, number); templates need a `(key, number)` child (one Meta template per WABA) |
| Code | env layer + client registry + webhook lookup + lines check (~12 api files, ~8 web) | ~30 api prod files, ~15 web, 7+ migrations, 60–80 test files (§A5) |
| Risk | low; behaviour identical while one number per role | high; touches reply-window logic and every template path |

A keeps the door open: the table, Vault naming and UI are already per number; going to B later is a routing change, not a second migration of credentials.

### 2b. The notification catalogue

**Code defines what exists; the DB holds the admin's choices.** A notification type needs a trigger in code, so the list of types is a typed const in `packages/shared/src/notifications/catalogue/catalogue.ts` (one entry per row of §B2/§B3 that is automatic or system-made; hand sends such as W8, W15–W17 are listed as «يدوي» and not toggleable). New table `public.notification_rules` stores only overrides:

| Column | Notes |
|---|---|
| `key text pk` | catalogue key, e.g. `lesson_reminder`, `lesson_reminder_24h`, `teacher_lesson_reminder`, `teacher_new_student`, `booking_confirmation`, `report_ready`, `renewal_due`, `follow_up_slots`, `lesson_rating`, `lesson_join_link`, `new_lead`, `new_message`, `lesson_needs_confirmation`, `report_submitted`, `payment_due`, `reminder_failed`, `new_student`, `meeting_invite` |
| `enabled boolean` | replaces `reminder_24h_enabled`, `teacher_whatsapp_*`, `feedback_mode='buttons'` |
| `channels text[]` | subset of the entry's allowed channels: `whatsapp`, `bell`, `push` |
| `timing jsonb` | validated by the entry's own zod schema, e.g. `{minutes_before: 60}`, `{send_at_local: "20:00"}` for the day-before reminder, `{hours: [24,72]}` for follow-ups, `{remaining: 2}` for renewal |
| `updated_at`, `updated_by` | audited |

Each catalogue entry carries: `audience` (guardian / teacher / lead / staff), `trigger` (Arabic description key), `templates` (the template keys it may send, so the UI shows their approval and **number** from `message_templates.line`), `automatic` (governed by «الرسائل التلقائية»), `locked` (safety rows such as `reminder_failed` cannot be turned off), defaults equal to today's values. RLS: admin read, service_role write.

- **Effective state shown per row**: «يعمل» only when the master switch, the server gate, the number, the template approval and the row itself all agree; otherwise the first blocker in words («القالب لم يُعتمد بعد»). Fixes §E H1, M4.
- **Still global:** `messaging_enabled` («إرسال الرسائل») and `auto_messages_enabled` («الرسائل التلقائية») stay as the two top switches. The env `MESSAGING_ENABLED` fuse is removed (owner answer 2, phase 2).
- **Template variants** (Jitsi / Meet / plain) stay chosen in code from the link host; the catalogue row lists all variants and their approval.
- **Texts** stay where they are: template bodies via Meta, push/invite texts via `/admin/translations` (linked from each row).
- **Not in scope:** new producers (cancellation, payment receipt; §B4) and per-person preferences (Q4). The catalogue makes adding them a row + a producer.

### 2c. NestJS layout

Two modules under `apps/api/src/modules/`, each file ≤ 150 lines, ≤ 3 params, strict TS:

```
academy-numbers/            # owns wa_numbers + per-number Vault secrets + health
  numbers.module.ts         exports NumbersConfig (port used by WhatsappModule)
  numbers.controller.ts     GET/POST/PATCH /admin/numbers, PUT|DELETE /admin/numbers/:id/secrets/:name, POST /admin/numbers/:id/check
  numbers.service.ts        validation, audit, cache refresh
  numbers.queries.ts        table + RPC access
  numbers.config.ts         NumbersConfig: role → LineEnv; falls back to today's lineEnvs(loadEnv()) when no row
  numbers.health.ts         moved from whatsapp/lines.check.ts; stores the result
  numbers.import.ts         one-shot copy of the effective config into rows (2e)
  *.test.ts                 next to each
notification-rules/         # owns notification_rules; read by every producer
  rules.module.ts           exports NotificationPolicy
  rules.controller.ts       GET /admin/notifications (catalogue + effective state), PATCH /admin/notifications/:key
  rules.service.ts / rules.queries.ts / rules.mapper.ts
  policy.ts                 NotificationPolicy.isOn(key), channels(key), timing(key); falls back to legacy settings keys
```

Boundaries: `WhatsappModule` imports `NumbersModule` and asks `NumbersConfig` for a line's config instead of reading env (`live-client.ts` already rebuilds on a config fingerprint, so a saved change applies without restart). Producers (`reminders`, `follow-ups`, `lesson-rating`, `subscriptions`, `booking`, `report-pdf`, `common/push`) import `NotificationRulesModule` and ask `NotificationPolicy`; none reads `settings.*` notification keys directly any more. Guards: `settings.read` to view; new permissions `numbers.manage` and `notifications.manage` (granted to the admin role in the migration) to edit; RLS on both tables.

### 2d. One admin place

Web: `/admin/communications` «أرقام الأكاديمية والإشعارات», one cartouche, tabs:

1. **نظرة عامة** — the two master switches with the server gate in plain words, queued count, each number's card (label, phone, provider, health glyph), and the table «ماذا يُرسل ومتى»: one row per catalogue entry (audience, when, channels, number, template status, effective state).
2. **الأرقام** — card per number: edit label/ids/provider, credentials (write-only, confirm on save and clear), «افحص الآن», «تفاصيل تقنية» disclosure for raw ids; «إضافة رقم احتياطي».
3. **الإشعارات** — the catalogue editable row by row: on/off, channels, timing fields; switching on a family-facing row asks for confirmation stating whom it reaches.
4. **القوالب** — today's `TemplateHealth` moved here unchanged (sync, submit, move between numbers, «متاح للمعلمين والمبيعات»).
5. **الحماية والتجربة** — allow-list (effective value shown, confirm when emptied), template sync as a switch, Kapso project credentials, CRM cut-over.

The settings page keeps a link card in place of the removed sections; `academy_whatsapp_e164` is shown on the overview as «الرقم المعلن للأسر» (still edited where it is). All copy in `ar.json`, clear MSA; raw key names only inside «للمطوّر». Read-only rendering for roles without `*.manage` (§E M5). One save model per tab.

Mobile admin (Expo): `more/ops/communications` with the overview (effective gate, numbers + health, «ماذا يُرسل ومتى») and the catalogue on/off toggles with the same confirmations. Credentials, ids and templates stay web-only, with a «افتح في الموقع» note.

### 2e. Migrating staging (real data) without loss or double sends

Principles: expand → copy → verify → switch reads → contract, each a separate PR; no step creates `messages` rows; dedup keys and template keys never change, so a duplicate enqueue is impossible by construction.

1. **Expand** (migration): create `wa_numbers`, `notification_rules`, the Vault RPCs, `messages.number_id`. Nothing reads them yet.
2. **Copy numbers** (admin button «استيراد الإعداد الحالي», `numbers.import.ts`): dry-run first shows, per role, the effective values *and their source* (DB / env) by label, never secret values; apply inserts rows and copies secrets **server-side** (DB secrets Vault→Vault inside one RPC; env-only secrets read by the API process and written via `wa_number_secret_set`). Idempotent: re-running with rows present is a no-op diff. Old `integration_config` rows and Vault entries are **not** deleted.
3. **Copy rules** (same migration as their table, SQL): one row per catalogue key with today's values read from `settings` (`reminder_minutes_before`, `reminder_24h_enabled`, `teacher_whatsapp_*`, `feedback_mode`, `follow_up_hours`, `renewal_alert_remaining`, …); `on conflict do nothing`.
4. **Verify**: `GET /admin/communications/parity` computes, for every role and catalogue key, the effective config the old path and the new path would use, and lists any difference. Read switch only when it is empty.
5. **Switch reads** behind `settings.comms_source = 'legacy' | 'module'` (DB setting, default `legacy`; flipping back is one click). The sender and jobs read the new path only after the flip; queued rows are untouched.
6. **Contract** (later PR, after ≥ 2 weeks clean): legacy settings keys become read-only aliases, then are removed; `WA_*` keys in `integration_config` cleared through the UI. Env fallbacks stay for local/e2e.

## 3. Phases (each a shippable PR, smallest first) — revised for the owner answers (2026-10-22)

N live numbers with per-number routing is core work (answer 1); the env fuse is gone (answer 2).

| # | PR | Scope | Visible result |
|---|---|---|---|
| 0 | Design | docs/23, 23a (#131) | decisions |
| 1 | «ماذا يُرسل ومتى» (read-only) — **built** | shared `notifications/catalogue.ts` (every §B2/§B3 producer; test: every `TEMPLATE_KEYS` producer and `push_kind` is in it); `GET /admin/notifications` (`settings.read`) with each row's state from today's settings, first blocker in words; table on `/admin/settings` and a list on mobile admin; last good line check kept in `wa_line_health` (migration 600) | admin sees every notification, its number and state, without a live Meta call |
| 2 | Safer settings, no env fuse — **built** | Arabic labels in «التكاملات», raw keys only under «للمطوّر»; confirm dialogs for sending on/off, automatic messages, emptying the allow-list; honest gate chip; `MESSAGING_ENABLED` removed from API, config, CI, e2e: sending = `settings.messaging_enabled` (only a stored `true`) + allow-list, fail-closed, no migration touches it | no env words, no silent dangerous saves, one switch |
| 3 | Numbers as records — **built** (migrations 620–621, `apps/api/src/modules/numbers/`, web «الأرقام», mobile read-only list); **reviewed** (2026-10-23: a role change or disable unsets `is_default`, a new phone id drops its cached health, the import is audited, module mode fails closed at boot, refreshes are ordered, confirmations before a default changes) | `wa_numbers` (any number of rows; `purpose` becomes a preset/default role, no one-per-role unique); Vault per number (`wa_number:<id>:*` RPCs); «استيراد الإعداد الحالي» (dry-run, idempotent, server-side copy); `GET …/parity`; `settings.comms_source = legacy \| module` (default legacy); `NumbersConfig` behind `WhatsappModule`; `messages.number_id` | numbers as cards; sends unchanged until the flag flips |
| 4 | Notification rules — **built** (migration `20261024000632`, `apps/api/src/modules/notification-rules/`, producers via `NotificationPolicy`, web «الإشعارات» tab `apps/web/src/features/notification-rules/`, mobile toggles `apps/mobile/src/ops/notif-rules/`; build notes docs/23b) | `notification_rules` (overrides; copied from today's settings) + `NotificationPolicy` with legacy fallback; producers read it; rows editable with timings (day-before hour, teacher lead time); essential rows off only with a typed confirmation + activity-log entry (answer 3); `number_id` per row (nullable = the template's number) | scattered switches replaced |
| 5 | Routing per number — **built** (migration `20261024000633`, contract docs/23c; `packages/shared/src/numbers/routing.ts`, `messaging/reply-number.ts`; sender `apps/api/src/modules/whatsapp/number-route*.ts`, `number-clients.ts`, `message.sender.ts`; inbound `webhook/webhook.lines.ts`; inbox `inbox/send-number.ts`; approvals `whatsapp/template-number-*.ts`; web «يُرسل من» `apps/web/src/features/messaging/templates/lines/SendFromCell.tsx`; all behind `comms_source = module`) | `(template key, number)` approvals (one Meta template per WABA) and a number per catalogue row; per-(phone, number) reply windows (`v_threads` per number, `replyNumber()` replaces `replyLine()`); inbound routed by `phone_number_id` → number; sender sends from the row's number; fallback order when a number is off | any number of live numbers, each template / notification picks its number |
| 6 | One place — **built** (2026-10-24, branch `cloud/communications-hub`; no migration, no API change): web «التواصل» at `/admin/settings/communications` with tabs نظرة عامة · الأرقام · الإشعارات · القوالب · الحماية (`apps/web/src/features/settings/pages/communications/` `OverviewTab.tsx`, `OverviewNumbers.tsx`, `OverviewWhat.tsx`, `PublicNumber.tsx`, `SafetyTab.tsx`, `CrmCutoverCard.tsx`, `NumbersTab.tsx`; tabs and aliases `page-search.ts`); `/admin/communications` redirects there with its query (`apps/web/src/routes/admin/communications.tsx`); `?tab=sending` → overview, `?tab=timing` → «القيم» `?group=messages`; WhatsApp/Kapso/allow-list groups moved from «التكاملات» (`features/integrations/integration-places.ts`); CRM cut-over asks both ways; mobile overview `apps/mobile/src/ops/comms/` + catalogue toggles unchanged | `/admin/communications` tabs (overview, numbers, notifications, templates, safety) on web; mobile overview + catalogue toggles with the same confirmations; settings sections become a link | one module, web + mobile |
| 7 | Contract | after `comms_source = module` for ≥ 2 weeks: legacy settings keys and `WA_*` line keys removed, `wa_line` kept only as the preset role | cleanup |
| later | Personal mutes «إشعاراتي» (answer 4) | reuses the catalogue | — |

Every PR: unit tests next to the code, e2e journeys against `tools/wa-stub` only (stub gains a numbers list in 3), CI green; no test calls Meta, Kapso, Expo or any hosted service; each migration expands only, never turns sending on.

## 4. Risks

- **Double sends.** A config switch never enqueues; dedup keys are unchanged; one sender. Remaining risk: an in-flight Graph call during a number swap (answer lost, row retried on the new number). Mitigation: saving a number pauses that role's queue for one sender pass (same mechanism as the auth hold) and the swap dialog says so; no automatic failover (docs/19).
- **Lost sends during migration.** The read switch is a flag with parity check; rows stay `queued` while a role is unconfigured (today's behaviour); the overview shows queued counts per number.
- **Template / number mismatch.** A template approved on one WABA does not exist on another. Moving a number to another WABA, or a template to another role, shows the templates that will stop (status `missing` after sync) before saving.
- **Kapso vs Meta.** Kapso cannot upload samples (`report_ready` submit needs Meta), has a project-wide key and webhook, and has no templates in sandbox (docs/19). The number card shows per-provider capabilities; the import keeps the provider as is.
- **Catalogue drift.** A producer added without a catalogue entry would be ungoverned: a unit test asserts every `TEMPLATE_KEYS` producer and every `push_kind` is in the catalogue.
- **Turning off a transactional message** (booking, report) could leave a family uninformed. Rows marked «أساسي» need a typed confirmation and are logged in the activity log.

## 5. Questions for the owner

1. **How many numbers?** (a) two named roles (notifications / chat), numbers as records with a spare ready to swap in — **recommended**: same behaviour, ~1/3 of the cost, credentials and UI already per number; (b) any number of live numbers with per-template routing — ~3× the work and changes reply-window logic; (c) keep keys as today, only reorganise the screens — cheapest, does not make numbers customisable.
2. **The env fuse `MESSAGING_ENABLED`.** (a) keep it as a deployment-level fuse, shown read-only in the overview — **recommended**: it is what keeps staging from reaching real families if the DB is copied; (b) remove it and rely on the DB switch and the allow-list only.
3. **May an admin turn off booking confirmations and the report PDF?** (a) yes, with a typed confirmation and an activity-log entry — **recommended**: one catalogue, no hidden exceptions; (b) no, they stay locked on; (c) only per booking («لا ترسل تأكيدًا» in the wizard), never globally.
4. **Personal notification preferences (staff mute per kind / channel) in this module?** (a) later, after phase 5 — **recommended**: the catalogue first, then a «إشعاراتي» page reusing it; (b) now, in phase 3; (c) never: role permissions are enough.
