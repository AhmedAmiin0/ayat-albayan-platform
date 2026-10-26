# 26a — Config survey: every key, SQL dependency, API route and client (2026-10-23)

Evidence for `docs/26-config-redesign.md`. A read-only survey of `develop` at `4ab4928` (after #138, the settings
segregation of docs/25). Four parts, one per area; every claim carries a `file:line` ref relative to the repo root
(abbreviations are defined at the top of each part). The classification column of part A applies the docs/26 §1
criteria: **CONFIG** = scalar, independent, no relations, no secret, no confirmation flow → the one key/value/description
store («القيم»); **MODULE:x** = a named module with its own design.

- [Part A — every key](#part-a) (registry, Google rows, custom values, integrations, env, other config-like tables)
- [Part B — SQL readers and writers](#part-b) (functions, views, RLS, Vault, e2e SQL, compat requirements)
- [Part C — API](#part-c) (modules, routes, permissions, readers, send gate, caches, jobs)
- [Part D — clients](#part-d) (today's `/admin/settings` control inventory, web query keys, translations, mobile, e2e)

No values of secrets, ids, phone numbers or personal data appear here: key names only.


<a id="part-a"></a>

## Part A — every configuration key

Branch `cloud/config-redesign-design`, read-only survey, 2026-10-23. All refs are `file:line` relative to the repo root.
Abbreviations: `D/` = `packages/shared/src/settings/domains/`, `M/` = `packages/db/supabase/migrations/`, `L` = `packages/shared/src/settings/layout.ts`.
Classification column: **CONFIG** = scalar (or small shape-validated JSON), independent, no relations, no secret, no confirmation flow → candidate for the merged key/value/description store. **MODULE:x** = belongs to a heavier module design.

---

### 1. Settings registry (`public.settings`, `SETTINGS_REGISTRY`)

Registry: `packages/shared/src/settings/registry.ts:25-41` spreads 15 domain files (order: messaging, notifications, follow-ups, feedback, scheduling, classroom, recordings, reports, subscriptions, payouts, finance, uploads, academy, sales, activity). Types: `packages/shared/src/settings/defs.ts:17-74` (`int` [nullable + toggle], `bool`, `string`, `e164`/`tz`/`currency`, `int_list`, `enum`, `json` [shape, nullable]). Page sections: `L:7-17` (`messaging, schedule, classroom, reports, accounts, uploads, academy, sales, appearance`; `appearance` is empty — the theme is per browser, `apps/web/src/features/platform/settings/sections/AppearanceSection.tsx:10`).

Table `public.settings`: `M/20261001000073_settings.sql:2-7` — `key text pk, value jsonb not null, updated_at, updated_by → auth.users`; RLS admin read (`:19-21`), service role writes. No `description` column, no type column, no check on key. `SettingsService.write` deletes the row when the value is `null` (`apps/api/src/common/settings/settings.service.ts:51-63`), so nullable keys "OFF" = no row.

i18n: every `labelKey`/`hintKey`/`toggle*Key` below exists in `packages/shared/i18n/ar.json` (checked). `tpl` = `templates.settings`, `h` = `settings.hints`.

| # | key | domain file:line | type | default | bounds / options | public | form:false | labelKey / hintKey | section (`L` line) | seed migration | SQL reader | API readers (`apps/api/src/modules/<m>/<m>.settings.ts`) | proposed classification |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `messaging_enabled` | `D/messaging.ts:7` | bool | false | — | | **yes** | `tpl.messagingEnabled` / `tpl.messagingEnabledHint` | messaging (`L:23`) | `M/20261001000142_messaging.sql:89` | — | whatsapp (SendGate), notification-rules (catalogue) | **MODULE:messaging-safety** — the send gate (fail-closed: only stored `true` opens, `apps/api/src/modules/messaging/whatsapp/gate/send-gate.ts`); confirm dialog both ways |
| 2 | `auto_messages_enabled` | `D/messaging.ts:8` | bool | false | — | | **yes** | `tpl.autoMessages` / `tpl.autoMessagesHint` | messaging (`L:24`) | `M/…000162_auto_messages.sql:8` | — | whatsapp, follow-ups, lesson-rating, reminders, subscriptions, notification-rules | **MODULE:messaging-safety** — second global gate for job-made sends (`SendGate.automaticOn`); confirm dialog both ways |
| 3 | `crm_cutover_done` | `D/messaging.ts:9` | bool | false | — | | **yes** | `tpl.crmDone` / `tpl.crmDoneHint` | messaging (`L:25`) | **none** (never seeded) | — | **none** (UI-only: `MessagingSwitch.tsx`, `AutoMessagesSwitch.tsx`, mobile `ReadOnlySettings.tsx:14`) | **MODULE:messaging-safety** — guards/annotates the two switches; docs/23 §2d puts «CRM cut-over» in «الحماية والتجربة» |
| 4 | `quick_reply_window_hours` | `D/messaging.ts:11` | int | 48 | 1..168 | | | `settings.quickReplyWindowHours` / `h.quickReplyWindowHours` | messaging (`L:35`) | `M/20261005000206_settings_registry.sql:17` | — | webhook | CONFIG (inbound «نعم» matching; may later become per-number reply-window param, docs/23 phase 5) |
| 5 | `reminder_minutes_before` | `D/notifications.ts:7` | int | 60 | 5..720 | | | `tpl.reminderMinutesBefore` / `h.reminderMinutesBefore` | messaging (`L:27`) | `M/…000142_messaging.sql:87` | — | reminders, notification-rules | **MODULE:notifications** — becomes `notification_rules.timing {minutes_before}` of `lesson_reminder` (docs/23 §2b) |
| 6 | `reminder_24h_enabled` | `D/notifications.ts:11` | bool | false | — | | | `tpl.reminder24hEnabled` / `tpl.reminder24hHint` | messaging (`L:28`) | `M/…000142_messaging.sql:88` | — | reminders, notification-rules | **MODULE:notifications** — `lesson_reminder_24h.enabled` |
| 7 | `teacher_whatsapp_new_student` | `D/notifications.ts:13` | bool | true | — | | | `tpl.teacherWhatsappNewStudent` / `…Hint` | messaging (`L:29`) | `M/20261012000382_teacher_whatsapp.sql:28` | — | booking, notification-rules | **MODULE:notifications** — `teacher_new_student.enabled` |
| 8 | `teacher_whatsapp_lesson_reminder` | `D/notifications.ts:18` | bool | true | — | | | `tpl.teacherWhatsappLessonReminder` / `…Hint` | messaging (`L:30`) | `M/…000382_teacher_whatsapp.sql:29` | — | reminders, notification-rules | **MODULE:notifications** — `teacher_lesson_reminder.enabled` |
| 9 | `reminder_lookahead_hours` | `D/notifications.ts:23` | int | 25 | 25..72 | | | `settings.reminderLookaheadHours` / `h.reminderLookaheadHours` | messaging (`L:32`) | `M/…000206_settings_registry.sql:18` | — | reminders | CONFIG (job scan-window knob, not per-rule; borderline → could be a notifications engine param) |
| 10 | `follow_up_hours` | `D/follow-ups.ts:7` | int_list | [24, 72] | 1..720, ≤5 items, strictly ascending | | | `tpl.followUpHours` / `tpl.followUpHoursHint` | messaging (`L:31`) | `M/…000142_messaging.sql:86` | — | follow-ups, **leads**, notification-rules | **MODULE:notifications** — `follow_up_slots.timing {hours}`; note leads also reads it |
| 11 | `follow_up_slots_from_hours` | `D/follow-ups.ts:12` | int | 12 | 1..168 | | | `settings.followUpSlotsFromHours` / `h.…` | messaging (`L:33`) | `M/…000206_settings_registry.sql:19` | — | follow-ups | **MODULE:notifications** — content parameter of the `follow_up_slots` message (borderline) |
| 12 | `follow_up_slots_to_days` | `D/follow-ups.ts:17` | int | 7 | 1..30 | | | `settings.followUpSlotsToDays` / `h.…` | messaging (`L:34`) | `M/…000206_settings_registry.sql:20` | — | follow-ups | **MODULE:notifications** — same as #11 (borderline) |
| 13 | `feedback_mode` | `D/feedback.ts:8` | enum | `buttons` | `buttons`, `link` | | **yes** | `tpl.feedbackMode` / — (no hint) | messaging (`L:26`) | `M/20261001000195_lesson_rating.sql:21` | — | lesson-rating, notification-rules | **MODULE:notifications** — `lesson_rating.enabled` (docs/23 §2b: replaces `feedback_mode='buttons'`); own chip control, no confirm |
| 14 | `feedback_rate_window_min` | `D/feedback.ts:9` | int | 10 | 1..120 | | | `settings.feedbackRateWindowMin` / `h.…` | **academy** (`L:54`) (owner file ≠ section) | `M/…000206_settings_registry.sql:21` | — | feedback | CONFIG |
| 15 | `booking_horizon_weeks` | `D/scheduling.ts:5` | int | 5 | 1..12 | | | `settings.bookingHorizonWeeks` / `h.…` | schedule (`L:37`) | `M/20261001000073_settings.sql:16` | — | booking, lessons, scheduling | CONFIG |
| 16 | `late_cancel_hours` | `D/scheduling.ts:10` | int **nullable** (null = OFF), `onValue` 24 | null | 1..168 | | | `settings.lateCancelHours`; toggle `settings.lateCancel` / `settings.lateCancelHint` (no hintKey) | schedule (`L:37`) | `M/…000073_settings.sql:15` (JSON null) | — | lessons, reports | CONFIG (needs nullable/toggle support in the merged store) |
| 17 | `makeup_window_days` | `D/scheduling.ts:16` | int | 60 | 1..365 | **yes** | | `settings.makeupWindowDays` / `h.…` | schedule (`L:37`) | `M/…000206_settings_registry.sql:15` | — | booking | CONFIG |
| 18 | `teachers_always_available` | `D/scheduling.ts:24` | bool | true | — | | | `settings.teachersAlwaysAvailable` / `h.…` | schedule (`L:37`) | `M/20261012000320_teachers_always_available.sql:7` | — | booking, lessons, teachers | CONFIG |
| 19 | `join_opens_before_min` | `D/classroom.ts:6` | int | 15 | 0..180 | **yes** | | `settings.joinOpensBeforeMin` / `h.…` | classroom (`L:38`) | `M/…000206_settings_registry.sql:12` | — | classroom, reminders, sales | CONFIG |
| 20 | `join_closes_after_min` | `D/classroom.ts:11` | int | 120 | 0..720 | **yes** | | `settings.joinClosesAfterMin` / `h.…` | classroom (`L:38`) | `M/…000206_settings_registry.sql:13` | — | classroom, reminders, sales | CONFIG |
| 21 | `default_meeting_title` | `D/classroom.ts:16` | string | `اجتماع` | 1..60 chars | | | `settings.defaultMeetingTitle` / `h.…` | classroom (`L:38`) | `M/…000206_settings_registry.sql:14` | — | classroom | CONFIG |
| 22 | `meeting_link_auto` | `D/classroom.ts:25` | bool | false | — | **yes** | | `settings.meetingLinkAuto` / `h.meetingLinkAuto` | classroom (`L:38`) | `M/20261012000330_meeting_link_auto.sql:10` | — (comment only in `M/20261019000490_teacher_meeting_mode.sql:13`) | booking, google-sync, lessons, reminders, sales, teachers | CONFIG — but it is the academy default of per-teacher `teachers.meeting_mode` (null = follow it); keep the semantics |
| 23 | `recording_consent_notice` | `D/recordings.ts:9` | json **nullable** `{ar?, en?}` text ≤1000 each | null | shape | **yes** | | `config.recordingConsentNotice` / `config.recordingConsentNoticeHint` | academy (`L:56`) | **none** | — | **none** ("no consumer yet") | CONFIG (bilingual text; arguably belongs to translations, see §7) |
| 24 | `recording_retention_days` | `D/recordings.ts:15` | int **nullable** (null = keep forever), `onValue` 90 | null | 1..3650 | | | `config.recordingRetentionDays`; toggle `config.recordingRetentionOn` / `config.recordingRetentionHint` | academy (`L:57`) | **none** | — | student-recordings | CONFIG — destructive (deletes recordings) yet **no confirmation** today; candidate for a confirm |
| 25 | `report_teacher_edit_hours` | `D/reports.ts:7` | int | 24 | 0..168 | | | `settings.reportTeacherEditHours` / `h.…` | reports (`L:39`) | `M/20261001000123_subscription_balance.sql:90` | — | reports | CONFIG |
| 26 | `renewal_alert_remaining` | `D/subscriptions.ts:10` | int | 2 | 0..10 | | | `settings.renewalAlertRemaining` / `h.…` | accounts (`L:42`) | `M/…000123_subscription_balance.sql:88` | **yes** `M/20261005000100_student_list_filters.sql:15` (coalesce 2) | subscriptions, notification-rules | CONFIG — dual-use: business threshold (SQL student-list filter, admin task) **and** docs/23 `renewal_due.timing {remaining}`; moving it into `notification_rules` would orphan the SQL reader |
| 27 | `subscription_expiry_days` | `D/subscriptions.ts:15` | int | 7 | 1..90 | | | `settings.subscriptionExpiryDays` / `h.…` | accounts (`L:43`) | `M/20261015000441_student_statuses_defaults.sql:9` | — | subscriptions | CONFIG |
| 28 | `flag_future_lessons_when_unpaid` | `D/subscriptions.ts:19` | bool | true | — | | | `settings.flagFutureLessonsWhenUnpaid` / `h.…` | accounts (`L:44`) | `M/…000123_subscription_balance.sql:89` | — | subscriptions | CONFIG |
| 29 | `payout_count_late` | `D/payouts.ts:10` | bool | false | — | | | `settings.payoutCountLate` / `h.payoutCountLate` | accounts (`L:45`) | `M/…000123_subscription_balance.sql:92` | **yes** `M/20261005000200_teacher_pay_rule.sql:34`, `M/20261001000177_teacher_earnings_sync.sql:35-36` | lessons, payouts | CONFIG (SQL-read, money-affecting; MODULE:payouts only if pay rules become per-teacher) |
| 30 | `payout_count_no_show` | `D/payouts.ts:11` | bool | false | — | | | `settings.payoutCountNoShow` / `h.payoutCountNoShow` | accounts (`L:46`) | `M/…000123_subscription_balance.sql:93` | **yes** same as #29 (`…000200:35`, `…000177:37-38`) | lessons, payouts | CONFIG (same note) |
| 31 | `payout_count_trials` | `D/payouts.ts:12` | bool | false | — | | | `settings.payoutCountTrials` / — (no hint) | accounts (`L:47`) | `M/20261005000200_teacher_pay_rule.sql:24` | **yes** `M/…000200:36` | **none in TS** (SQL only) | CONFIG (same note) |
| 32 | `reporting_currency` | `D/finance.ts:7` | currency (ISO 4217) | `SAR` | `^[A-Z]{3}$` | | | `settings.reportingCurrency` / `h.…` | accounts (`L:41`) | `M/…000123_subscription_balance.sql:91` | — | dashboard, expenses, receivables | CONFIG |
| 33 | `fx_fresh_hours` | `D/finance.ts:9` | int | 24 | 1..168 | | | `settings.fxFreshHours` / `h.…` | accounts (`L:48`) | `M/…000206_settings_registry.sql:22` | — | fx | CONFIG |
| 34 | `upload_max_mb` | `D/uploads.ts:7` | int | 10 | 1..10 (bucket ceiling, migrations 122/170) | **yes** | | `settings.uploadMaxMb` / `h.…` | uploads (`L:50`) | `M/…000206_settings_registry.sql:16` | — | booking, inbox, payments, sales-money | CONFIG (max tied to Storage bucket `file_size_limit`) |
| 35 | `academy_whatsapp_e164` | `D/academy.ts:11` | e164 | (a +966 number) | E.164 | **yes** | | `settings.academyWhatsapp` / `h.academyWhatsapp` | academy (`L:52`) | `M/…000206_settings_registry.sql:23` | — | report-pdf | CONFIG — public contact; docs/23 §2d shows it on the comms overview as «الرقم المعلن للأسر» but keeps it edited here; unrelated to the sending lines |
| 36 | `academy_timezone` | `D/academy.ts:15` | tz (IANA) | `Asia/Riyadh` | valid IANA | | | `settings.academyTimezone` / `h.…` | academy (`L:53`) | `M/…000206_settings_registry.sql:24` | **yes** `M/20261006000273_assistant_statements.sql:323` (coalesce `Asia/Riyadh`) | expenses, invoices, lessons, payments | CONFIG |
| 37 | `academy_contact` | `D/academy.ts:23` | json `{site? host≤100, email? ≤120}` | `{site: ayatalbayan.com}` | shape | **yes** | | `config.academyContact` / `config.academyContactHint` | academy (`L:55`) | **none** (default from code) | — | report-pdf | CONFIG (structured JSON; branding candidate) |
| 38 | `activity_retention_days` | `D/activity.ts:9` | int | 180 | 1..3650 | | | `config.activityRetentionDays` / `config.activityRetentionDaysHint` | academy (`L:58`) | **none** (SQL falls back to 180) | **yes** `M/20261005000250_custom_config.sql:38` `prune_activity_log()` (accepts only `^[1-9][0-9]{0,3}$`) | **none in TS** (SQL only) | CONFIG (destructive prune, no confirm) |
| 39 | `sales_auto_assign` | `D/sales.ts:5` | bool | true | — | | **yes** | `sales.assign.auto` / `sales.assign.autoHint` | sales (`L:60`) | `M/20261001000187_sales_scope.sql:66` | — | booking, sales | CONFIG (own switch `apps/web/src/features/sales/sales/SalesAutoAssignSwitch.tsx`, saves instantly, no confirm) |

Key facts:
- **39 registry keys**; `SETTINGS_LAYOUT` places all 39 (messaging 13, schedule 4, classroom 4, reports 1, accounts 8, uploads 1, academy 7, sales 1, appearance 0).
- **Public (8):** `makeup_window_days`, `join_opens_before_min`, `join_closes_after_min`, `meeting_link_auto`, `recording_consent_notice`, `upload_max_mb`, `academy_whatsapp_e164`, `academy_contact` (rows 17, 19, 20, 22, 23, 34, 35, 37; filter at `packages/shared/src/settings/public.ts:10`).
- **form:false (5):** `messaging_enabled`, `auto_messages_enabled`, `crm_cutover_done`, `feedback_mode`, `sales_auto_assign`.
- **Nullable (3):** `late_cancel_hours`, `recording_retention_days` (int + toggle), `recording_consent_notice` (json).
- **SQL readers (8 keys, 5 functions):** `renewal_alert_remaining`, `academy_timezone`, `activity_retention_days`, `payout_count_late`, `payout_count_no_show`, `payout_count_trials` (and the non-registry `google_sync_enabled`, `google_calendar_window_days`, §3). Each has its own coalesce default that must equal the registry default.
- **Never seeded (5):** `crm_cutover_done`, `recording_consent_notice`, `recording_retention_days`, `academy_contact`, `activity_retention_days` → they exist only as code defaults until an admin saves.
- **No TS reader (4):** `crm_cutover_done` (UI only), `recording_consent_notice` (no consumer), `payout_count_trials` and `activity_retention_days` (SQL only).
- **Owner file ≠ page section:** `feedback_rate_window_min` (feedback.ts → academy section); `payout_*`, `fx_fresh_hours`, `reporting_currency` sit in «accounts».
- **Mobile** edits 7 keys by hand (`apps/mobile/src/ops/settings-form.ts:9-20`): `late_cancel_hours`, `booking_horizon_weeks`, `follow_up_hours`, `renewal_alert_remaining`, `subscription_expiry_days`, `report_teacher_edit_hours`, `reporting_currency`; shows the 3 messaging-safety switches read-only.
- **No `comms_source` key exists yet** (planned by docs/23 §2e step 5 / phase 3 as a DB setting `legacy | module`).
- Notification catalogue slice `CATALOGUE_SETTING_KEYS` (`packages/shared/src/notifications/catalogue-settings.ts:7-17`): `messaging_enabled, auto_messages_enabled, reminder_24h_enabled, teacher_whatsapp_lesson_reminder, teacher_whatsapp_new_student, feedback_mode, reminder_minutes_before, renewal_alert_remaining, follow_up_hours`.

#### 1a. Messaging / send-gate relevant keys (one place)

| key | role in sending |
|---|---|
| `messaging_enabled` | master send gate; `SendGate.open()` = WhatsApp configured (env/integrations) AND stored `true`; allow-list `WA_ALLOWED_RECIPIENTS` applied per recipient. No env fuse any more (docs/23 answer 2). |
| `auto_messages_enabled` | gate for job-made sends (reminders, follow-ups, renewals, rating) — `SendGate.automaticOn()` |
| `crm_cutover_done` | UI-only safety acknowledgement; changes warnings/chip risk state of the two switches |
| `reminder_minutes_before`, `reminder_24h_enabled`, `reminder_lookahead_hours` | reminders job timing / on-off |
| `teacher_whatsapp_new_student`, `teacher_whatsapp_lesson_reminder` | teacher WhatsApp per-notification switches |
| `feedback_mode` | `buttons` = auto `lesson_rating` message; `link` = none |
| `follow_up_hours`, `follow_up_slots_from_hours`, `follow_up_slots_to_days` | lead follow-up timing and proposed-slot window |
| `renewal_alert_remaining` | renewal notification threshold (and SQL list filter) |
| `quick_reply_window_hours` | inbound «نعم» → confirms lesson messaged within N h |
| `late_cancel_hours` | not messaging (lesson consumption policy) |
| `meeting_link_auto` | which link messages carry (fixed vs classroom), chosen at queue time; default of `teachers.meeting_mode` |
| `join_opens_before_min`, `join_closes_after_min` | guest-link validity used in messages |
| `academy_whatsapp_e164` | public contact number (wa.me link, report footer) — NOT a sending line |
| `comms_source` | does not exist yet |

### 2. Confirmation flows (web) — which keys

None of today's confirmations is a **typed** confirmation; all are a dialog with cancel as default focus. Typed confirmation is only *planned* (docs/23 owner answer 3: essential notifications off).

| key / value | control | confirmation | ref |
|---|---|---|---|
| `messaging_enabled` on **and** off | `MessagingSwitch` inside `DangerFrame` | `ConfirmSwitchDialog` (shows queued count, CRM warning) | `apps/web/src/features/messaging/messaging/MessagingSwitch.tsx:103-128`; `apps/web/src/features/settings/sections/MessagingSection.tsx:37-40` |
| `auto_messages_enabled` on and off | `AutoMessagesSwitch` inside `DangerFrame` | `ConfirmSwitchDialog` | `apps/web/src/features/messaging/messaging/AutoMessagesSwitch.tsx:60`; `MessagingSection.tsx:42-44` |
| `crm_cutover_done` | button in `MessagingSwitch` | none (instant `useSettingSwitch`) | `MessagingSwitch.tsx:51,65` |
| `feedback_mode` | `FeedbackModeSwitch` | none (instant) | `apps/web/src/features/messaging/FeedbackModeSwitch.tsx:18` |
| `sales_auto_assign` | `SalesAutoAssignSwitch` | none (instant) | `apps/web/src/features/sales/sales/SalesAutoAssignSwitch.tsx:16` |
| `WA_ALLOWED_RECIPIENTS` emptied (integration key) | `IntegrationsForm` | `ConfirmSwitchDialog` | `apps/web/src/features/platform/integrations/IntegrationsForm.tsx:59` |
| integration secret clear | `SecretIntegrationRow` | `Dialog` | `apps/web/src/features/platform/integrations/rows/SecretIntegrationRow.tsx:82` |
| `google_sync_enabled` on (off is instant) | `SyncSwitches` | `LiveConfirmDialog` (names targets) when live, else plain `Dialog` | `apps/web/src/features/platform/google-sync/SyncSwitches.tsx:23-60` |
| `google_sync_mode` → `live` (back to dry_run instant) | `ModeControl` | `LiveConfirmDialog` | `apps/web/src/features/platform/google-sync/connection/ModeControl.tsx:16-46` |

Shared kit: `apps/web/src/components/settings/dialogs/ConfirmSwitchDialog.tsx:23`, `apps/web/src/components/settings/fields/DangerFrame.tsx:5`, `apps/web/src/lib/settings/use-setting-switch.ts:15` (instant PATCH /settings for a form:false key). docs/23a §C1 still says auto messages has «no confirm» — stale since docs/23 phase 2.

### 3. Google-sync rows (`GOOGLE_SETTING_KEYS`) — in `public.settings`, outside the registry

`packages/shared/src/google/settings-keys.ts:5-9`; seeded `M/20261022000610_google_sync.sql:183-187` (`on conflict do nothing`); rollback comment `:194` deletes `key like 'google\_%'`. Written only by `PUT /admin/google/settings` via `apps/api/src/modules/platform/google-sync/google-settings.ts:30-37` (direct upsert, bypasses `SettingsService` cache and its `/settings` audit); read fresh (no cache) `:24-28`. Disjointness test `packages/shared/src/google/settings-keys.test.ts`.

| field | key | type | default | bounds | SQL reader | confirm | classification |
|---|---|---|---|---|---|---|---|
| enabled | `google_sync_enabled` | bool | false (`M/…000610:184`) | — | `public.google_sync_on()` `M/20261022000611_google_sync_outbox.sql:37-39` | on: dialog | **MODULE:google-sync** |
| mode | `google_sync_mode` | enum | `dry_run` (`:185`) | `GOOGLE_SYNC_MODES` = `dry_run`, `live` (`packages/shared/src/google/enums.ts:14`) | — | →live: `LiveConfirmDialog` | **MODULE:google-sync** |
| window_days | `google_calendar_window_days` | int | 60 (`:186`) | 7..180 `GOOGLE_WINDOW_DAYS` (`enums.ts:50`) | `public.google_sync_window_days()` `M/…000611:43-47` (clamped) | none | **MODULE:google-sync** |

Write schema `packages/shared/src/google/schemas.ts:9-16`; read with defaults `google-settings.ts:5-17`. Reason: confirmation flow naming external targets, coupled to `google_account`, `google_teacher_calendars`, Vault `google:refresh_token` (§7).

### 4. `public.custom_config` (free-form «قيم مخصصة»)

Schema `M/20261005000250_custom_config.sql:5-12`:

| column | definition |
|---|---|
| `key` | `text primary key check (key ~ '^[a-z][a-z0-9_.-]{1,63}$')` |
| `value` | `jsonb not null check (octet_length(value::text) <= 8192)` |
| `description` | `text` (nullable; API caps at 300 chars) |
| `is_public` | `boolean not null default false` |
| `updated_at`, `updated_by` | trigger `set_updated_at` (`:14-16`), FK auth.users |

RLS `:21-26`: admin read, anon revoked, writes by service role only. Same migration redefines `prune_activity_log()` to read `settings.activity_retention_days` (`:31-48`).

Shared (`packages/shared/src/custom-config/`):
- `CUSTOM_KEY_RE = /^[a-z][a-z0-9_.-]{1,63}$/` — `schema.ts:5` (2..64 chars, allows `.` and `-`, unlike snake_case settings keys).
- `CUSTOM_VALUE_MAX_BYTES = 8192` — `schema.ts:7` (UTF-8 bytes of `JSON.stringify`).
- `customKeySchema` refuses registry keys (`reserved_key`) — `schema.ts:9-12`. It does **not** reserve `GOOGLE_SETTING_KEYS` (different table, so no collision today — but a merged store would collide).
- `customConfigUpsertSchema` `schema.ts:26-30`: `value` any JSON except null, ≤8 KB; `description` ≤300 nullable; `isPublic` default false.
- `publicCustom(rows)` `public.ts:11`: public rows only, drops any row shadowing a registry key → `GET /settings/public` `custom` (`packages/shared/src/custom-config/public-config.ts:8`).
- API: `apps/api/src/common/custom-config/custom-config.controller.ts` (`GET /config/custom`, `PUT/DELETE /config/custom/:key`, `settings.read`/`settings.write`, audit entity `custom_config`).

Seeded rows: **none** (no migration or `seed.sql` inserts into `custom_config`). Consumers: **none** in web/mobile/api beyond the admin panel and the `custom` block of `/settings/public` — no code reads any custom key.

### 5. Integrations (`public.integration_config` + Vault)

Table `M/20261012000310_integration_config.sql:10-15`: `key text pk check (key ~ '^[A-Z][A-Z0-9_]{2,63}$'), value text not null check (octet_length(value) <= 4096), updated_at, updated_by`; RLS admin read `:22-26`. Secrets: Vault name **`integration:<KEY>`** via `integration_secret_set/clear/secrets_read/secrets_status` (`:38-89`), whitelisted by `public.integration_secret_key_ok()` — redefined 4 times: `M/…000310:29` (8 keys) → `M/20261012000380_notification_bell.sql:50` (+`WEB_PUSH_VAPID_PRIVATE_KEY`) → `M/20261017000450_kapso_secret_keys.sql:13` (+`KAPSO_API_KEY`, `KAPSO_WEBHOOK_SECRET`) → `M/20261022000610_google_sync.sql:132` (+`GOOGLE_CLIENT_SECRET`) = 12. Pinned by `apps/api/src/common/integrations/secret-keys.migration.test.ts`.

Groups in page order `packages/shared/src/integrations/keys.ts:7`: `wa_notifications, wa_chat, kapso, wa_safety, livekit, expo, web_push, fx, google`. Plain list `keys.ts:10-31` (20), secret list `keys.ts:34-47` (12), `GROUP_OF` `keys.ts:62-96`, enums `keys.ts:115-120`, value checks `checks.ts:28-49` (max 4096 `checks.ts:9`). i18n `integrations.keys.<KEY>.label/.hint`. Env fallback: a non-empty DB value wins over `process.env` (`apps/api/src/config/env/env.ts` `loadEnv` / `validOverlay`); env schema location given.

| key | group | plain/secret | storage | check (`checks.ts`) | env schema (fallback) | code default when unset | proposed module |
|---|---|---|---|---|---|---|---|
| `WA_PROVIDER` | wa_notifications | plain | integration_config | enum `meta`/`kapso` | `apps/api/src/config/env/whatsapp/env.kapso.ts:16` | `meta` | numbers (per-number `provider`, docs/23 §2a) |
| `WA_API_BASE` | wa_notifications | plain | integration_config | url | `env.ts:40` | none | numbers (global, «الحماية») |
| `WA_API_VERSION` | wa_notifications | plain | integration_config | `^v\d+\.\d+$` | `env.ts:41` | yes | numbers (global) |
| `WA_PHONE_NUMBER_ID` | wa_notifications | plain | integration_config | id 1..200 | `env.ts:42` | none | numbers (per number) |
| `WA_WABA_ID` | wa_notifications | plain | integration_config | id | `env.ts:43` | none | numbers |
| `WA_APP_ID` | wa_notifications | plain | integration_config | id | `env.ts:49` | none | numbers |
| `WA_ACCESS_TOKEN` | wa_notifications | **secret** | Vault `integration:WA_ACCESS_TOKEN` | len ≤4096 | `env.ts:44` | none | numbers (→ `wa_number:<id>:access_token`) |
| `WA_APP_SECRET` | wa_notifications | **secret** | Vault | — | `env.ts:51` | none | numbers |
| `WA_VERIFY_TOKEN` | wa_notifications | **secret** | Vault | — | `env.ts:53` | none | numbers (global) |
| `WA_CHAT_PROVIDER` | wa_chat | plain | integration_config | enum | `env.kapso.ts:18` | `meta` | numbers |
| `WA_CHAT_PHONE_NUMBER_ID` | wa_chat | plain | integration_config | id | `env.ts:55` | none | numbers |
| `WA_CHAT_WABA_ID` | wa_chat | plain | integration_config | id | `env.ts:57` | none | numbers |
| `WA_CHAT_APP_ID` | wa_chat | plain | integration_config | id | `env.ts:63` | none | numbers |
| `WA_CHAT_ACCESS_TOKEN` | wa_chat | **secret** | Vault | — | `env.ts:59` | falls back to `WA_ACCESS_TOKEN` (`env.whatsapp.ts:127`) | numbers |
| `WA_CHAT_APP_SECRET` | wa_chat | **secret** | Vault | — | `env.ts:61` | none | numbers |
| `KAPSO_API_BASE` | kapso | plain | integration_config | url | `env.kapso.ts:23` | none | integrations (Kapso project, stays per docs/23) |
| `KAPSO_API_VERSION` | kapso | plain | integration_config | version | `env.kapso.ts:24` | yes | integrations |
| `KAPSO_API_KEY` | kapso | **secret** | Vault | — | `env.kapso.ts:26` | none | integrations |
| `KAPSO_WEBHOOK_SECRET` | kapso | **secret** | Vault | — | `env.kapso.ts:28` | none | integrations |
| `WA_ALLOWED_RECIPIENTS` | wa_safety | plain | integration_config | E.164 comma list | `env.ts:65` | unset = unrestricted | **messaging-safety** (emptying asks confirm) |
| `WA_TEMPLATE_SYNC` | wa_safety | plain | integration_config | enum `'true'`/`'false'` (stringbool) | `env.ts:67` | `true` | messaging-safety / numbers «الحماية» |
| `LIVEKIT_URL` | livekit | plain | integration_config | url | `env.ts:88` | none | integrations |
| `LIVEKIT_API_KEY` | livekit | **secret** | Vault | — | `env.ts:89` | none | integrations |
| `LIVEKIT_API_SECRET` | livekit | **secret** | Vault | — | `env.ts:90` | none | integrations |
| `EXPO_API_BASE` | expo | plain | integration_config | url | `env.ts:75` | none | integrations |
| `EXPO_ACCESS_TOKEN` | expo | **secret** | Vault | — | `env.ts:70` | none | integrations |
| `WEB_PUSH_VAPID_PUBLIC_KEY` | web_push | plain | integration_config | base64url 87 | `apps/api/src/config/env/env.web-push.ts:13` | none | integrations |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | web_push | **secret** | Vault | env: base64url 43 | `env.web-push.ts:15` | none | integrations |
| `WEB_PUSH_SUBJECT` | web_push | plain | integration_config | mailto:/https: | `env.web-push.ts:16` | none | integrations |
| `FX_API_URL` | fx | plain | integration_config | url | `env.ts:38` | yes (a public URL) | integrations |
| `GOOGLE_CLIENT_ID` | google | plain | integration_config | `…apps.googleusercontent.com` | `apps/api/src/config/env/env.google.ts:12` | none | integrations / google-sync |
| `GOOGLE_CLIENT_SECRET` | google | **secret** | Vault | — | `env.google.ts:13` | none | integrations / google-sync |

Other Vault entries (not integration keys): **`google:refresh_token`** — `M/20261022000610_google_sync.sql:144-178` (`google_token_set/_read/_clear`, never in the overlay). Planned (docs/23 phase 3): `wa_number:<id>:access_token`, `:app_secret`.

### 6. Env bootstrap (`apps/api/src/config/env/env.ts` + `env.<topic>.ts`) — names only

Integration keys (all 32 above) are also env keys (fallback). Env-only keys:

| key | ref | purpose |
|---|---|---|
| `PORT` | `env.ts:29` | listen port |
| `WEB_ORIGIN` | `env.ts:30` | CORS / links |
| `SUPABASE_URL` | `env.ts:31` | bootstrap DB |
| `SUPABASE_JWT_SECRET` | `env.ts:32` | secret |
| `SUPABASE_SERVICE_ROLE_KEY` | `env.ts:34` | secret, required |
| `SUPABASE_ANON_KEY` | `env.ts:36` | optional |
| `FEEDBACK_TOKEN_SECRET` | `env.ts:82` | HMAC secret (≥32), env/Vault, not in «التكاملات» |
| `MESSAGE_SENDER_POLL_MS` | `env.ts:92` | sender tick |
| `RECORDING_S3_ENDPOINT`, `_REGION`, `_BUCKET`, `_ACCESS_KEY`, `_SECRET` | `env.ts:97-101`, shape `env.recording.ts:15-19` | recording upload target (secrets **not** in integrations) |
| `SETTINGS_CACHE_MS` | `env.ts:107` | settings cache TTL (default 30 s; e2e 0); consumer `apps/api/src/common/settings/settings.module.ts:18` |
| `INTEGRATION_REFRESH_MS` | `env.ts:109` | integration reload period; unset → `SETTINGS_CACHE_MS` (`apps/api/src/common/integrations/integration-refresh.ts:12-13`) |
| `INTEGRATION_CONFIG_FROM_DB` | `env.ts:111` | `false` = env only, no DB overlay (default true) |
| `AUTH_PASSWORD_MIN_LENGTH` | `env.ts:116` | 6..72, default 8 |
| `GOOGLE_API_BASE` | `env.google.ts:15` | stub base, env-only by design |
| `GOOGLE_REDIRECT_URI` | `env.google.ts:17` | OAuth callback, env-only by design |
| `GOOGLE_SYNC_POLL_MS` | `env.google.ts:19` | outbox tick |

Helpers: `env.blank.ts` (`blankIsUnset`, `optionalSecret`, `optionalUrl`), `env.gaps.ts:8` (META_NOTIFICATION_KEYS boot-gap list), `env.whatsapp.ts:37-41` (chat-line key list). Overlay: `loadEnv()` and `validOverlay()` at the end of `env.ts` (DB values re-checked against this schema, a bad one dropped by KEY). Import: `pnpm --filter api config:import-env` (`apps/api/scripts/config-import-env.ts`). `MESSAGING_ENABLED` is gone (docs/23 phase 2).
Client env (not in API): web `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `VITE_INBOX_REFRESH_MS`; mobile `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEB_ORIGIN`.
Drift: `apps/api/.env.example` lists 20 keys explicitly; the WA_CHAT_*, KAPSO_*, WEB_PUSH_*, GOOGLE_*, `WA_ALLOWED_RECIPIENTS`, `WA_TEMPLATE_SYNC`, `SETTINGS_CACHE_MS`, `MESSAGE_SENDER_POLL_MS`, `AUTH_PASSWORD_MIN_LENGTH`, `SUPABASE_ANON_KEY` lines are absent (one comment line names the groups) — docs/25 §5 says each bootstrap key gets a line.

### 7. Other config-like tables (admin-edited, but rows/relations → module, not a key)

| table / column | migration | keyed by | why a module, not a key |
|---|---|---|---|
| `translation_overrides` (`key, locale, value ≤2000, pk(key,locale)`, anon/auth may SELECT) | `M/20261005000213_translation_overrides.sql:11-18` | i18n dotted key name (`^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$`) × locale | per-locale rows, placeholders validated against the bundle; **references settings `labelKey`/`hintKey` names** (`templates.settings.*`, `config.*`, `sales.assign.*`, `settings.*`), so renaming label keys orphans overrides (docs/25 §2). Natural home for bilingual texts like `recording_consent_notice`. |
| `wa_line_health` (`line wa_line pk, display_phone_e164, verified_name, checked_at`) | `M/20261022000600_wa_line_health.sql:8-14` | `wa_line` enum | system-written cache of last line check → MODULE:numbers (becomes `wa_numbers.health/display_phone_e164`). |
| `message_templates.line`, `.sales_starter` (+ `status`, `quality`, body cols) | `M/20261001000141_message_templates.sql:10`, `M/20261012000340_template_lines.sql:17-19` | template key | per-template flags («متاح للمعلمين والمبيعات» = `sales_starter`, admin toggle; `line` moved by admin «نقل إلى الرقم الآخر») → MODULE:numbers/templates. |
| `teachers.meeting_mode` (`static`/`platform`/null = follow `meeting_link_auto`) | `M/20261019000490_teacher_meeting_mode.sql:6-10` | teacher row | per-teacher override of a setting; plus `teachers.meeting_link`, `students.meeting_link_override` → classroom/people data. |
| `teachers.rate_30/45/60/90`, `max_students`, `tz` | `M/20261001000003_people.sql:2-21` | teacher row | per-teacher pay rates → MODULE:payouts data (the 3 `payout_count_*` keys are the global rule). |
| `assistant_terms` (commission/salary, constrained combos) | `M/20261006000271_assistant_money_tables.sql:24` | assistant (profile) | per-person money terms → payouts/sales-money module. |
| `expense_categories` (`key, label_ar, label_en, sort, active`, seeded) | `M/20261005000204_expenses_v2.sql:10-25` | key | admin-managed lookup list with labels/order → expenses module. |
| `roles`, `role_permissions` | `M/20261005000220_roles_permissions.sql:10-28` | role id × permission | RBAC, relational → roles module. |
| `chat_lists`, `chat_list_threads` | `M/20261020000520_chat_lists.sql:12,25` | list id | user data, relational. |
| `google_account` (singleton: status, email, scopes, `root_folder_id/name`, `summary_sheet_id`, `drive_confirmed_*`, `discovery`), `google_teacher_calendars`, `google_student_files` | `M/20261022000610_google_sync.sql:23-70` | singleton / teacher / student | OAuth state, confirmed targets → MODULE:google-sync (with the 3 settings rows and Vault `google:refresh_token`). |
| `fx_rates` | `M/20261001000061_fx_rates.sql:3` | currency/date | system cache governed by `fx_fresh_hours` + `FX_API_URL`; not admin config. |
| `teacher_availability`, `teacher_time_off` | `M/20261001000012_teacher_availability.sql:3,17` | teacher | schedule data (bypassed when `teachers_always_available`). |
| `notification_rules` | **not created yet** (docs/23 phase 4) | catalogue key | will absorb keys #5-8, #10-13 (and per docs/23 #26) as `enabled/channels/timing`. |
| `wa_numbers` | **not created yet** (docs/23 phase 3) | uuid | will absorb the WA_* line keys + `wa_line_health`. |
| Pricing (packages, prices, currencies) | **no table** — code constants `packages/shared/src/pricing/catalog.ts`, `packages/shared/src/money/usage/tiers.ts` (docs/08) | — | not admin-editable today; if made editable it is structured (package × duration × currency) → MODULE:pricing, never flat keys. |
| Theme / appearance | **no store** (per-browser theme toggle) | — | `appearance` section empty; branding (name, logo) not configurable today. |
| Storage bucket size limits | migrations 122, 170 | bucket | hard ceiling (10 MB) that bounds `upload_max_mb.max`. |

### 8. Counts

| bucket | n | keys |
|---|---|---|
| Registry keys (`public.settings`, typed) | **39** | §1 |
| — public | 8 | |
| — form:false | 5 | |
| — nullable | 3 | |
| — SQL-read | 6 | `renewal_alert_remaining`, `academy_timezone`, `activity_retention_days`, `payout_count_late/no_show/trials` |
| — never seeded | 5 | |
| Proposed **CONFIG** | **28** | rows 4, 9, 14-39: `quick_reply_window_hours`, `reminder_lookahead_hours`, `feedback_rate_window_min`, `booking_horizon_weeks`, `late_cancel_hours`, `makeup_window_days`, `teachers_always_available`, `join_opens_before_min`, `join_closes_after_min`, `default_meeting_title`, `meeting_link_auto`, `recording_consent_notice`, `recording_retention_days`, `report_teacher_edit_hours`, `renewal_alert_remaining`, `subscription_expiry_days`, `flag_future_lessons_when_unpaid`, `payout_count_late`, `payout_count_no_show`, `payout_count_trials`, `reporting_currency`, `fx_fresh_hours`, `upload_max_mb`, `academy_whatsapp_e164`, `academy_timezone`, `academy_contact`, `activity_retention_days`, `sales_auto_assign` |
| Proposed **MODULE:messaging-safety** | **3** | `messaging_enabled`, `auto_messages_enabled`, `crm_cutover_done` (+ integration keys `WA_ALLOWED_RECIPIENTS`, `WA_TEMPLATE_SYNC`) |
| Proposed **MODULE:notifications** | **8** | `reminder_minutes_before`, `reminder_24h_enabled`, `teacher_whatsapp_new_student`, `teacher_whatsapp_lesson_reminder`, `follow_up_hours`, `follow_up_slots_from_hours`, `follow_up_slots_to_days`, `feedback_mode` |
| Borderline (counted above as CONFIG) | 3 | `renewal_alert_remaining` (dual-use), `reminder_lookahead_hours`, `meeting_link_auto` (default of `teachers.meeting_mode`) |
| `GOOGLE_SETTING_KEYS` (settings rows outside registry) → **MODULE:google-sync** | **3** | §3 |
| `custom_config` keys seeded | **0** | §4 |
| Integration keys | **32** = 20 plain + 12 secret | §5; → numbers 15 (WA_* line keys incl. `WA_API_BASE/VERSION`, `WA_VERIFY_TOKEN`), messaging-safety 2, integrations 15 (Kapso 4, LiveKit 3, Expo 2, web push 3, FX 1, Google 2) |
| Env-only API keys | **20** | §6 (`PORT` … `GOOGLE_SYNC_POLL_MS`, counting RECORDING_S3_* as 5) |
| Other Vault names | 1 (+2 planned) | `google:refresh_token` |

28 CONFIG + 3 messaging-safety + 8 notifications = 39.

<a id="part-b"></a>

## Part B — every SQL dependency on `public.settings`, `public.custom_config`, `public.integration_config` and Vault `integration:*`

Scope: the 145 migrations in `packages/db/supabase/migrations`, `seed.sql`, `tools/**`, `e2e/**` raw SQL, and API PostgREST/RPC calls. All paths are relative to `/home/user/ayat-albayan-platform`. Abbreviation: `M/` = `packages/db/supabase/migrations/`.

Headline findings:
- **Live SQL readers of `public.settings`: 7 objects** (5 functions, 1 helper used by 2 views, 1 view). Every one of them reads `value` (jsonb) by `key`. None reads `updated_at`/`updated_by`.
- **`public.custom_config` and `public.integration_config` have no SQL readers at all.** Only the API (service role, PostgREST) and e2e SQL specs touch them.
- **No pg_cron, no realtime publication, no DB audit trigger** on any of the three tables. The only "cron" (`prune_activity_log`) runs from a Nest timer in the API (`M/20261005000205_activity_log.sql:48` says "pg_cron is not used in this repo").
- `seed.sql`, `tools/migrate`, `tools/scripts/seed-demo.mjs`, `clear-demo*`, `seed-test-account*` and `fix-teacher-data.sql`/`sync-roster.sql` touch **none** of the three tables.

---

### 1. Table definitions

| Table | Defined in | Columns | Constraints | Trigger | RLS / grants |
|---|---|---|---|---|---|
| `public.settings` | `M/20261001000073_settings.sql:2-21` | `key text PK`, `value jsonb not null`, `updated_at timestamptz not null default now()`, `updated_by uuid → auth.users(id)` | **no key check**, no size check | `settings_updated_at` BEFORE UPDATE → `public.set_updated_at()` (073:8) | RLS on; policy `settings_admin_read` FOR SELECT TO authenticated USING `public.is_admin()` (073:20). `M/20261001000110_lesson_hardening.sql:85-89`: `revoke all … from anon`; `revoke insert, update, delete, truncate, references, trigger … from authenticated` (authenticated keeps SELECT, filtered by RLS). Writes only by service role (bypasses RLS). |
| `public.custom_config` | `M/20261005000250_custom_config.sql:5-26` | `key text PK check (key ~ '^[a-z][a-z0-9_.-]{1,63}$')`, `value jsonb not null check (octet_length(value::text) <= 8192)`, `description text`, `is_public boolean not null default false`, `updated_at`, `updated_by → auth.users` | key regex, 8 KB value | `custom_config_updated_at` BEFORE UPDATE → `set_updated_at()` (250:14-16) | RLS on; `revoke all from anon` (250:22); policy `custom_config_admin_read` SELECT TO authenticated USING `is_admin()` (250:24); `custom_config_admin_write` dropped, never created (250:26). No explicit authenticated write revoke (RLS has no write policy → denied). |
| `public.integration_config` | `M/20261012000310_integration_config.sql:9-26` | `key text PK check (key ~ '^[A-Z][A-Z0-9_]{2,63}$')`, `value text not null check (octet_length(value) <= 4096)` (**text, not jsonb**), `updated_at`, `updated_by` | upper-case key regex, 4 KB | `integration_config_updated_at` BEFORE UPDATE (310:17-19) | RLS on; `revoke all from anon`; policy `integration_config_admin_read` SELECT TO authenticated USING `is_admin()` (310:25). |
| Vault `vault.secrets` rows named `integration:<KEY>` | `M/20261012000310_integration_config.sql:7` (`create extension supabase_vault`) | Vault-managed | key must pass `integration_secret_key_ok` | — | only via the security-definer RPCs below (service role) |

Related but separate namespace: Vault `google:refresh_token` (`M/20261022000610_google_sync.sql:146-177`, `google_token_set/_read/_clear`, service role only). Not part of the integration overlay.

Realtime: no `alter publication supabase_realtime …` anywhere in migrations; `packages/db/supabase/config.toml:88` only enables the service. None of the three tables is published.

`public.set_updated_at()` is defined once, `M/20261001000001_enums.sql:24` (plain invoker trigger function).

`public.is_admin()` — `M/20261001000002_profiles.sql` (all three read policies depend on it).

---

### 2. SQL readers of `public.settings` (live definitions)

| # | Object | Live definition (file:line) | Superseded | Op | Keys | Fallback in SQL | Registry default (`packages/shared/src/settings/domains`) | Equal? | Security | Missing row vs JSON null vs malformed |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `public.prune_activity_log()` (plpgsql, returns int) | `M/20261005000250_custom_config.sql:31-48` | `M/20261005000205_activity_log.sql:51-62` (fixed 180 days, no settings read) | read | `activity_retention_days` | `days := 180`, used unless `jsonb_typeof = 'number'` and text matches `^[1-9][0-9]{0,3}$` | `activity.ts:9-12` int default **180**, min 1, max 3650 | yes (180) | **SECURITY DEFINER**, `search_path=''`; execute revoked from public/anon/authenticated, granted to service_role | missing → 180; JSON null → 180; string/float (`30.0`) → 180; **1..9999 accepted** (registry max is 3650: SQL is laxer than the write side). No row is seeded, so today it always runs on the missing-row path unless an admin saved a value. Called by API `ActivityRetentionJob` via `rpc('prune_activity_log')` (`apps/api/src/common/activity/activity.retention.job.ts:32`), daily `setInterval` — not pg_cron. |
| 2 | `public.lesson_counts_for_pay(lesson_status, uuid)` (sql stable) | `M/20261005000200_teacher_pay_rule.sql:31-44` | — | read | `payout_count_late`, `payout_count_no_show`, `payout_count_trials` (one scan `where key in (…)`, `bool_or(key = … and value = 'true'::jsonb)`) | `coalesce(…, false)` each | `payouts.ts:10-12` bool default **false** ×3 | yes | **NOT security definer** (invoker), `search_path=''`; execute granted to authenticated + service_role (200:126-129) | only JSON `true` counts; missing / JSON null / `"true"` string / anything else → false. Because it is invoker-rights, an **authenticated non-admin** caller is filtered by `settings_admin_read` RLS and always sees false (pre-existing quirk). |
| 2a | `public.v_teacher_payable_lessons` (view, `security_invoker = true`) | `M/20261005000200_teacher_pay_rule.sql:102-114` | — | read (via #2) | same | same | same | yes | invoker; revoke writes from authenticated (200:122-124), SELECT kept | as #2; RLS of the *caller* on `settings` decides. |
| 2b | `public.v_teacher_countable_earnings` (view, `security_invoker = true`) | `M/20261005000200_teacher_pay_rule.sql:116-121` | `M/20261001000183_teacher_countable_earnings.sql:12` (no settings read) | read (via #2) | same | same | same | yes | invoker | as #2 |
| 3 | `public.sync_teacher_earning(uuid)` (plpgsql) — driven by trigger `lessons_sync_earning` on `public.lessons` and `resync_teacher_earnings()` | `M/20261005000200_teacher_pay_rule.sql:59-100` (calls #2 at line 74) | `M/20261001000177_teacher_earnings_sync.sql:19-60` (read `payout_count_late`/`no_show` directly at 177:35-38 with `coalesce(value = 'true'::jsonb, false)`) | read (via #2) | the three payout keys | false | false | yes | **SECURITY DEFINER** → runs as owner, bypasses RLS, sees the real values | as #2. 200:133 runs `resync_teacher_earnings(null)` once at migration time (reads settings during the migration). |
| 4 | `public.v_student_list` (view, `security_invoker = true`) | `M/20261005000100_student_list_filters.sql:10-33` (settings read 11-16) | — | read | `renewal_alert_remaining` | `coalesce(case when jsonb_typeof(value)='number' and value>=0 then value::numeric::int end, 2)` | `subscriptions.ts:10-13` int default **2**, 0..10 | yes | invoker; `grant select … to service_role` (33) | missing → 2; JSON null → 2; negative / non-number → 2; fractional is **rounded** (`2.5` → 3); >10 accepted. |
| 5 | `public.set_assistant_terms(uuid, jsonb, uuid)` (plpgsql) | `M/20261006000273_assistant_statements.sql:318-323` | — | read | `academy_timezone` | `coalesce(value #>> '{}', 'Asia/Riyadh')` | `academy.ts:15-18` tz default **'Asia/Riyadh'** | yes | **SECURITY DEFINER** | missing → Riyadh; JSON null → SQL NULL → Riyadh; an invalid tz string **raises** (`at time zone`), no validation in SQL. |
| 6 | `public.google_sync_on()` (sql stable) | `M/20261022000611_google_sync_outbox.sql:37-40` | — | read | `google_sync_enabled` | `coalesce(value = 'true'::jsonb, false)` | not in registry; `GOOGLE_SETTING_KEYS` (`packages/shared/src/google/settings-keys.ts`), API `GOOGLE_DEFAULTS.enabled = false` (`apps/api/src/modules/platform/google-sync/google-settings.ts:5`) | yes (false) | **SECURITY DEFINER**; execute only service_role (611:177-186) | only JSON `true` opens; missing / null / anything else → off. Called by triggers `lessons_google_sync_insert`, `lessons_google_sync_update` (via `google_sync_lessons_trg`, 611:121-126,141-149), `lesson_reports_google_sync` (`google_sync_reports_trg`, 611:129-134,150-152) and `google_sync_reconcile()` (611:107-119). **Every insert/update of `public.lessons` reads `settings`.** |
| 7 | `public.google_sync_window_days()` (sql stable) | `M/20261022000611_google_sync_outbox.sql:43-47` | — | read | `google_calendar_window_days` | `coalesce(least(greatest((value #>> '{}')::int, 7), 180) … where jsonb_typeof(value)='number', 60)` | `GOOGLE_WINDOW_DAYS = {min 7, max 180, default 60}` (`packages/shared/src/google/enums.ts:50`) | yes (60, clamp 7..180) | **SECURITY DEFINER**; service_role only | missing / null / non-number → 60; out of range clamped; **a fractional number (`60.5`) raises** `invalid input syntax for type integer` inside the lessons trigger (only reachable by direct SQL; the API writes integers). Used by `google_sync_enqueue_lesson` (611:82-90), `google_sync_reconcile` (611:113). |

No SQL reader exists for `late_cancel_hours`, `messaging_enabled`, `auto_messages_enabled`, `booking_horizon_weeks` or any other key. Their missing-vs-null semantics live only in the API (`readSettings`, `packages/shared/src/settings/validate.ts:40`):
- `late_cancel_hours`: seeded as **JSON null** (`M/073:14-16`); the API **deletes the row** for null (`apps/api/src/common/settings/settings.service.ts:50-58`, "PostgREST cannot store a JSON null"); both read back as the registry default `null` = OFF (`scheduling.ts:10-13`).
- `messaging_enabled`: only `=== true` opens (`apps/api/src/modules/messaging/whatsapp/gate/send-gate.ts:47`); seeded `false` (`M/20261001000142_messaging.sql:85-90`).
- Google keys: `readGoogleSettings` — enabled only `=== true`, mode falls back to `dry_run`, window to 60 (`google-settings.ts:8-16`).

Comments that name settings but contain no SQL: `M/20261019000490_teacher_meeting_mode.sql:2,13`, `M/20261012000410_meeting_schedule.sql:4`, `M/20261001000179_teacher_earnings_backfill.sql:4`, `M/20261005000220_roles_permissions.sql:70` (permission names `settings.read`/`settings.write`, not the table).

### 3. SQL writers of `public.settings` (migrations: seeds only, all `on conflict (key) do nothing` unless noted)

| File:line | Keys (seeded value) |
|---|---|
| `M/20261001000073_settings.sql:14-16` | `late_cancel_hours` = JSON `null`, `booking_horizon_weeks` = 5 (plain insert, no `on conflict`) |
| `M/20261001000123_subscription_balance.sql:87-94` | `renewal_alert_remaining` 2, `flag_future_lessons_when_unpaid` true, `report_teacher_edit_hours` 24, `reporting_currency` "SAR", `payout_count_late` false, `payout_count_no_show` false |
| `M/20261001000142_messaging.sql:85-90` | `follow_up_hours` [24,72], `reminder_minutes_before` 60, `reminder_24h_enabled` false, `messaging_enabled` false |
| `M/20261001000162_auto_messages.sql:7-9` | `auto_messages_enabled` false |
| `M/20261001000187_sales_scope.sql:66-67` | `sales_auto_assign` true |
| `M/20261001000195_lesson_rating.sql:21-22` | `feedback_mode` "buttons" |
| `M/20261005000200_teacher_pay_rule.sql:24-25` | `payout_count_trials` false |
| `M/20261005000206_settings_registry.sql:11-25` | `join_opens_before_min` 15, `join_closes_after_min` 120, `default_meeting_title` "اجتماع", `makeup_window_days` 60, `upload_max_mb` 10, `quick_reply_window_hours` 48, `reminder_lookahead_hours` 25, `follow_up_slots_from_hours` 12, `follow_up_slots_to_days` 7, `feedback_rate_window_min` 10, `fx_fresh_hours` 24, `academy_whatsapp_e164` (a phone number, value omitted), `academy_timezone` "Asia/Riyadh" |
| `M/20261012000320_teachers_always_available.sql:7-8` | `teachers_always_available` true |
| `M/20261012000330_meeting_link_auto.sql:10-11` | `meeting_link_auto` false |
| `M/20261012000382_teacher_whatsapp.sql:27-30` | `teacher_whatsapp_new_student` true, `teacher_whatsapp_lesson_reminder` true |
| `M/20261015000441_student_statuses_defaults.sql:9-10` | `subscription_expiry_days` 7 |
| `M/20261022000610_google_sync.sql:183-187` | `google_sync_enabled` false, `google_sync_mode` "dry_run", `google_calendar_window_days` 60 (outside the registry) |

Rollback comments that delete settings rows: 382:33, 441:30, 610:194 (`delete … where key like 'google\_%'`).
All seeded keys except the three `google_*` are registry keys (checked). `activity_retention_days` and many later registry keys are **not seeded** (missing row = default).

### 4. Vault `integration:*` and the `integration_secret_*` RPCs

All in `M/20261012000310_integration_config.sql` unless noted; all `search_path=''`; execute revoked from public/anon/authenticated and granted to service_role (310:91-100).

| Function | Live def | Superseded | Security | Op |
|---|---|---|---|---|
| `integration_secret_key_ok(text)` (sql immutable) — allow-list | `M/20261022000610_google_sync.sql:132-141` (12 keys: WA_ACCESS_TOKEN, WA_APP_SECRET, WA_VERIFY_TOKEN, WA_CHAT_ACCESS_TOKEN, WA_CHAT_APP_SECRET, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, EXPO_ACCESS_TOKEN, WEB_PUSH_VAPID_PRIVATE_KEY, KAPSO_API_KEY, KAPSO_WEBHOOK_SECRET, GOOGLE_CLIENT_SECRET) | 310:29-35 (8 keys), `M/20261012000380_notification_bell.sql:50-59` (+VAPID), `M/20261017000450_kapso_secret_keys.sql:13-23` (+Kapso) | invoker | pure |
| `integration_secret_set(text, text)` | 310:38-56 | — | DEFINER | write `vault.secrets` name `'integration:'||key` via `vault.create_secret`/`update_secret`; rejects blank/>4096 (22023) |
| `integration_secret_clear(text)` → bool | 310:59-71 | — | DEFINER | delete from `vault.secrets` |
| `integration_secrets_read()` → (key, value) | 310:74-80 | — | DEFINER | read `vault.decrypted_secrets` where name like `integration:%` and key_ok |
| `integration_secrets_status()` → (key, updated_at) | 310:83-89 | — | DEFINER | read `vault.secrets` (no values) |

Tests pin these: `apps/api/src/common/integrations/secret-keys.migration.test.ts` (latest `integration_secret_key_ok` must equal `INTEGRATION_SECRET_KEYS`), `kapso-secret-keys.migration.test.ts`, `apps/api/src/common/push/notification-bell.migration.test.ts:32`, `apps/api/src/modules/platform/google-sync/google-sync.migration.test.ts:14`.

### 5. API (PostgREST / RPC) readers and writers

| File:line | Table / RPC | Op | Notes |
|---|---|---|---|
| `apps/api/src/common/settings/settings.service.ts:67` | `settings` `select('key, value')` | read all | cached `SETTINGS_CACHE_MS`; `readSettings` fills defaults |
| `settings.service.ts:57-58` | `settings` `delete().eq('key')` / `upsert({key, value, updated_by})` | write | **null → delete row**; upsert relies on PK `key` as conflict target |
| `apps/api/src/common/settings/settings-meta.queries.ts:11` | `settings` `select('key, updated_at, updated_by')` | read | `GET /config/meta` — needs `updated_at`, `updated_by` columns |
| `apps/api/src/modules/platform/google-sync/google-settings.ts:25` | `settings` `select('key, value').in('key', google keys)` | read (uncached) | |
| `google-settings.ts:34` | `settings` `upsert({key, value, updated_by})` | write | `PUT /admin/google/settings` |
| `apps/api/src/common/custom-config/custom-config.service.ts:13,19,26` | `custom_config` select `CUSTOM_COLUMNS` / `.eq('key')` / `.eq('is_public', true)` | read | `order('key')`; `maybeSingle()` |
| `custom-config.service.ts:33` | `custom_config` `upsert({key, value, description, is_public, updated_by}).select().single()` | write | |
| `custom-config.service.ts:40` | `custom_config` `delete().eq('key').select('key')` | delete | returns whether a row existed |
| `apps/api/src/common/integrations/integration-config.queries.ts:27,36` | `integration_config` `select('key, value, updated_at')` + `rpc('integration_secrets_read')` | read | overlay over env |
| `integration-config.queries.ts:42` | `rpc('integration_secrets_status')` | read | |
| `integration-config.queries.ts:52-53` | `integration_config` delete / `upsert({key, value, updated_by})` | write | null deletes (env applies again); `updated_by` may be null (import command `apps/api/src/scripts/config-import-env.ts`) |
| `integration-config.queries.ts:59,65` | `rpc('integration_secret_set' / 'integration_secret_clear')` | write | |
| `apps/api/src/common/activity/activity.retention.job.ts:32` | `rpc('prune_activity_log')` | job | the only "cron" touching settings |
| `apps/api/src/modules/platform/google-sync/sync/google-items.queries.ts:111` | `rpc('google_sync_reconcile')` | job | reads `google_sync_on`/`window_days` |

Generated types: `packages/db/src/types.ts:692` (`custom_config`), `:1182` (`integration_config`), `:2878` (`settings`) under `Tables`. If one of these becomes a view, `supabase gen types` moves it under `Views` with **nullable Row columns** and `Insert`/`Update` only if auto-updatable — the typed `Db` client calls above would then fail `typecheck`.

### 6. Audit / activity entity names

| Store | `audit_log.entity` | `entity_id` | `action` | Where |
|---|---|---|---|---|
| settings (`PATCH /settings`) | `'settings'` | `SINGLETON_ENTITY_ID` = `00000000-0000-0000-0000-000000000000` (`apps/api/src/common/audit/singleton-entity.ts:6`) | `'update'`, before/after = full value maps | `apps/api/src/common/settings/settings.controller.ts:38-44` |
| custom-config | `'custom_config'` | singleton id | `create:<key>` / `update:<key>` / `delete:<key>` | `apps/api/src/common/custom-config/custom-config.controller.ts:35-59` |
| integrations | `'integration_config'` | `INTEGRATIONS_ENTITY_ID` (same zero uuid, `integration-config.controller.ts:12`) | `update` / `secret_set:<KEY>` / `secret_clear:<KEY>`, after = `{keys}` (no values) | `integration-config.controller.ts:41-70` |
| google settings | `'google_account'` | `GOOGLE_ENTITY_ID` (zero uuid) | `'settings'` | `apps/api/src/modules/platform/google-sync/admin/google-admin.service.ts:19,27` |

`activity_log.entity` is derived from the route pattern (`apps/api/src/common/activity/activity.route.ts:52-68`): `/settings*` → `settings`, `/config/custom/:key` and `/config/meta` → `config` (`:key` is not id-like), `/admin/google/settings` → `admin`. No DB trigger writes either log for these tables.

### 7. e2e raw SQL (postgres.js, superuser `DATABASE_URL`)

| File:line | Op | Keys / shape |
|---|---|---|
| `e2e/support/settings.ts:9` | `select key, value from public.settings where key = any($keys)` | snapshot |
| `e2e/support/settings.ts:19-22` | `insert … values ($key, $json::jsonb) on conflict (key) do update set value = excluded.value` / `delete … where key = $key` | restore (keeps JSON null) |
| `e2e/support/settings.ts:32` | `select value #>> '{}' … where key = $key` | text read |
| `e2e/support/wa-stub.ts:59` | upsert `messaging_enabled` (`on conflict (key) do update`) | |
| `e2e/support/pay-rule.ts:56` | upsert any bool key (tx) | |
| `e2e/support/schedule-extra.ts:32-35` | delete / upsert `late_cancel_hours` | null = delete, like the API |
| `e2e/support/db.ts:60-67` (`seedSettings`) | multi-row upsert of 11 keys incl. `late_cancel_hours` JSON null | after `resetDb` |
| `e2e/support/db.ts:23-27` (`resetDb`) | `truncate` every `pg_tables` row in `public` except 4 | **truncates settings/custom_config/integration_config**; a view is not in `pg_tables`, a new base table would be truncated automatically |
| `e2e/support/messages.ts:55` | upsert any key (`setSetting`) | |
| `e2e/support/google.ts:37` | `delete … where key in (google_sync_enabled, google_sync_mode, google_calendar_window_days)`; `select public.google_token_clear()` | |
| `e2e/tests/edit-session-time.helpers.ts:58` | `update public.settings set value = … where key = 'auto_messages_enabled'` | plain UPDATE |
| `e2e/tests/google-sync.sql.spec.ts:22,32-34` | upsert `google_sync_enabled` = `'true'`; `delete … where key like 'google\_%'`; asserts `google_sync_on()` = false and `google_sync_window_days()` = 60 on missing rows | |
| `e2e/tests/teacher-earnings.sql.spec.ts:21` | `update public.settings set value = 'true'::jsonb where key = 'payout_count_late'` | |
| `e2e/support/kapso.ts:30-33` | upsert / delete `integration_config` `WA_PROVIDER`, `KAPSO_API_BASE` | |
| `e2e/tests/integration-config.sql.spec.ts:32-89` | RLS spec: admin can SELECT, non-admin sees nothing, admin INSERT denied, anon `42501`; service-role calls of all five secret RPCs; blank secret `22023` | pins RLS + grants + error codes |

No e2e SQL touches `custom_config`.

---

### 8. Compat requirements for a merged store

Whatever replaces the two tables (new table + compat view, or a renamed table), these must keep working unchanged:

1. **`public.settings` must stay a relation named `public.settings` with columns `key text` and `value jsonb`** (plus `updated_at`, `updated_by` for `settings-meta.queries.ts`). Seven live SQL objects read `select value from public.settings where key = …` / `where key in (…)` and compare `value = 'true'::jsonb`, `jsonb_typeof(value)`, `value #>> '{}'`. They are compiled with `search_path=''` and fully qualified names; SQL-language function bodies are re-parsed at call time, so a view with the same name and columns is enough. No function needs re-creating unless the name changes.
2. **Keep row-per-key semantics: missing row = default.** Each reader relies on `coalesce(subquery, default)`; a compat view must not synthesize rows for keys never stored (for example a `null` value row for an unseeded key changes nothing for these readers, but a row with a non-null wrong-type value would). JSON `null` must stay storable (`late_cancel_hours` seed, e2e `restoreSettings`) and must read the same as missing.
3. **The coalesce defaults in SQL must keep matching the registry:** `activity_retention_days` 180, `renewal_alert_remaining` 2, `payout_count_*` false, `academy_timezone` 'Asia/Riyadh', `google_sync_enabled` false, `google_calendar_window_days` 60 (clamped 7..180). Moving defaults into a `default_value` column would be a behaviour change for these readers unless they are rewritten.
4. **Security-definer readers** (`prune_activity_log`, `sync_teacher_earning`, `set_assistant_terms`, `google_sync_on`, `google_sync_window_days`) run as the owner and bypass RLS. A compat view must be readable by the function owner (`postgres`) — automatic if owned by `postgres`.
5. **Invoker readers keep the caller's RLS:** `lesson_counts_for_pay` (granted to authenticated), `v_teacher_payable_lessons`, `v_teacher_countable_earnings`, `v_student_list`. A compat view must be `security_invoker = true` and the base table must keep the **admin-read RLS** (`is_admin()`), or non-admin callers change behaviour (today they see defaults). Do not make a definer view (it would leak every value to `authenticated`, which has SELECT).
6. **Grants:** anon none; authenticated SELECT only (RLS-filtered), no write; service_role full. `integration_config` RLS spec (`e2e/tests/integration-config.sql.spec.ts`) asserts admin SELECT ok, admin INSERT denied, anon `42501`.
7. **Writes through the old name must keep working**, because e2e helpers and the API write `public.settings` / `public.custom_config` / `public.integration_config` directly: plain `INSERT`, `INSERT … ON CONFLICT (key) DO UPDATE` (e2e), PostgREST `upsert` (= `ON CONFLICT` on the PK), `UPDATE … WHERE key = …`, `DELETE … WHERE key = …`, `DELETE … WHERE key LIKE 'google\_%'`. Use a simple auto-updatable view (single table, no joins/aggregates) — Postgres supports `ON CONFLICT DO UPDATE` on auto-updatable views but **not on views with INSTEAD OF triggers**. A filtered view (e.g. `where kind = 'setting'`) needs a column default for the discriminator (`alter view … alter column kind set default …`) and `WITH CHECK OPTION`. PostgREST must resolve the PK through the view for `upsert` (it does for simple views; otherwise pass `onConflict: 'key'`).
8. **`updated_at` trigger** (`set_updated_at()` BEFORE UPDATE) must move to the base table; `updated_by` stays nullable (import command writes null).
9. **Key namespaces collide today:** `custom_config` keys (`^[a-z][a-z0-9_.-]{1,63}$`, reserved only against *registry* keys, `packages/shared/src/custom-config/schema.ts:12`) can equal a non-registry settings key such as `google_sync_enabled`. A merged table with a single PK on `key` needs either a `kind`/`scope` column in the PK or a reserved check that also covers `GOOGLE_SETTING_KEYS`. The `custom_config` key regex and 8 KB `value` check must keep applying to custom rows; settings rows currently have no key/size check.
10. **`integration_config` is a different type** (`value text`, upper-case keys, 4 KB) with Vault secrets beside it (`integration:<KEY>`, allow-list function re-created per new secret key, pinned by `secret-keys.migration.test.ts`). Merging it would need text↔jsonb conversion for the API overlay; leaving it out keeps all five RPCs and the Vault names untouched.
11. **No pg_cron / realtime / DB audit triggers to migrate.** The retention job is the API's `ActivityRetentionJob` → `rpc('prune_activity_log')`; keep the function name, its zero-arg signature and the service_role grant.
12. **Audit entity strings are data:** `audit_log.entity` `'settings'`, `'custom_config'`, `'integration_config'`, `'google_account'` (action `settings`) with the zero-uuid entity id. A redesign that changes them orphans history; keep them or map them in the reader.
13. **Generated types / e2e reset:** a view instead of a table moves the entry under `Views` in `packages/db/src/types.ts` (nullable columns, typecheck fallout) and is skipped by `resetDb` (which truncates `pg_tables`), so the new base table is truncated and `seedSettings` must still be able to insert through the old name.
14. **Migration-time reader:** `M/20261005000200_teacher_pay_rule.sql:133` runs `resync_teacher_earnings(null)` during migrations; a migration that renames `public.settings` must create the compat view in the same transaction, before any lesson write fires `lessons_sync_earning` or the google-sync triggers (every `lessons` insert/update calls `google_sync_on()`).

<a id="part-c"></a>

## Part C — API side of settings / custom-config / public-config / integrations

Scope: `apps/api/src` (paths below are relative to it unless prefixed). Read-only inventory, 2026-10-23.
Background: `docs/25-settings-and-config.md`.

---

### 1. Core config modules

#### 1.1 Modules and services

| Module | File | Global? | Providers / exports | Notes |
|---|---|---|---|---|
| `SettingsModule` | `common/settings/settings.module.ts:14-24` | **@Global** | `SETTINGS_CACHE_MS` (factory `loadEnv().SETTINGS_CACHE_MS`, :18), `SettingsService`, `SettingsMetaQueries`; exports `SettingsService` only | controllers `SettingsController`, `SettingsMetaController` |
| `CustomConfigModule` | `common/custom-config/custom-config.module.ts:9-14` | no | `CustomConfigService` (exported) | controller `CustomConfigController` |
| `PublicConfigModule` | `common/public-config/public-config.module.ts:10-14` | no | imports `CustomConfigModule`; `SettingsService` from global | controller `PublicConfigController` |
| `IntegrationConfigModule` | `common/integrations/integration-config.module.ts:13-27` | **@Global** | `INTEGRATION_REFRESH_MS` (factory `integrationRefreshMs(loadEnv())`, :20), `IntegrationConfigQueries`, `IntegrationConfigService` (exported) | controller `IntegrationConfigController` |

Registration order in `app.module.ts:58-64`: `IntegrationConfigModule` (58) … `SettingsModule` (62), `CustomConfigModule` (63), `PublicConfigModule` (64).

#### 1.2 `SettingsService` (`common/settings/settings.service.ts`)

| Member | Lines | Behaviour |
|---|---|---|
| `SETTINGS_CACHE_MS` token | :7 | Symbol; default TTL 30 000 ms (:8). Env `SETTINGS_CACHE_MS` (`env.ts:107`, int ≥0, default 30 000). e2e runs with `0` (`e2e/playwright.config.ts:130`). |
| `cached` | :18 | single in-memory `{at, value: Promise<AcademySettings>}`; process-local. |
| `all(now)` | :26-36 | one query `select key, value from settings` (`load()` :66-70 → shared `readSettings`, defaults for missing/malformed rows). Promise cached (concurrent callers share one load). A rejected load clears the cache (:31-33) → **errors propagate, never cached**. Returns a shallow copy. |
| `publicView()` | :39-41 | `publicSettings(await all())` (registry `public: true` keys). |
| `invalidate()` | :44-46 | drops cache — **only this instance**. |
| `write(values, actorId)` | :52-64 | loop per key: `null` → `delete` row; else `upsert({key, value, updated_by})`. **Not transactional** (partial write possible on mid-loop error); `finally` invalidates. |

`settings-slice.ts:26-29` `readSlice(store, keys)` = `store.all()` then pick keys. `settings.fakes.ts:6-19` `fakeSettings(over)`, `readerOf(Reader, over)`.

#### 1.3 `CustomConfigService` (`common/custom-config/custom-config.service.ts`)
No cache; every call hits `custom_config`. `list()` :12, `find(key)` :18, `publicRows()` :25 (`is_public = true`), `upsert` :31 (`{key, value, description, is_public, updated_by}`), `remove` :39 (returns false if no row). Mapper `custom-config.mapper.ts:15-24` → `CustomConfigView {key, value, description, isPublic, updatedAt, updatedBy}`. DB constraints (migration `20261005000250_custom_config.sql:6-7`): key `^[a-z][a-z0-9_.-]{1,63}$`, value ≤ 8192 bytes. Registry-key shadowing blocked in shared `customKeySchema` (`reserved_key`) and again on read by `publicCustom` (drops `isSettingKey` rows).

#### 1.4 Integrations (`common/integrations/`)

| Piece | File:line | Behaviour |
|---|---|---|
| Overlay state | `integration-overlay.ts:8-17` | module-level frozen object; `integrationOverlay()` / `setIntegrationOverlay()`. No imports (avoids cycle with env.ts). |
| `loadEnv()` | `env.ts:128-134` | no arg → `schema.parse({...process.env, ...overlay})`; on merge failure falls back to env alone. Re-parses the zod schema on **every call** (no memo). |
| `validOverlay()` | `env.ts:140-148` | only integration keys, non-blank, each validated with its own schema field; bad → dropped + `onBad(key)`. |
| Refresh period | `integration-refresh.ts:11-14` | `null` if `INTEGRATION_CONFIG_FROM_DB=false`; else `INTEGRATION_REFRESH_MS ?? SETTINGS_CACHE_MS` (`env.ts:107-111`). |
| `IntegrationConfigService` | `integration-config.service.ts:26-98` | `onModuleInit` awaits `refresh()` then `setInterval(max(everyMs, 1000))` (:36-40). `refresh()` races `rawValues()` against 5 s timeout (:12, :49), never throws, keeps last good snapshot on failure (:58-61), warns once per bad key (:53-56). `writeValues`/`setSecret`/`clearSecret` reload in `finally` (:75-97) — **local instance only**. `items()` :65-68 → `integrationItems({plain, secrets, env: process.env})`. |
| Queries | `integration-config.queries.ts` | `rawValues` :26 (table `integration_config` + RPC `integration_secrets_read`), `plainRows` :35, `secretStatus` :41 (RPC `integration_secrets_status`), `writePlain` :48 (null → delete; `actorId` null = import command), `setSecret` :58 (RPC `integration_secret_set`), `clearSecret` :64 (RPC `integration_secret_clear`). |
| View | `integration-config.view.ts:17-33` | per registry key: `{key, group, secret, value (null for secrets), set, source: 'db'|'env'|'unset', updated_at}`. |
| Import script | `scripts/config-import-env.ts`, `scripts/import-env.ts` | copies env → DB (`--overwrite`), docs/09:245-247. |

#### 1.5 Routes

| # | Method | Path | Controller:line | Guard / permission | DTO (zod) | Response | Cache-Control | Audit (entity / action) |
|---|---|---|---|---|---|---|---|---|
| 1 | GET | `/settings` | `common/settings/settings.controller.ts:26` | class `@Permissions('settings.read')` (:18) | — | `AcademySettings` (snake_case, every registry key, defaults filled) | none | — |
| 2 | PATCH | `/settings` | `settings.controller.ts:31-47` | `settings.write` (:32) | `settingsUpdateSchema` (shared `settings/schema.ts:38-43`) | `AcademySettings` after write | none | `settings` / `update`, entityId `SINGLETON_ENTITY_ID` (nil UUID), before/after = **full blobs** (:38-45) |
| 3 | GET | `/config/meta` | `common/settings/settings-meta.controller.ts:18` (tag `config`) | `settings.read` (:13) | — | `SettingsMetaResponse {meta: Record<key,{updatedAt, updatedBy, updatedByName}>}` (`settings-meta.queries.ts:10-23`, joins `profiles.full_name`; rows never written absent; includes non-registry rows e.g. google_*) | none | — |
| 4 | GET | `/config/custom` | `common/custom-config/custom-config.controller.ts:22` | `settings.read` (:14) | — | `CustomConfigView[]` ordered by key | none | — |
| 5 | PUT | `/config/custom/:key` | `custom-config.controller.ts:28-44` | `settings.write` | `customKeySchema` (param), `customConfigUpsertSchema` (body `{value (non-null JSON ≤8KB), description?, isPublic=false}`) | `CustomConfigView` | none | `custom_config` / `create:<key>` or `update:<key>`, nil UUID, before/after views |
| 6 | DELETE | `/config/custom/:key` | `custom-config.controller.ts:46-61` | `settings.write`, `@HttpCode(204)` | `customKeySchema` | 204; 404 `not_found` | none | `custom_config` / `delete:<key>`, after null |
| 7 | GET | `/settings/public` | `common/public-config/public-config.controller.ts:23-27` | **`@Public()`** (:15) | — | `PublicConfig` = `publicView()` spread + `custom: publicCustom(publicRows())` | **`public, max-age=60`** (:24) | — |
| 8 | GET | `/settings/integrations` | `common/integrations/integration-config.controller.ts:30` | `settings.read` (:22) | — | `IntegrationConfigItem[]` | none | — |
| 9 | PUT | `/settings/integrations` | `integration-config.controller.ts:36-43` | `settings.write` | `integrationValuesSchema` `{values: {PLAIN_KEY: string|null}}` | `IntegrationConfigItem[]` | none | `integration_config` / `update`, entityId nil UUID (:12), `after: {keys}` — never values |
| 10 | PUT | `/settings/integrations/secrets/:key` | `integration-config.controller.ts:45-53` | `settings.write` | `z.enum(INTEGRATION_SECRET_KEYS)` (:13), `integrationSecretSchema` `{value}` | items | none | `integration_config` / `secret_set:<KEY>` |
| 11 | DELETE | `/settings/integrations/secrets/:key` | `integration-config.controller.ts:55-61` | `settings.write` | same enum | items | none | `integration_config` / `secret_clear:<KEY>` (only when a secret existed) |

Related routes reading config (outside these four modules):

| Method | Path | File:line | Permission | Reads |
|---|---|---|---|---|
| GET | `/admin/notifications` | `modules/notification-rules/rules.controller.ts:17-21` | `settings.read` | `NotificationRulesSettings` + `SendGate.state()` + templates + line health → `NotificationsOverview {entries, lines}` (`rules.service.ts:20-28`) |
| PUT | `/admin/google/settings` | `modules/google-sync/google-admin.controller.ts:45-50` | class `settings.write` (:15) + `requireAdmin(user)` inline | body `googleSettingsSchema`; `GoogleAdminService.saveSettings` (`google-admin.service.ts:23-31`) → audit entity `google_account`, action `settings`, after = new `GoogleSyncSettings`; returns `GoogleStatusView` |
| GET | `/admin/google/status` | `google-admin.controller.ts:24-29` | `settings.read` + `requireAdmin` | `GoogleSettings.read()` among others |
| GET | `/messages/gate` | `modules/whatsapp/messages.controller.ts:26-30` | `messages.read` (class `messages.manage`) | `SendGate.view()` |

Other `settings.read/write`-gated controllers: `modules/google-sync/google-map.controller.ts:13,19,34`, `google-items.controller.ts:14,24`.

**Route count**: 11 routes in the four config modules (settings 2 + meta 1 + custom 3 + public 1 + integrations 4); +2 directly settings-adjacent (`GET /admin/notifications`, `PUT /admin/google/settings`).

#### 1.6 PATCH `/settings` semantics
- Body schema is generated from the registry: one **optional camelCase** field per key (`SETTING_FIELD_OF[k]`), each `settingZod(def)` (`packages/shared/src/settings/schema.ts:9-36`): int (min/max, `.nullable()` if def.nullable), bool, trimmed string (min/max length), e164, tz, currency `^[A-Z]{3}$`, int_list (ascending, `not_ascending`), enum, json (shape, nullable).
- `z.object(shape)` is **non-strict**: unknown fields are silently stripped (no 400).
- `settingsChanges()` (`schema.ts:46-53`) maps camelCase → snake_case keys, drops `undefined`.
- `null` (nullable keys only, e.g. `late_cancel_hours`) **deletes the row** → reads back as default (PostgREST can't store JSON null; `settings.service.ts:48-58`).
- GET returns snake_case, PATCH takes camelCase (asymmetric shapes); response = full `AcademySettings` after the write.
- Audit stores full before/after blobs, not a diff (`settings.controller.ts:38-45`).
- Google rows (`google_sync_enabled`, `google_sync_mode`, `google_calendar_window_days`) are not in the registry → never in GET/PATCH `/settings`, but **do** appear in `/config/meta` (it selects all rows).

---

### 2. Per-module readers and other settings access

#### 2.1 Readers `modules/*/*.settings.ts` (28 files)

All follow the same pattern: `const KEYS = [...] as const satisfies readonly SettingKey[]`, `@Injectable` class with ctor `(store: SettingsService)`, `read() => readSlice(store, KEYS)`. Each has a `.settings.test.ts`.

| # | Module | Reader class (file) | KEYS | Consumers (file:line of ctor injection) | Registered in |
|---|---|---|---|---|---|
| 1 | booking | `BookingSettings` (`booking/booking.settings.ts:12-25`) | booking_horizon_weeks, makeup_window_days, teachers_always_available, meeting_link_auto, upload_max_mb, teacher_whatsapp_new_student, sales_auto_assign | booking.planner.ts:62, makeup-candidates.service.ts:23, booking.parties.ts:25, booking-extras.controller.ts:20, course-change.planner.ts:27, sales-booking.ownership.ts:19, slots.service.ts:41, teacher-alert.service.ts:14, teacher-options.queries.ts:25 (9) | booking.module.ts |
| 2 | classroom | `ClassroomSettings` (:7) | join_opens_before_min, join_closes_after_min, default_meeting_title | internal-meetings.queries.ts:29, student-link.queries.ts:25, classroom.queries.ts:24, room-join.service.ts:21 (4) | classroom.module.ts |
| 3 | dashboard | `DashboardSettings` | reporting_currency | finance.service.ts:24 | dashboard.module.ts |
| 4 | expenses | `ExpensesSettings` | reporting_currency, academy_timezone | expense-year.service.ts:15, expenses.job.ts:28 | expenses.module.ts |
| 5 | feedback | `FeedbackSettings` | feedback_rate_window_min | `PublicFeedbackLimit` via factory (feedback.module.ts:27-28; feedback.rate-limit.ts:48 optional ctor) | feedback.module.ts |
| 6 | follow-ups | `FollowUpsSettings` | follow_up_hours, auto_messages_enabled, follow_up_slots_from_hours, follow_up_slots_to_days | follow-ups.job.ts:58, follow-up-slots.ts:21 | follow-ups.module.ts |
| 7 | fx | `FxSettings` | fx_fresh_hours | fx.service.ts:27 | fx.module.ts |
| 8 | google-sync | `GoogleSyncAcademySettings` | meeting_link_auto | google-sync.source.ts:42 | google-sync.module.ts:41 |
| 9 | inbox | `InboxSettings` | upload_max_mb | thread-file-send.service.ts:41 (property `@Inject`, optional) | inbox.module.ts:51 |
| 10 | invoices | `InvoicesSettings` | academy_timezone | invoices.controller.ts:23 | invoices.module.ts |
| 11 | leads | `LeadsSettings` | follow_up_hours | lead-profile.service.ts:28 | leads.module.ts |
| 12 | lesson-rating | `LessonRatingSettings` | feedback_mode, auto_messages_enabled | rating.queue.ts:20 | lesson-rating.module.ts:20 |
| 13 | lessons | `LessonsSettings` | booking_horizon_weeks, late_cancel_hours, teachers_always_available, meeting_link_auto, academy_timezone, payout_count_late, payout_count_no_show | overview/overview.queries.ts:33, lesson-cancel.service.ts:34, time-edit.payout.ts:17, teacher-me.queries.ts:16, lessons.controller.ts:22, rule-planner.ts:19, lessons.queries.ts:20, lesson-status.service.ts:36 (8) | lessons.module.ts (inbox gets `TeacherMeQueries` via lessons export) |
| 14 | notification-rules | `NotificationRulesSettings` | `CATALOGUE_SETTING_KEYS` (shared `notifications/catalogue-settings.ts:7-17`): messaging_enabled, auto_messages_enabled, reminder_24h_enabled, teacher_whatsapp_lesson_reminder, teacher_whatsapp_new_student, feedback_mode, reminder_minutes_before, renewal_alert_remaining, follow_up_hours | rules.service.ts:15 | rules.module.ts:65 |
| 15 | payments | `PaymentsSettings` | academy_timezone, upload_max_mb | payments.controller.ts:31 | payments.module.ts |
| 16 | payouts | `PayoutsSettings` | payout_count_late, payout_count_no_show | payouts.generate.ts:21 | payouts.module.ts:19 |
| 17 | receivables | `ReceivablesSettings` | reporting_currency | receivables.service.ts:19 | receivables.module.ts |
| 18 | reminders | `RemindersSettings` | reminder_lookahead_hours, auto_messages_enabled, reminder_minutes_before, reminder_24h_enabled, teacher_whatsapp_lesson_reminder, meeting_link_auto, join_opens_before_min, join_closes_after_min | reminders.job.ts:45 | reminders.module.ts |
| 19 | report-pdf | `ReportPdfSettings` | academy_contact, academy_whatsapp_e164 | report-pdf.publisher.ts:32 (property `@Inject`) | report-pdf.module.ts:15 |
| 20 | reports | `ReportsSettings` | report_teacher_edit_hours, late_cancel_hours | report-gate.ts:20 | reports.module.ts |
| 21 | sales-money | `SalesMoneySettings` | upload_max_mb | sales-money.controller.ts:60 | sales-money.module.ts |
| 22 | sales | `SalesSettings` | sales_auto_assign, meeting_link_auto, join_opens_before_min, join_closes_after_min | sales-assign.service.ts:20, sales.service.ts:13, sales-schedule.service.ts:18 | sales.module.ts |
| 23 | scheduling | `SchedulingSettings` | booking_horizon_weeks | horizon.job.ts:33, rule-extend.service.ts:21 | scheduling.module.ts |
| 24 | student-recordings | `RecordingSettings` (`recordings.settings.ts`) | recording_retention_days | recording-retention.ts:23 | student-recordings.module.ts |
| 25 | subscriptions | `SubscriptionsSettings` | renewal_alert_remaining, auto_messages_enabled, subscription_expiry_days, flag_future_lessons_when_unpaid | unpaid-flags.service.ts:18, student-expiry.job.ts:33, alerts.service.ts:26 | subscriptions.module.ts |
| 26 | teachers | `TeachersSettings` | meeting_link_auto, teachers_always_available | teachers.controller.ts:39, availability/availability.queries.ts:22 | teachers.module.ts |
| 27 | webhook | `WebhookSettings` | quick_reply_window_hours | webhook.queries.ts:20 | webhook.module.ts |
| 28 | whatsapp | `WhatsappSettings` | messaging_enabled, auto_messages_enabled | send-gate.ts:16 | whatsapp.module.ts:57 (global WhatsappModule; rules.module only mentions it in a comment) |

**Totals**: 28 readers, 54 consuming classes (ctor/property injections), each reader registered in exactly one module.

Registry keys (39 in `packages/shared/src/settings/domains/*.ts`) **with no API reader**: `activity_retention_days` (SQL `prune_activity_log()`, migration `20261005000250:28-48`), `payout_count_trials` (SQL, migration `20261005000200:24-37`), `crm_cutover_done`, `recording_consent_notice` (public/web only).

#### 2.2 Settings read NOT through a reader

| Where | How | Notes |
|---|---|---|
| `common/public-config/public-config.controller.ts:6,19,26` | `SettingsService.publicView()` directly | allowed (common/, not modules/) |
| `modules/google-sync/google-settings.ts:24-28` (`GoogleSettings.read`) | `db.from('settings').select('key, value').in('key', GOOGLE_SETTING_KEYS)` — **uncached, fresh per call** ("the job must see an OFF at once") | defaults via `readGoogleSettings` :8-17 (OFF, dry_run, window default) |
| `modules/google-sync/google-settings.ts:30-37` (`GoogleSettings.write`) | `db.from('settings').upsert(...)` direct, **does not invalidate `SettingsService` cache** (irrelevant today since keys are outside registry) | consumers: google-admin.service.ts:24-26, google-status.service.ts:19, google-sync.processor.ts:32,62 via `GoogleData` (google-data.ts:11) |
| `common/settings/settings-meta.queries.ts:11` | `db.from('settings')` (meta columns) | |
| Test harnesses | `overrideProvider(SettingsService)` in modules/{notification-rules,lessons,feedback,classroom,reports,subscriptions}/test-app.ts, pricing/pricing.test-app.ts | depends on the `SettingsService` token surviving |
| SQL (DB functions/views, not API) | `public.settings` read in migrations 20261001000177:35-37 (payout_count_late/no_show), 20261005000100:15 (renewal_alert_remaining), 20261005000200:37 (payout_count_*), 20261005000250:38 (activity_retention_days), 20261006000273:323 (academy_timezone), 20261022000611:39,45 (google_sync_enabled, google_calendar_window_days) | any store rename/merge must keep these (or rewrite the functions) |

No `getSetting`, `settings.all` misuse, or `custom_config` access outside `common/custom-config/` (only a comment in `common/audit/singleton-entity.ts:3`). Nothing in `modules/` reads `custom_config`: custom values have **no server consumer** besides `/settings/public`.

#### 2.3 SendGate and fail-closed evaluation

| Item | File:line | Detail |
|---|---|---|
| `SendGate` | `modules/whatsapp/send-gate.ts:13-60` | deps `WhatsappSettings`, `DB`; `env` getter calls `loadEnv()` per access (:21-23) so integration changes apply live. |
| `open()` | :25-28 | first `sendingAllowed(env, true)` (WhatsApp configured? skip DB read if not), then `sendingAllowed(env, messaging_enabled)`. |
| `sendingAllowed` | `env.whatsapp.ts:91-93` | `whatsappEnv(env) !== null && messagingEnabledSetting === true` — only a stored boolean `true` opens; missing/malformed row → registry default `false`. `MESSAGING_ENABLED` env fuse removed 2026-10-22 (docs/09:238). |
| Read failure | `whatsapp.settings.ts:11-12` + `settings.service.ts:31-33` | settings read error rejects → `open()` rejects → gate never opens on error (fail-closed by exception). |
| `automaticOn()` | :31-33 | `auto_messages_enabled` (no `=== true` coercion; relies on typed default). |
| `state()` | :45-49 | `not_configured` if no WhatsApp env; else `messaging_enabled === true` → open / `switch_off`. |
| `view()` | :39-42 | `state` + queued outbound count + `restricted: true` only when allow-list set. |
| Allow-list | `env.recipients.ts:10-18`; `env.ts:16-22,65` | `WA_ALLOWED_RECIPIENTS` env/integration key, parsed at schema level; any bad item fails the parse (boot fail-closed; via overlay, `validOverlay` drops the bad DB value → env applies). `allowedRecipients` null only when unset/blank (= unrestricted); `[]` → nobody (`recipientAllowed` :15-18). |
| Allow-list enforcement | `whatsapp.client.ts:133` (throws WaError 131030), `live-client.ts:50`, `message.dispatch.ts:44,54`, `sender.queries.ts:18`, `inbox/read-receipts.ts:29` | all call `loadEnv()` per use. |
| Gate users | `message.sender.ts:74,76,89-90` (per batch and per row), `inbox/read-receipts.ts:28`, `messages.controller.ts:29,36`, `notification-rules/rules.service.ts:23` | |

Because the gate depends on `SettingsService` cache, a kill switch flipped by PATCH on instance A is seen by instance B only after ≤ `SETTINGS_CACHE_MS` (30 s); flipped by SQL, the same (docs/09:208).

#### 2.4 Notification catalogue — `GET /admin/notifications`
`rules.controller.ts:13-21` (`settings.read`), `rules.service.ts:20-28`: `Promise.all([NotificationRulesSettings.read(), SendGate.state(), RulesQueries.templates(), RulesQueries.lines()])` → shared `catalogueViews({settings, gateReason, templates})`. Read-only; comment says Phase 3 adds `PATCH /admin/notifications/:key` (`rules.controller.ts:9`). `RulesQueries` reads `message_templates` and line health (`rules.queries.ts:11,27`).

#### 2.5 Google settings controller
`PUT /admin/google/settings` (`google-admin.controller.ts:45-50`): `settings.write` + `requireAdmin` (admin-only even for custom roles holding `settings.write`), body `googleSettingsSchema` (`{enabled?, mode?, window_days?}`), `GoogleAdminService.saveSettings` reads before, writes only defined fields (`google-settings.ts:31-36`), reads after, audits (`google_account`/`settings`), re-queues dry-run items when going live, reconciles window on enable/window change, kicks the job. Shared key names `packages/shared/src/google/settings-keys.ts` (seeded in migration `20261022000610`).

---

### 3. Permissions

| Item | Location | Detail |
|---|---|---|
| Catalog | `packages/shared/src/permissions/catalog.data.ts:30-…` (`PERMISSION_ROWS`); settings rows at :104-105 | `{ key: 'settings.read', area: 'system', grants: [] }`, `{ key: 'settings.write', … grants: [] }` → admin only by default. Header comment :1-7 is the recipe: row here + i18n `permissions.items` + seed migration + `@Permissions('…')`. |
| Derivations | `packages/shared/src/permissions/catalog.ts` | `Permission` type, `GRANTABLE_PERMISSIONS` (all non-`self`), `defaultGrantsOf` (admin = all grantable), `effectivePermissions`, `systemPermissionsOf`, `permissionGroups` (matrix sections). |
| DB | migration `20261005000220_roles_permissions.sql:10-55` | `roles`, `role_permissions(permission text check '^[a-z]+\.[a-z_]+$')` — free text, no FK to a catalog; seeds system roles. Later grant migrations: 225, 240, 274, 281, 300, 360, 380, 430, 433, `20261020000521_chat_lists_permission.sql` (pattern: `insert … select r.id, '<perm>' from roles r where r.is_system and r.key in (…) on conflict do nothing`). |
| Resolver | `common/auth/db-permission.resolver.ts:7-38` | role row + `role_permissions`; system `admin` gets `allGrantable` regardless of rows. |
| Cache | `common/auth/permission.cache.ts:4,14-30` | per-user, `PERMISSION_TTL_MS` 30 s; `clear()` local; comment explicitly bounds cross-instance staleness by TTL. |
| Inline helper | `common/auth/permissions.ts:25-27` `can(user, perm)` | for inline checks. |
| Parity test | `common/auth/parity/permissions.parity.test.ts` + `access-before.json` (328 lines, frozen 2026-10-05) | boots AppModule (`route-walk.test-util.ts:31-56`, `systemResolver`) and for each handler `Class.method` compares 5 system roles + anonymous to the frozen `@Roles` table. **A new handler must be added to access-before.json** (only `Roles|StaffUsers|Users` controllers are exempt, :14). New non-route permissions get bespoke `it(...)` assertions (e.g. :67-93 templates.send_all, subscriptions.set_start_date, students.check_registration, inbox.lists). Public routes must match `"public"` entries. Current config entries: `CustomConfigController.{list,put,remove}` :60-62, `GoogleAdminController.*` :87-92, `IntegrationConfigController.*` :109-112, `RulesController.overview` :155, `MessagesController.gate` :169, `PublicConfigController.get: "public"` :198, `SettingsController.{get,update}` :245-246, `SettingsMetaController.get` :247 — all `["admin"]`. |
| Coverage test | `common/auth/parity/permissions.coverage.test.ts:20-38` | every non-public, non-signed-in handler carries exactly one catalog permission; >190 routes. |

**Adding a new permission (e.g. `config.read`/`config.write`)**: (1) row in `catalog.data.ts` with `grants`; (2) i18n `permissions.items.<key>` in ar/en; (3) new migration seeding `role_permissions` for system roles that should hold it (admin row "for readers"); (4) `@Permissions('…')` on handlers; (5) parity test passes automatically if the system-role admit/refuse set is unchanged (admin-only → admin-only); if handler names/classes change, update `access-before.json` keys; if the old `settings.*` grant on custom roles should carry over, a data migration copying `settings.read/write` grants to the new keys is needed (custom roles are not covered by the parity test). Also `packages/shared/src/notifications/kind-permissions.ts:9` references `settings.read` for push kinds.

---

### 4. Boundaries, lint, multi-instance, env overlay

| Item | Location | Rule |
|---|---|---|
| Boundary test | `common/config-boundaries.test.ts:43-76` | `common/settings` must not import `custom-config`/`public-config` (:55-57); `common/custom-config` must not import `settings`/`public-config` (:59-61); `common/config/` must not exist (:63-65). Scanner = regex over relative specifiers. A merged store must rewrite/replace this test. |
| ESLint | `apps/api/eslint.config.mjs:5-21` | for `src/modules/**/*.ts` (ignoring `*.settings.ts`, tests, fakes, test-apps): `no-restricted-imports` regex `common/settings/settings\.service(\.js)?$`. Does **not** catch `db.from('settings')` (google-settings.ts bypasses it legally). Base config `packages/config/eslint.js:9-11`: max-lines 150, `@typescript-eslint/max-params` 3. |
| Shared boundary tests (outside API) | `packages/shared/src/settings/boundaries.test.ts`, `exports.test.ts`, `layout.test.ts`; `apps/web/src/features/platform/settings/boundaries.test.ts` | per docs/25 §3. |
| Instances | `deploy/staging/docker-compose.yml:6-14` (single `ayat-api` service, no replicas); `main.ts:21` plain `app.listen`, no cluster; docs/09:17 "single API instance" assumption (feedback limiter) | **Today exactly 1 instance.** All caches are in-process: `SettingsService` (30 s), integration overlay (refresh `SETTINGS_CACHE_MS`), `PermissionCache` (30 s), translations (`translations.service.ts:9` 5 min). Invalidation is local only; cross-instance staleness bounded by TTL. Jobs comment "move to pg_cron / pg-boss when the API scales out" (`scheduling/horizon.job.ts:23`, `reminders/ticker.ts:16`). |
| LISTEN/NOTIFY / realtime | grep over `apps/api/src` | **none** (no `pg_notify`, `LISTEN`, Supabase realtime channel). |
| pg-boss | not used (only comments: `webhook/webhook.service.ts:23`, `google-sync/google-sync.job.ts:22`). | |
| `loadEnv()` | `env.ts:128-134` | parsed per call everywhere (SendGate, dispatch, sender timing, google job poll); overlay refreshed by `IntegrationConfigService` (boot, interval, after admin write). `INTEGRATION_CONFIG_FROM_DB=false` disables DB entirely (unit tests). |

---

### 5. In-process jobs (setInterval) and settings they read

All jobs are in-process `setTimeout(first)+setInterval(every)` timers started in `onApplicationBootstrap` (no pg-boss, no @Cron). Settings freshness = `SETTINGS_CACHE_MS` (30 s) on top of the job period.

| Job | File:line | First / every | Settings read (via) |
|---|---|---|---|
| MessageSender | `whatsapp/message.sender.ts:41-42`, `sender-timing.ts:2-8` | 30 s / 30 s (`MESSAGE_SENDER_POLL_MS` overrides both) | `SendGate.open()` / `automaticOn()` per pass and per row (:74-90) → messaging_enabled, auto_messages_enabled + integration overlay |
| RemindersJob | `reminders/reminders.job.ts:15-16,36-39,66` (Ticker) | 30 s / 5 min | `RemindersSettings` (8 keys) |
| FollowUpsJob | `follow-ups/follow-ups.job.ts:17-18,48-51,80` | 60 s / 5 min | `FollowUpsSettings` (follow_up_hours, auto_messages_enabled) |
| RatingJob → RatingQueue | `lesson-rating/rating.job.ts:19`, `rating.queue.ts:25` | 45 s / 5 min | `LessonRatingSettings` |
| Alerts job → AlertsService | `subscriptions/alerts.job.ts:12-14`, `alerts.service.ts:52` | 5 min / 15 min | `SubscriptionsSettings` (renewal_alert_remaining, auto_messages_enabled) |
| StudentExpiryJob | `subscriptions/student-expiry.job.ts:8-10,49` | 10 min / 24 h | subscription_expiry_days |
| HorizonJob | `scheduling/horizon.job.ts:12-14,49` | 5 min / 24 h | booking_horizon_weeks |
| ExpensesJob | `expenses/expenses.job.ts:6-8,43` | 10 min / 6 h | academy_timezone |
| RecordingMaintenanceJob → RecordingRetention | `student-recordings/recording-maintenance.job.ts:4-6`, `recording-retention.ts:31` | 20 min / 1 h | recording_retention_days |
| ReportPdfJob → ReportPdfPublisher | `report-pdf/report-pdf.job.ts:11-13,47`, `report-pdf.publisher.ts:32` | 30 s / 60 s | academy_contact, academy_whatsapp_e164 |
| GoogleSyncJob → processor / source | `google-sync/google-sync.job.ts:6-9,38-40`, `google-sync.processor.ts:32,62`, `google-sync.source.ts:49` | 45 s / 60 s (`GOOGLE_SYNC_POLL_MS`) | `GoogleSettings` (fresh SQL, uncached) + `GoogleSyncAcademySettings` (meeting_link_auto) |
| ActivityRetentionJob | `common/activity/activity.retention.job.ts:4-6,32` | 15 min / 24 h | RPC `prune_activity_log()` → SQL reads activity_retention_days |
| IntegrationConfigService refresh | `common/integrations/integration-config.service.ts:36-40` | boot / `INTEGRATION_REFRESH_MS ?? SETTINGS_CACHE_MS` (min 1 s) | integration_config + Vault |
| No settings: WaMediaRetention (`whatsapp/wa-media.retention.job.ts:7-10`), PushReceipts (`push/push-receipts.job.ts:7-9`), Translations refresh (`translations/translations.service.ts:9-11`, 5 min) | | | |

PayoutsGenerator (`payouts/payouts.generate.ts:26`) reads settings on request, not on a timer.

---

### 6. Observations relevant to a merged key/value/description store

1. Two stores with different shapes: `settings(key, value, updated_at, updated_by)` vs `custom_config(key, value, description, is_public, updated_at, updated_by)`; `is_public` for settings is a registry property, not a column. `publicCustom` and `customKeySchema` both guard against key collision.
2. `SettingsService.all()` returns registry-typed, default-filled values; custom values bypass the registry and have no cache. A merged store must keep `all()`'s contract (28 readers + 7 `overrideProvider` harnesses depend on it).
3. Non-registry rows already live in `public.settings` (google_*), written by a separate service without cache invalidation; `/config/meta` already lists them.
4. Audit entities differ: `settings` (full blob), `custom_config` (per key in action), `integration_config` (key names only), `google_account`.
5. Write paths are non-transactional per-key loops (settings and integrations).
6. Single instance today; any cross-instance invalidation (NOTIFY) does not exist — TTL is the only mechanism.
7. Permission split (`config.*`) needs catalog row + seed migration + parity check; `access-before.json` is keyed by `Controller.method` so renaming controllers requires editing it.

<a id="part-d"></a>

## Part D — settings clients (web page, mobile, e2e)

Repo snapshot: 2026-10-23. Read-only survey for the settings redesign (one «القيم» key/value/description list plus custom pages per heavy module). No tracked file was changed.

Path abbreviations: `W/` = `apps/web/src/`, `S/` = `packages/shared/src/`, `M/` = `apps/mobile/`, `E/` = `e2e/`, `API/` = `apps/api/src/`, `ar:` = a key in `packages/shared/i18n/ar.json`.

Permission columns: **R** = `settings.read`, **W** = `settings.write`, **TM** = `templates.manage`, **MR** = `messages.read`, **ADM** = base-role admin only (`API/modules/google-sync/admin-only.ts:8`). The route `/admin/settings` is gated by **R** only (`W/features/auth/admin-access.ts:26`, nav `W/components/admin-nav-items.ts:34`). **The web never checks `settings.write`.** Every write control below renders for an R-only user, who then gets a 403 (see §5).

---

### 1. Today's `/admin/settings` page: every control, in display order

Route: `W/routes/admin/settings.tsx:5` renders `SettingsPage` (`W/features/settings/SettingsPage.tsx:24`). The page order comes from `PAGE_SECTIONS` (`W/features/settings/page-sections.tsx:133-163`): messaging, then 6 field sections (`FIELD_SECTIONS`, `:120`), then sales, appearance, integrations and custom. Inside the registry sections the field order comes from `SETTINGS_LAYOUT` (`S/settings/layout.ts:21-62`). Section DOM id = `settings-<id>` (`W/components/settings/section-id.ts:2`).

Kinds: switch (a checkbox drawn as a switch, `CheckField`), number (`NumberField`, LTR), list (text with `int_list`), select, tz (`TimeZoneSelect`), text, json (fieldset with one box per shape field, `ShapeRow`), button, radio, segmented, table, dialog, readonly (status or info).

"Save" column:
- **bar** = the one «حفظ» in `SaveBar`. It sends the whole registry form as one `PATCH /settings`.
- **self** = the control saves on its own, at once.
- **own** = its own save button.

#### 1.0 Page chrome

| # | Element | Arabic label (ar key) | Kind | Store / endpoint | Save | Confirmation | Perm | Ref |
|---|---|---|---|---|---|---|---|---|
| 0.1 | Page title | «الإعدادات» (`settings.title`) | heading (Cartouche) | — | — | — | R | `SettingsPage.tsx:32` |
| 0.2 | Section index | «أقسام الإعدادات» (`settings.nav`); 11 links, one per `PAGE_SECTIONS` entry | nav links `href="#settings-<id>"` (smooth scroll, `aria-current`) | — | — | — | R | `SettingsNav.tsx:14-41` |
| 0.3 | Search | «ابحث في الإعدادات», placeholder «ابحث بالاسم أو المفتاح» (`config.search.*`); empty result shows «لا توجد إعدادات تطابق بحثك.» | text (type=search) | client filter over labels, hints, keys, integration labels, custom keys, template names, catalogue | — | — | R | `SettingsSearch.tsx:6`, `SettingsBody.tsx:72`, `use-nothing-matches.ts` |
| 0.4 | Load states | `common.error` FormAlert, ListSkeleton | readonly | `GET /settings` | — | — | R | `SettingsPage.tsx:34-35` |
| 0.5 | Toast | `settings.saved` «تم حفظ الإعدادات» and every `onNote` message | role=status | — | — | — | — | `SettingsPage.tsx:46` |
| 0.6 | Save bar (sticky, **last on the page**) | hint «التغييرات في الحقول لا تُحفظ إلا بزر «حفظ».» (`settings.saveBar`); button «حفظ» (`common.save`) | button | `PATCH /settings` with **every** FORM_KEY (about 37 fields) | bar | none | W | `SaveBar.tsx:13-24`, `use-settings-form.ts:46-52`, `settings-form.ts:104-119` |
| 0.7 | Per-field reset (every registry row, shown only when the value differs from its default) | «أعد القيمة الافتراضية» (`config.reset`; aria `config.resetFor`) | button (ghost) | sets the form to the default; nothing saved until the bar | bar | none | W | `ResetButton.tsx:5`, `RegistryField.tsx:43` |
| 0.8 | Per-field notes (every registry row) | «معدَّل» (`config.dirty`); «آخر تعديل: {at} بواسطة {name}» (`config.changedBy`/`changed`) | readonly | `GET /config/meta` (`['config','meta']`) | — | — | R | `RowNotes.tsx:6-17`, `settings-meta-api.ts:232` |

#### 1.1 «الرسائل والواتساب» (`settings.sections.messaging`), `#settings-messaging`

Drawn by `W/features/settings/sections/MessagingSection.tsx:22-56`. Display order: sending switch, auto switch, feedback mode, lines, catalogue, registry fields, template health.

| # | Control | Arabic label | Kind | Setting key / store | Save | Confirmation | Perm | Ref |
|---|---|---|---|---|---|---|---|---|
| 1.1 | Danger frame around 1.2–1.5 | «إعداد حساس: يؤثر مباشرة في الرسائل أو في التنبيهات.» (`config.danger`) | frame (`data-danger`) | — | — | — | — | `DangerFrame.tsx:5`, `MessagingSection.tsx:37` |
| 1.2 | CRM warning, with button (shown while not done) | note `templates.settings.crmWarning`; button «نقلنا الرقم من الـCRM» (`crmDone`); hint `crmDoneHint` | button | `crm_cutover_done` = true | self | **none** | W | `MessagingSwitch.tsx:41-57` |
| 1.3 | CRM undo (shown once done) | «نُقل الرقم من الـCRM إلى المنصة.» + button «عاد الرقم إلى الـCRM؟ أعد التحذير» (`crmUndo`) | button | `crm_cutover_done` = false | self | **none** | W | `MessagingSwitch.tsx:58-70` |
| 1.4 | Sending switch | «إرسال الرسائل» (`messagingEnabled`); chip «الإرسال يعمل/متوقف»; button «تفعيل إرسال الرسائل» (`enableTitle`) or «أوقف الإرسال» (`disable`); hint `messagingEnabledHint` | chip + button | `messaging_enabled` (`form:false`, `S/settings/domains/messaging.ts:7`) | self | **ConfirmSwitchDialog** both ways. ON: title «تفعيل إرسال الرسائل», yes «نعم، فعّل الإرسال», shows the queued count and the CRM warning. OFF: «إيقاف إرسال الرسائل», yes «نعم، أوقف الإرسال». Cancel has default focus | W (+MR for the gate) | `MessagingSwitch.tsx:71-130` |
| 1.5 | Server gate note | `gateNotConfigured`, `queued.*` (plural), `recipientsRestricted` | readonly | `GET /messages/gate` (`['send-gate']`) | — | — | MR | `ServerGateNote.tsx:15-29`, `W/features/messaging/api.ts:6` |
| 1.6 | Auto-messages switch (in its own DangerFrame) | «الرسائل التلقائية (تذكير الحلقات، المتابعة، التجديد)» (`autoMessages`); chip «الرسائل التلقائية تعمل/مغلقة»; button «فعّل/أوقف الرسائل التلقائية»; risk note «تأكد من توقف تذكيرات الـApps Script» (`autoCheckScript`) | chip + button | `auto_messages_enabled` (`form:false`) | self | **ConfirmSwitchDialog** both ways (`autoEnableConfirm`/`autoDisableConfirm`, yes «نعم، فعّلها»/«نعم، أوقفها») | W | `AutoMessagesSwitch.tsx:31-70`, `MessagingSection.tsx:41-45` |
| 1.7 | Feedback mode | legend «بعد انتهاء الحلقة» (`feedbackMode`); «أزرار التقييم في واتساب» / «رابط الاستمارة يدويًا»; the hint changes with the mode | radio chips | `feedback_mode` enum `buttons\|link` (`form:false`, `S/settings/domains/feedback.ts:8`) | self | **none** | W | `FeedbackModeSwitch.tsx:16-34` |
| 1.8 | «خطوط واتساب» card | title `lines.title`, intro; button «افحص الخطوط» (`lines.check`); «لم يُفحص بعد» | button | `POST /messaging/lines/check`; result cached in `['messaging','lines-check']` | — | none (read-only Meta call) | TM | `LinesCard.tsx:15-52` |
| 1.9 | Line rows (notifications, chat) | `enums.waLine.*`; chips مضبوط / غير مضبوط على الخادم; provider and gaps (`LineDriver`); Meta facts (`LineFacts`); webhook state; call errors; «آخر فحص» | readonly (`data-testid="line-row"`, `data-line`, `data-tone`) | lines check | — | — | TM | `LineRow.tsx:89-116`, `LineDriver.tsx:27`, `LineFacts.tsx:42` |
| 1.10 | «ماذا يُرسل ومتى» | `notificationCatalogue.title`; badge «للاطلاع فقط»; intro; «أرقام واتساب» numbers line; 25 entry rows (`data-key`); on error a retry button «أعد تحميل القائمة» | readonly region (`role=region`, `aria-labelledby="notification-catalogue-title"`) + retry button | `GET /admin/notifications` (`['admin-notifications', version]`, refetched when settings, integrations or the lines check change) | — | — | R | `CatalogueSection.tsx:32-72`, `CatalogueRow.tsx:24`, `NumbersLine.tsx:12`, `catalogue-api.ts:9` |
| 1.11 | reminder_minutes_before | «تذكير الحلقة قبلها بكم دقيقة» | number 5–720 | `reminder_minutes_before` | bar | none | W | `S/settings/domains/notifications.ts:7` |
| 1.12 | reminder_24h_enabled | «تذكير قبل الحلقة بيوم» | switch | `reminder_24h_enabled` | bar | none | W | `notifications.ts:11` |
| 1.13 | teacher_whatsapp_new_student | «رسالة واتساب للمعلم/ة عند حجز طالب جديد» | switch | `teacher_whatsapp_new_student` | bar | none | W | `notifications.ts:13` |
| 1.14 | teacher_whatsapp_lesson_reminder | «تذكير المعلم/ة بالحلقة على واتساب» | switch | `teacher_whatsapp_lesson_reminder` | bar | none | W | `notifications.ts:18` |
| 1.15 | follow_up_hours | «المتابعة بعد كم ساعة من آخر رسالة» (hint «مثلًا 24 ثم 72») | list (text; ascending, ≤5 items, 1–720) | `follow_up_hours` | bar | none | W | `S/settings/domains/follow-ups.ts:7` |
| 1.16 | reminder_lookahead_hours | «مدى البحث عن الحلقات القادمة للتذكير بالساعات» | number 25–72 | `reminder_lookahead_hours` | bar | none | W | `notifications.ts:23` |
| 1.17 | follow_up_slots_from_hours | «أقرب موعد يُقترح في رسالة المتابعة بعد كم ساعة» | number 1–168 | `follow_up_slots_from_hours` | bar | none | W | `follow-ups.ts:12` |
| 1.18 | follow_up_slots_to_days | «أبعد موعد يُقترح في رسالة المتابعة خلال كم يومًا» | number 1–30 | `follow_up_slots_to_days` | bar | none | W | `follow-ups.ts:17` |
| 1.19 | quick_reply_window_hours | «يُعتمد رد «نعم» المكتوب خلال كم ساعة من رسالتنا» | number 1–168 | `quick_reply_window_hours` | bar | none | W | `messaging.ts:11` |
| 1.20 | Template health header | **h2** «قوالب واتساب» (`templates.title`); intro; `salesStarterIntro`; «توجد قوالب غير جاهزة…» (`needsAttention`) | readonly. It is an h2 inside the messaging section and has **no index entry** | `GET /messaging/templates` (`['templates']`) | — | — | MR | `TemplateHealth.tsx:21-58` |
| 1.21 | «القوالب حسب الرقم», one block per line | `templates.perNumber.title`; phone, WABA and driver facts; «آخر مزامنة»; sync result (count, re-checked, imported, skipped with reasons) | readonly (`data-testid="template-line"`, `data-line`) | `GET /messaging/templates/lines` (`['templates','lines']`) | — | — | TM (TemplateManagerGuard) | `TemplateLines.tsx:13`, `TemplateLineBlock.tsx:56-83`, `LineSyncResult.tsx:14` |
| 1.22 | Per-line «مزامنة مع Meta» | `perNumber.sync`; aria «{line}: مزامنة مع Meta» (`syncFor`) | button ×2 | `POST /messaging/templates/health {line}` (it imports rows) | self | **none** | TM | `TemplateLineBlock.tsx:66-70`, `use-line-sync.ts` |
| 1.23 | Template table | columns: القالب (text filter), الرقم (select filter), النوع (select), الحالة (select, plus Meta's reason), الجودة (select), آخر مراجعة, متاح للمعلمين والمبيعات, إجراء. Client-side sort and filter; rows stack on phones | table (`DataTable stacked clientSort clientFilter`) | `message_templates` | — | — | MR | `template-columns.tsx:34-123` |
| 1.24 | Per-row «متاح للمعلمين والمبيعات» | aria «{name}: متاح للمعلمين والمبيعات» (`salesStarterFor`) | switch | `PATCH /messaging/templates/:key/starter {sales_starter}` | self | **none** | TM | `StarterToggle.tsx:15`, `use-template-actions.ts:336` |
| 1.25 | Per-row «أرسله إلى ميتا للاعتماد» (only not_submitted, rejected or missing rows) | `templates.submit` | button | `POST /messaging/templates/:key/submit` | self | **SubmitTemplateDialog**: shows body, footer, params, buttons, category and «يُرسَل إلى» (`data-testid="submit-target"`); yes «نعم، أرسله» | TM | `template-cells.tsx:61`, `SubmitTemplateDialog.tsx:25-83` |
| 1.26 | Per-row «نقل إلى الرقم الآخر» | aria «{name}: نقل إلى الرقم الآخر»; disabled with «الرقم الآخر غير مضبوط على الخادم» | button | `PATCH /messaging/templates/:key/line {line}` | self | **MoveLineDialog** «نقل القالب إلى الرقم الآخر», yes «نعم، انقله»; producer warning `role=note` | TM | `template-cells.tsx:64-78`, `MoveLineDialog.tsx:25-60` |
| 1.27 | Template toast | submitted, moved, starterOn/Off, synced, syncFailed | toast | — | — | — | — | `TemplateHealth.tsx:79` |

#### 1.2 «الجدول والحلقات» (`settings.sections.schedule`), `#settings-schedule`

Generic `FieldsSection` (`sections/FieldsSection.tsx:11`) draws each row through `RegistryField` (`registry-form/RegistryField.tsx:35-76`). Every row also gets 0.7 and 0.8.

| # | Arabic label | Kind | Key | Save | Confirm | Perm | Ref |
|---|---|---|---|---|---|---|---|
| 2.1 | «تُجدول الحلقات لكم أسبوعًا مقدمًا» | number 1–12 | `booking_horizon_weeks` | bar | none | W | `S/settings/domains/scheduling.ts:5` |
| 2.2 | «حساب الإلغاء المتأخر» (toggle; hint «إن كان مغلقًا، فلا يُحسب أي إلغاء على الطالب») | switch (null = OFF) | `late_cancel_hours` (the `lateCancelHoursOn` form field) | bar | none | W | `scheduling.ts:10`, `RegistryField.tsx:53-57` |
| 2.3 | «يُحسب الإلغاء متأخرًا إن كان قبل الحلقة بأقل من كم ساعة» | number 1–168, disabled while 2.2 is OFF | `late_cancel_hours` | bar | none | W | same |
| 2.4 | «يمكن تعويض الحلقة الفائتة خلال كم يومًا» | number 1–365 (**public**) | `makeup_window_days` | bar | none | W | `scheduling.ts:16` |
| 2.5 | «كل المعلمين متاحون للحجز على مدار الساعة طوال الأسبوع» | switch | `teachers_always_available` | bar | **none** (affects booking) | W | `scheduling.ts:24` |

#### 1.3 «الحلقات عبر الإنترنت» (`classroom`), `#settings-classroom`

| # | Arabic label | Kind | Key | Save | Confirm | Perm | Ref |
|---|---|---|---|---|---|---|---|
| 3.1 | «تُفتح الحلقة قبل موعدها بكم دقيقة» | number 0–180 (**public**) | `join_opens_before_min` | bar | none | W | `classroom.ts:6` |
| 3.2 | «تُغلق الحلقة بعد انتهائها بكم دقيقة» | number 0–720 (**public**) | `join_closes_after_min` | bar | none | W | `classroom.ts:11` |
| 3.3 | «عنوان الاجتماع الداخلي الافتراضي» | text 1–60 | `default_meeting_title` | bar | none | W | `classroom.ts:16` |
| 3.4 | «الوضع الافتراضي: الحلقات عبر منصة الأكاديمية» | switch (**public**) | `meeting_link_auto` | bar | **none** (changes the links families get) | W | `classroom.ts:25` |

#### 1.4 «التقارير» (`reports`), `#settings-reports`

| # | Arabic label | Kind | Key | Save | Confirm | Perm | Ref |
|---|---|---|---|---|---|---|---|
| 4.1 | «يمكن للمعلم/ة تعديل التقرير حتى كم ساعة بعد إرساله» | number 0–168 | `report_teacher_edit_hours` | bar | none | W | `reports.ts:7` |

#### 1.5 «الحسابات والدفعات» (`accounts`), `#settings-accounts`

| # | Arabic label | Kind | Key | Save | Confirm | Perm | Ref |
|---|---|---|---|---|---|---|---|
| 5.1 | «عملة الأرقام في لوحة التحكم» | select (`CURRENCY_ISOS`; a stored unknown code is kept) | `reporting_currency` | bar | none | W | `finance.ts:7`, `RegistryField.tsx:19-29` |
| 5.2 | «نبّه للتجديد عندما يتبقى في الباقة كم حلقة» | number 0–10 | `renewal_alert_remaining` | bar | none | W | `subscriptions.ts:10` |
| 5.3 | «يُعدّ الاشتراك منتهيًا بعد كم يوم من انتظار التجديد» | number 1–90 | `subscription_expiry_days` | bar | none | W | `subscriptions.ts:15` |
| 5.4 | «علّم الحلقات القادمة إن انتهت الباقة ولم تُدفع» | switch | `flag_future_lessons_when_unpaid` | bar | none | W | `subscriptions.ts:19` |
| 5.5 | «تُحسب الحلقة التي تأخر فيها الطالب في مستحقات المعلم/ة» | switch | `payout_count_late` | bar | none | W | `payouts.ts:10` |
| 5.6 | «تُحسب الحلقة التي غاب فيها الطالب دون إشعار في مستحقات المعلم/ة» | switch | `payout_count_no_show` | bar | none | W | `payouts.ts:11` |
| 5.7 | «تُحسب الحلقة التجريبية في مستحقات المعلم/ة» (no hint) | switch | `payout_count_trials` | bar | none | W | `payouts.ts:12` |
| 5.8 | «يُعاد استخدام سعر الصرف المحفوظ مدة كم ساعة» | number 1–168 | `fx_fresh_hours` | bar | none | W | `finance.ts:9` |

#### 1.6 «الملفات المرفوعة» (`uploads`), `#settings-uploads`

| # | Arabic label | Kind | Key | Save | Confirm | Perm | Ref |
|---|---|---|---|---|---|---|---|
| 6.1 | «الحد الأقصى لحجم الملف المرفوع بالميغابايت» | number 1–10 (**public**) | `upload_max_mb` | bar | none | W | `uploads.ts:7` |

#### 1.7 «الأكاديمية والتواصل» (`academy`), `#settings-academy`

| # | Arabic label | Kind | Key | Save | Confirm | Perm | Ref |
|---|---|---|---|---|---|---|---|
| 7.1 | «رقم واتساب الأكاديمية» | text LTR (e164, normalised by `normalizePhone`) (**public**) | `academy_whatsapp_e164` | bar | none | W | `academy.ts:11`, `settings-form.ts:70` |
| 7.2 | «المنطقة الزمنية للأكاديمية» | tz select | `academy_timezone` (an SQL reader also has a coalesce default) | bar | none | W | `academy.ts:15` |
| 7.3 | «مدة حدّ الطلبات في استمارة الرأي العامة بالدقائق» | number 1–120 | `feedback_rate_window_min` | bar | none | W | `feedback.ts:9` |
| 7.4 | «بيانات تواصل الأكاديمية»: «الموقع» + «البريد الإلكتروني» (`config.fields.*`) | json fieldset (2 LTR inputs) (**public**) | `academy_contact` | bar | none | W | `academy.ts:23`, `ShapeRow.tsx:13-57` |
| 7.5 | «إشعار الموافقة على التسجيل»: «النص بالعربية» + «النص بالإنجليزية» | json fieldset (2 textareas; nullable) (**public**) | `recording_consent_notice` | bar | none | W | `recordings.ts:9` |
| 7.6 | «حذف التسجيلات بعد مدة» (toggle) | switch (null = keep forever) | `recording_retention_days` (`…On`) | bar | **none, although it turns on file deletion** | W | `recordings.ts:15` |
| 7.7 | «مدة الاحتفاظ بتسجيلات الحلقات بالأيام» | number 1–3650, disabled while 7.6 is OFF; onValue 90 | `recording_retention_days` | bar | none | W | same |
| 7.8 | «مدة الاحتفاظ بسجل النشاط بالأيام» | number 1–3650 | `activity_retention_days` (SQL `prune_activity_log` reads it) | bar | none | W | `activity.ts:9` |

#### 1.8 «فريق المبيعات» (`sales`), `#settings-sales`

| # | Arabic label | Kind | Key | Save | Confirm | Perm | Ref |
|---|---|---|---|---|---|---|---|
| 8.1 | «التعيين التلقائي للعملاء الجدد» (`sales.assign.auto`); chip «يعمل/متوقف»; button «فعّله/أوقفه»; hint `autoHint` | chip + button | `sales_auto_assign` (`form:false`) | self | **none** | W | `W/features/sales/SalesAutoAssignSwitch.tsx:14-35`, `sections/SalesSection.tsx:9` |

#### 1.9 «المظهر» (`appearance`), `#settings-appearance`

| # | Arabic label | Kind | Store | Save | Confirm | Perm | Ref |
|---|---|---|---|---|---|---|---|
| 9.1 | «مظهر الواجهة» (`settings.theme`), hint `themeHint`; options «تلقائي/فاتح/ليلي» (`theme.*`) | segmented (`ThemeToggle`) | **browser localStorage**, not a stored setting | self | none | R | `sections/AppearanceSection.tsx:11-25` |

#### 1.10 «التكاملات» (`integrations.title`), DOM id `#settings-integrations`; the external hash is `#integrations`

`W/features/integrations/IntegrationsPanel.tsx:18-30`. Intro `integrations.intro` and `secretNote`; on a load error, `loadError`. The groups come in `INTEGRATION_GROUPS` order (`S/integrations/keys.ts:7`) and the rows in `GROUP_OF` order (`keys.ts:62-96`).

- **Plain** rows (`PlainIntegrationRow.tsx:172`): text input (LTR, monospace), or a select for `WA_PROVIDER`, `WA_CHAT_PROVIDER` and `WA_TEMPLATE_SYNC`. The empty choice clears the value. Each row also shows a source note «من الإعدادات/من الخادم/غير مضبوط» (`IntegrationSourceNote.tsx:4`) and «للمطوّر» `<details>` with the key name (`DeveloperKey.tsx:335`). Plain rows are saved by 10.33 and stored in `integration_config`.
- **Secret** rows (`SecretIntegrationRow.tsx:233`): a status chip «محفوظ في {at}/مضبوط على الخادم/غير مضبوط», a password input, «حفظ القيمة» (`PUT /settings/integrations/secrets/:key`, saves at once, **no confirm**) and «مسح» (only when source=db). «مسح» opens a **Dialog**: «مسح {key} من الإعدادات؟…», yes «مسح», cancel autofocus. Stored in Vault `integration:<KEY>`.

| # | Group (ar) | Key | Arabic label | Kind |
|---|---|---|---|---|
| 10.1 | خط إشعارات واتساب | WA_PROVIDER | مزوّد الإرسال | select (meta/kapso) |
| 10.2 | 〃 | WA_API_BASE | عنوان واجهة Graph | text |
| 10.3 | 〃 | WA_API_VERSION | إصدار واجهة Graph | text |
| 10.4 | 〃 | WA_PHONE_NUMBER_ID | معرّف رقم الهاتف | text |
| 10.5 | 〃 | WA_WABA_ID | معرّف حساب واتساب للأعمال | text |
| 10.6 | 〃 | WA_APP_ID | معرّف تطبيق ميتا | text |
| 10.7 | 〃 | WA_ACCESS_TOKEN | رمز الوصول | secret |
| 10.8 | 〃 | WA_APP_SECRET | سر التطبيق | secret |
| 10.9 | 〃 | WA_VERIFY_TOKEN | رمز التحقق من الربط | secret |
| 10.10 | خط محادثات واتساب | WA_CHAT_PROVIDER | مزوّد إرسال خط المحادثات | select |
| 10.11 | 〃 | WA_CHAT_PHONE_NUMBER_ID | معرّف رقم خط المحادثات | text |
| 10.12 | 〃 | WA_CHAT_WABA_ID | معرّف حساب خط المحادثات | text |
| 10.13 | 〃 | WA_CHAT_APP_ID | معرّف تطبيق خط المحادثات | text |
| 10.14 | 〃 | WA_CHAT_ACCESS_TOKEN | رمز وصول خط المحادثات | secret |
| 10.15 | 〃 | WA_CHAT_APP_SECRET | سر تطبيق خط المحادثات | secret |
| 10.16 | Kapso (مزوّد واتساب بديل) | KAPSO_API_BASE | عنوان واجهة Kapso | text |
| 10.17 | 〃 | KAPSO_API_VERSION | إصدار واجهة Kapso | text |
| 10.18 | 〃 | KAPSO_API_KEY | مفتاح مشروع Kapso | secret |
| 10.19 | 〃 | KAPSO_WEBHOOK_SECRET | سر توقيع رسائل Kapso الواردة | secret |
| 10.20 | الحماية في بيئة الاختبار | WA_ALLOWED_RECIPIENTS | الأرقام المسموح بالإرسال إليها | text. Clearing it opens **ConfirmSwitchDialog** «إلغاء قيد الأرقام المسموح بها», yes «نعم، احفظ دون قيد» (`IntegrationsForm.tsx:73-97`, `integrations-form.ts:67`) |
| 10.21 | 〃 | WA_TEMPLATE_SYNC | مزامنة القوالب مع ميتا | select «مفعّلة/متوقفة» |
| 10.22 | الحلقات عبر الإنترنت (LiveKit) | LIVEKIT_URL | عنوان خادم الحلقات | text |
| 10.23 | 〃 | LIVEKIT_API_KEY | مفتاح LiveKit | secret |
| 10.24 | 〃 | LIVEKIT_API_SECRET | سر LiveKit | secret |
| 10.25 | إشعارات الجوال (Expo) | EXPO_API_BASE | عنوان خدمة إشعارات Expo | text |
| 10.26 | 〃 | EXPO_ACCESS_TOKEN | رمز وصول Expo | secret |
| 10.27 | إشعارات المتصفح (Web Push) | WEB_PUSH_VAPID_PUBLIC_KEY | مفتاح VAPID العام | text |
| 10.28 | 〃 | WEB_PUSH_VAPID_PRIVATE_KEY | مفتاح VAPID الخاص | secret |
| 10.29 | 〃 | WEB_PUSH_SUBJECT | جهة التواصل لخدمات الإشعارات | text |
| 10.30 | أسعار الصرف | FX_API_URL | عنوان مزوّد أسعار الصرف | text |
| 10.31 | Google (التقويم وDrive والجداول) | GOOGLE_CLIENT_ID | معرّف عميل OAuth | text |
| 10.32 | 〃 | GOOGLE_CLIENT_SECRET | سر عميل OAuth | secret |
| 10.33 | (form footer) | — | hint «اترك الحقل فارغًا ليُستخدم ما على الخادم.» (`clearHint`); button «حفظ التكاملات» (`saveValues`; disabled when nothing changed) | button: `PUT /settings/integrations {values}`. A **second save button**, separate from the page SaveBar |

All rows need W to write and R to read (`API/common/integrations/integration-config.controller.ts:22,37,46,56`). The invalid-value error is `integrations.invalid`.

##### 1.10b Google sync, a sub-section of «التكاملات» (h3 «Google: التقويم وDrive والجداول», `googleSync.title`)

`W/features/google-sync/GoogleSection.tsx:21`. Every route is `/admin/google/*`; GETs need R, writes need W, and all of them need **ADM**. The stored keys `google_sync_enabled`, `google_sync_mode` and `google_calendar_window_days` live in `public.settings`, outside the registry (docs/25 §6).

| # | Card / control | Arabic label | Kind | Endpoint / store | Confirmation | Ref |
|---|---|---|---|---|---|---|
| 11.1 | Status loading or error | `googleSync.loadError` + «أعد المحاولة» | readonly + button | `GET /admin/google/status` (`['google','status']`) | — | `GoogleSection.tsx`, `GoogleBlock.tsx:39-62` |
| 11.2 | «الحساب المتصل»: status chip, email, since, last error, not-configured note | `connection.*` | readonly | status | — | `ConnectionCard.tsx` |
| 11.3 | Redirect URI | «عنوان إعادة التوجيه (سجّله في عميل OAuth على Google Cloud)» | readonly text input (select on focus) | status.redirect_uri | — | `RedirectUri.tsx` |
| 11.4 | Scopes list | «الصلاحيات المطلوبة» | readonly | status.scopes | — | `ConnectionCard.tsx` |
| 11.5 | «اربط حساب Google» / «أعد الربط» | `connection.connect/reconnect` | button; full-page redirect to Google | `GET /admin/google/connect`; callback `GET /integrations/google/callback` sends a 302 to `/admin/settings?google=…#integrations` | none | `ConnectionActions.tsx`, `API/modules/google-sync/google-callback.controller.ts:24`, `use-oauth-return.ts:75` |
| 11.6 | «افصل الحساب» | `connection.disconnect` | button + **Dialog** («فصل حساب Google؟…», danger, cancel autofocus) | `POST /admin/google/disconnect` | Dialog | `ConnectionActions.tsx` |
| 11.7 | «التشغيل», «مزامنة Google» chip, «شغّل المزامنة» | `switches.enabled`, `confirm.enableOk` | button + **Dialog** «تشغيل مزامنة Google؟» (or **LiveConfirmDialog** when the mode is live) | `PUT /admin/google/settings {enabled:true}` → `google_sync_enabled` | Dialog | `SyncSwitches.tsx` |
| 11.8 | «أوقف المزامنة» | `web.disable` | button | `{enabled:false}` | **none** (immediate) | `SyncSwitches.tsx` |
| 11.9 | «طريقة العمل»: «تجربة بدون كتابة» / «كتابة فعلية» | `switches.mode/dryRun/live` | segmented | `{mode}` → `google_sync_mode` | live: **LiveConfirmDialog** (names the calendars and folder; yes «ابدأ الكتابة الفعلية»); dry_run: immediate | `ModeControl.tsx`, `LiveConfirmDialog.tsx` |
| 11.10 | «نطاق التقويم بالأيام» + «حفظ النطاق» | `switches.window`, `web.save` | number + **own save button** | `{window_days}` → `google_calendar_window_days` | none | `WindowDaysField.tsx` |
| 11.11 | «Drive والجداول»: «ابحث في Google» | `drive.discover` | button (enabled only when connected) | `POST /admin/google/discover` | none (read-only search) | `DriveCard.tsx` |
| 11.12 | Found folder and sheet, confirmed chip | `drive.rootFolder/summarySheet/confirmed` | readonly | status | — | `DriveCard.tsx` |
| 11.13 | «تأكيد المجلد والجدول» | `drive.confirm` | button | `PUT /admin/google/drive` | none | `DriveCard.tsx` |
| 11.14 | «المعلمون والتقاويم»: per teacher «التقويم: {name}» select + «تأكيد» | `teachers.*` | select + button per row | `GET /admin/google/teachers`, `PUT /admin/google/teachers/:id` | none | `TeacherMap.tsx`, `TeacherRow.tsx`, `TeacherCalendarSelect.tsx` |
| 11.15 | «الطلاب والمجلدات»: search «ابحث باسم الطالب أو رمزه» | `students.search` | search input (300 ms debounce, server side) | `GET /admin/google/students?q=` | — | `StudentMap.tsx` |
| 11.16 | Per student: «تأكيد», «مجلد جديد», «ربط يدوي», «إلغاء التأكيد» | `common.confirm`, `students.createNew/manual/unmap` | buttons | `PUT`/`DELETE /admin/google/students/:id` | **none** (including unmap) | `StudentActions.tsx`, `StudentRow.tsx` |
| 11.17 | Manual link form: «رابط مجلد الطالب في Drive», «رابط سجل الحضور (اختياري)», «استخدم هذا المجلد», «إلغاء» | `students.*` | 2 URL inputs + 2 buttons | `PUT …/students/:id` | none | `StudentManualLink.tsx` |
| 11.18 | «سجل المزامنة»: «زامن الآن», gap note, counts, item list | `log.*` | button + list (`aria-label` = title) | `POST /admin/google/reconcile`, `GET /admin/google/items` | none | `SyncLog.tsx` |
| 11.19 | Per item «إعادة المحاولة» | `log.retry` | button | `POST /admin/google/items/:id/retry` | none | `SyncLogRow.tsx` |
| 11.20 | OAuth return toast | `connection.connected/failed` | toast | URL `?google=` | — | `GoogleSection.tsx` |

#### 1.11 «قيم مخصصة» (`config.sections.custom`), `#settings-custom`

`W/features/custom-config/CustomValuesPanel.tsx:19-87`. Data comes from `GET /config/custom` (`['config','custom']`). Reads need R; writes need W (`API/common/custom-config/custom-config.controller.ts:14,29,47`).

| # | Control | Arabic label | Kind | Endpoint | Confirmation | Ref |
|---|---|---|---|---|---|---|
| 12.1 | Hint, empty and load-error lines | `config.custom.hint` (warns that public values are readable by anyone), `empty`, `loadError` | readonly | — | — | `CustomValuesPanel.tsx:45-47` |
| 12.2 | Entry row: key (LTR mono), chip «عامة/خاصة», description, value preview (≤120 chars) | `public`/`private` | readonly row | — | — | `CustomEntryRow.tsx:162` |
| 12.3 | «عدّل» per row | `edit` | button that opens the inline form (key locked) | — | — | `CustomEntryRow.tsx:170` |
| 12.4 | «احذف» per row | `delete` | button + **Dialog** «حذف القيمة «{key}» نهائيًا؟», yes «نعم، احذفها» | `DELETE /config/custom/:key` | Dialog | `CustomValuesPanel.tsx:70-84` |
| 12.5 | «أضف قيمة» | `add` | button that opens an empty inline form | — | — | `CustomValuesPanel.tsx:65` |
| 12.6 | Form «المفتاح» (+ hint about the allowed characters; errors `invalidKey`/`reservedKey`) | `key`, `keyHint` | text LTR | — | — | `CustomEntryForm.tsx:128-133` |
| 12.7 | Form «القيمة (JSON)» (errors `invalidJson`/`nullValue`/`tooLarge`) | `value` | textarea JSON | — | — | `:134-138` |
| 12.8 | Form «الوصف» | `description` | text | — | — | `:139-142` |
| 12.9 | Form «عامة (تُعرض بلا تسجيل دخول)» | `isPublic` | plain checkbox (not the switch style) | — | **none**, although the value becomes readable without login | `:143-146` |
| 12.10 | Form «إلغاء» / «احفظ القيمة» | `cancel`/`save` | buttons | `PUT /config/custom/:key` | none | `:147-150` |

#### 1.12 Hash anchors and inbound links to the page

| Link | Target id | Status | Ref |
|---|---|---|---|
| `#settings-<id>` for all 11 sections | `Section` id | works | `SettingsNav.tsx:30`, `Section.tsx:7` |
| `/admin/settings#integrations` | — (the DOM id is `settings-integrations`) | **does not scroll**. Kept on purpose (docs/25 §2) | OAuth callback `google-callback.controller.ts:24`; web push or bell path `S/notifications/web-path.ts:61` (`google_sync_alert`); e2e `google-sync.spec.ts:26` |
| `/admin/settings#settings-messaging` | messaging section | works (template submits) | `W/features/teachers/MeetingModeWarnings.tsx:10` |
| `/admin/settings` (no hash) | top | — | `W/features/feedback/FeedbackRequestButton.tsx:61`, `W/features/classroom/SendLinkButton.tsx:54` |
| `?google=connected\|error&reason=` | read once, then removed (replace) | — | `use-oauth-return.ts:75-87` |

#### 1.13 Count

- **11 index sections**, plus the Google sub-section and the template-health sub-section, which has no index entry.
- **39 registry keys** (`S/settings/layout.ts`):
  - 34 in the generic form (FORM_KEYS). On screen they are 37 rows, because the two nullable toggles (2.2 and 7.6) each add a row, and 2 json fieldsets hold 4 inputs.
  - 5 `form:false` keys with bespoke controls: messaging_enabled, auto_messages_enabled, crm_cutover_done, feedback_mode, sales_auto_assign.
- **32 integration keys**: 20 plain and 12 secret.
- **3 google rows** outside the registry.
- **Free-form custom rows.**
- Numbered inventory rows in this section: 8 (chrome) + 27 (messaging) + 5 + 4 + 1 + 8 + 1 + 8 + 1 + 1 (registry and sections) + 33 (integrations) + 20 (google) + 10 (custom) = **127 rows**.
- **5 independent save paths** on one page:
  1. SaveBar
  2. self-saving switches
  3. «حفظ التكاملات»
  4. per-secret «حفظ القيمة»
  5. Google «حفظ النطاق» and Google self-saves

  Custom values have their own save as well.
- Confirmation coverage:
  - ConfirmSwitchDialog: messaging ON/OFF, auto ON/OFF, emptying the allow-list.
  - Dialog: secret clear, custom delete, Google disconnect, Google enable.
  - LiveConfirmDialog: Google live mode.
  - Submit and Move template dialogs.
  - **No confirmation**:
    - crm_cutover_done in both directions
    - feedback_mode
    - sales_auto_assign
    - Google sync OFF
    - the registry switches: recording_retention ON, teachers_always_available, meeting_link_auto, the teacher WhatsApp switches
    - template sync and starter
    - saving a secret
    - student unmap
    - custom «عامة»
- DangerFrame wraps only 1.2–1.6.

---

### 2. Web: routes, query keys, API, public-config, translations

#### 2.1 Routes touching settings

| Route | Purpose | Gate | Ref |
|---|---|---|---|
| `/admin/settings` | the page above | `settings.read` | `W/routes/admin/settings.tsx:5`, `W/features/auth/admin-access.ts:26` |
| `/admin/translations` | i18n overrides editor | `translations.manage` | `W/routes/admin/translations.tsx`, `admin-access.ts:27`, nav `admin-nav-items.ts:35` |

No other web route edits settings. `/admin/roles` grants `settings.*` and has no settings UI of its own.

#### 2.2 React Query keys

| Key | Endpoint | Owner / writers | Ref |
|---|---|---|---|
| `['settings']` (`CONFIG_QUERY_KEYS.settings`) | `GET /settings` | `settingsQuery`. Written by `setQueryData` after `PATCH` (form `use-settings-form.ts:38`, switches `W/lib/use-setting-switch.ts:20`). Read by the page, `CatalogueSection.tsx:33` and `W/features/inbox/FollowUpLine.tsx:42` | `W/lib/settings-api.ts:7`, `W/lib/query-keys.ts:9` |
| `['settings','public']` (`PUBLIC_CONFIG_QUERY_KEY`) | `GET /settings/public` (staleTime 300 s; server `max-age=60`) | invalidated **only** by the registry form save (`use-settings-form.ts:40`). Not by the switches, custom saves or Google | `S/public-config.ts:10-14`, `W/lib/public-config.ts:20` |
| `['settings','integrations']` | `GET /settings/integrations` | integrations form and secrets | `integrations-api.ts:370` |
| `['config','meta']` | `GET /config/meta` | invalidated by the form save only (the switches do **not** invalidate it) | `settings-meta-api.ts:232` |
| `['config','custom']` | `GET /config/custom` | custom panel | `custom-api.ts:185` |
| `['send-gate']` | `GET /messages/gate` | MessagingSwitch; invalidated after integration saves | `W/features/messaging/api.ts:6` |
| `['messaging','lines-check']` | (skipToken; cache only) | LinesCard writes; templates and catalogue read | `messaging/api.ts:18` |
| `['admin-notifications', version]` | `GET /admin/notifications` | catalogue | `catalogue-api.ts:9` |
| `['templates']`, `['templates','lines']` | `GET /messaging/templates[/lines]` | template health | `W/features/templates/api.ts:214-223` |
| `['google','status' \| 'teachers' \| 'students',q \| 'items']` | `/admin/google/*` | google-sync | `W/features/google-sync/google-api.ts:18-40` |
| `['translations', search]` | `GET /i18n/keys` | translations page | `W/features/translations/translations.api.ts:14` |

`W/lib/query-keys.ts:8-14` names the first 5 keys only. The other keys are inline literals. The QueryClient uses defaults (`W/boot.tsx:13`): staleTime 0 and refetchOnWindowFocus on (see the §5 defect on the form not re-syncing).

#### 2.3 `W/lib/settings-api.ts`

- `settingsQuery` `GET /settings` (`:7`)
- `updateSettings` `PATCH /settings` (`:13`): "only the keys sent change". The web form nevertheless sends all FORM_KEYS.

#### 2.4 public-config consumers (web)

`W/lib/public-config.ts` exports `publicConfigQuery`, `usePublicConfig`, `usePlatformClassroom`, `useJoinWindow` and `useUploadMaxBytes`.

| Hook | Consumers |
|---|---|
| `useUploadMaxBytes` (upload_max_mb) | `teacher-earnings/PayDialog.tsx:27`, `booking/InvoiceField.tsx:33`, `expenses/ExpenseDialog.tsx:24`, `assistants/PayStatementDialog.tsx:24`, `payments/RecordPaymentDialog.tsx:37`, `payouts/PayPayoutDialog.tsx:27`, `inbox/AttachButton.tsx:22`, `inbox/sales-money/SalesTransferStep.tsx:36` |
| `useJoinWindow` (join_opens/closes) | `classroom/AdminSessions.tsx:75`, `classroom/StaffJoinButton.tsx:26`, `classroom/JoinButton.tsx:31`, `dashboard/DashboardPage.tsx:45`, `dashboard/TodayLessons.tsx:53` |
| `usePlatformClassroom` (meeting_link_auto) | `sales/TeacherDetail.tsx:20`, `teacher/TeacherLessonCard.tsx:34`, `teacher/TeacherDashboard.tsx:57`, `schedule/LessonDetails.tsx:37` |
| `usePublicConfig` direct | `feedback/ThankYou.tsx:25` (academy WhatsApp), `schedule/MakeupAction.tsx:16` (makeup_window_days) |
| `publicConfigQuery` raw | `teachers/TeacherMeetingModeField.tsx:26` |

No web code reads `custom` (the public custom values). The 9 public registry keys are listed in the §1 tables marked **public**.

#### 2.5 Translations and `translation_overrides`

- Table `public.translation_overrides`, migration `packages/db/supabase/migrations/20261005000213_translation_overrides.sql:11-17`:
  - `key text` must match `^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$` and be ≤200 characters.
  - `locale` is `ar` or `en`.
  - PK `(key, locale)`.
  - **Rows are keyed by the dotted i18n path** (for example `nav.leads`, `templates.settings.messagingEnabled`).
- Editor endpoints (`translations.api.ts:13-43`):
  - `GET /i18n/keys?search&section&page` (the "section" filter is the top-level i18n segment)
  - `PUT /i18n/:locale/:key`
  - `DELETE /i18n/:locale/:key`
- Boot loading:
  - Web: `GET /i18n/:locale/overrides` (`W/lib/i18n-overrides.ts:72`; 1.5 s timeout, no-cache, merged into `t`).
  - Mobile: the same endpoint (`M/src/lib/i18n-overrides.ts:35`), with an AsyncStorage cache `ab.i18n.overrides.<l>`.
- Settings-related i18n prefixes, as leaf counts in ar.json. **Renaming any of these keys orphans the override rows** (docs/25 §2):

| Prefix | Leaves | Used for |
|---|---|---|
| `settings.*` | 74 | title, nav, sections, saveBar, theme, most registry labels (`settings.<camel>`) and hints (`settings.hints.*`), errors |
| `config.*` | 47 | search, reset, dirty, changed, danger, `config.fields.*`, `config.sections.custom`, `config.custom.*` (24), and the labels of academy_contact, recording_*, activity_retention |
| `templates.settings.*` | 83 | 9 registry labels (messaging switches, reminders, follow-up), switch dialogs, queued plurals, `lines.*` (30) |
| `templates.*` (rest) | 116 more | template health, `perNumber.*` (28), names, errors |
| `sales.assign.*` | 13 | `sales_auto_assign` label, hint, chip, buttons |
| `integrations.*` | 105 | groups, keys.*.label/hint, source, secrets, allow-list dialog |
| `googleSync.*` | 150 | Google sub-section and the mobile card (`googleSync.mobile.*`) |
| `notificationCatalogue.*` | 89 | «ماذا يُرسل ومتى» (web and mobile) |
| `mobileAdmin.settings.*` | — | mobile settings screen chrome |
| `theme.*` | 4 | appearance toggle |

---

### 3. Mobile (`apps/mobile`)

#### 3.1 Version and OTA

- `M/app.json`:
  - `version` **0.2.0**
  - `runtimeVersion.policy: "appVersion"`
  - `checkAutomatically: ON_LOAD`, `fallbackToCacheTimeout: 0`
- `M/app.config.ts` only adds `googleServicesFile`.
- `M/eas.json` channels:
  - development
  - preview (APK, internal)
  - production (autoIncrement; `appVersionSource: remote`)
- Effect: every phone on APK 0.2.0 takes OTA JS bundles for runtime "0.2.0" until a new APK changes the version. An OTA bundle compiled earlier keeps calling the endpoints and response shapes below, and those phones may never update. **The endpoints and the shape of `GET /settings` (snake_case keys) must keep working.** The same goes for the camelCase `PATCH /settings` fields (`settingsUpdateSchema` is a non-strict `z.object`, so unknown keys are dropped: `S/settings/schema.ts:43`).

#### 3.2 Screens and routes

| Route | Screen | Gate | Ref |
|---|---|---|---|
| `/more/ops/settings` (`M/app/(tabs)/more/ops/settings.tsx`) | `SettingsScreen` «إعدادات الأكاديمية» | row shown when `settings.read` (`M/src/auth/route-permissions.ts:21`, `M/src/more/AdminOpsSection.tsx:12`) | `M/src/ops/SettingsScreen.tsx:56` |
| Push `google_sync_alert` opens `/more/ops/settings` | the Google card is on that screen | `canOpen(can,'settings')` | `M/src/push/notification-route.ts:29,47,55` |

`SettingsScreen` content, in order (`SettingsScreen.tsx:21-49`):

1. **`SettingsFields`** (`SettingsFields.tsx:117`): the hand-maintained form `settings-form.ts:210-221`. It has **7 settings in 8 controls**:
   - `lateCancelOn` pills «مفعّل/مغلق» + `lateCancelHours`
   - `bookingHorizonWeeks`
   - `followUpHours` (label `mobileAdmin.settings.followUpHours`)
   - `renewalAlertRemaining`
   - `subscriptionExpiryDays`
   - `reportTeacherEditHours`
   - `reportingCurrency` (free text, upper-cased)

   Arabic-Indic digits are accepted (`ascii-digits.ts`).
2. «لديك تغييرات غير محفوظة» note; «حفظ» (disabled until dirty); «تراجع عن التغييرات».
3. **`ReadOnlySettings`** (`ReadOnlySettings.tsx:184`): title «تُدار من الموقع فقط». Rows: messaging_enabled, auto_messages_enabled, crm_cutover_done (مفعّل/مغلق), plus the note «لتغيير هذه الإعدادات استخدم لوحة الإدارة على الويب.».
4. **`GoogleSyncCard`** (`GoogleSyncCard.tsx:46`, `testID="google-sync-card"`): read-only. Shows the chip, email, sync, mode, counts and last error, plus «تُدار المزامنة والربط من لوحة الإدارة على الويب.». Shown only when `settings.read` **and** base admin (`SettingsScreen.tsx:24-26`).
5. **`NotificationCatalogue`** (`NotificationCatalogue.tsx:142`): read-only. Key `['admin','notifications', settingsUpdatedAt]`.

Mobile save semantics (better than the web):
- `settingsUpdate(form, saved)` sends **only changed fields** (`settings-form.ts:273-288`).
- A refetch replaces the form only while nothing is typed (`use-settings-form.ts:323-328`).
- The API's 400 `issues` are mapped back onto fields (`serverErrors`, `:291`).
- The query key is `pathKey('/settings')`. It is not `['settings']`, so the web and mobile caches are separate.

#### 3.3 Every config-related endpoint the mobile app calls

| # | Method + path | Caller | Ref |
|---|---|---|---|
| m1 | `GET /settings` | ops settings screen | `M/src/ops/use-settings.ts:6,375` |
| m2 | `PATCH /settings` (camelCase, changed keys only) | ops settings save | `use-settings.ts:382` |
| m3 | `GET /settings` (reads `follow_up_hours.length`) | inbox lead qualification | `M/src/inbox/qualification/queries.ts:75-76` |
| m4 | `GET /settings` (reads `renewal_alert_remaining`) | payments | `M/src/payments/queries.ts:32-33` |
| m5 | `GET /settings/public` (`PUBLIC_CONFIG_PATH`) | `usePublicConfig` and the other hooks | `M/src/lib/public-config.ts:203-236` |
| m6 | `GET /admin/google/status` | GoogleSyncCard | `M/src/ops/google-status.ts:80` |
| m7 | `GET /admin/notifications` | NotificationCatalogue | `M/src/ops/NotificationCatalogue.tsx:146` |
| m8 | `GET /messages/gate` | inbox GateNote | `M/src/inbox/GateNote.tsx:12` |
| m9 | `GET /i18n/:locale/overrides` | boot translations | `M/src/lib/i18n-overrides.ts:35` |
| (related) | `GET /messaging/templates` | template picker, send rating | `M/src/inbox/TemplatePicker.tsx:18`, `M/src/inbox/rating/SendRating.tsx:18` |

Mobile never calls `/config/meta`, `/config/custom` or `/settings/integrations`. Those are web-only and safe to change if web and e2e move together.

Mobile public-config consumers:
- `sales/SalesTeacherHeader.tsx`
- `booking/use-invoice-upload.ts`
- `booking/MakeupAction.tsx`
- `classroom/AdminSessionsScreen.tsx`
- `classroom/JoinClassroomButton.tsx`
- `account/queries.ts`
- `teacher/TeacherLessonCard.tsx`
- `payments/PhotoButtons.tsx`
- `payments/ReceiptPicker.tsx`
- `live/LiveBadge.tsx`
- `live/LiveSessions.tsx`
- `inbox/send-file.ts`
- `inbox/AttachFile.tsx`

Each reads public setting keys by their snake_case names. The public payload's keys and `custom` must stay as they are.

Mobile tests: `SettingsScreen.test.tsx`, `.en.test.tsx`, `.google.test.tsx`, `GoogleSyncCard.test.tsx`, `NotificationCatalogue.test.tsx`, `settings-form.test.ts`, `catalogue-words.test.ts` (all in `M/src/ops/`).

---

### 4. e2e (`e2e/`)

#### 4.1 UI specs that visit `/admin/settings`, and the selectors they depend on

| Spec | Visit | Selectors / i18n keys relied on |
|---|---|---|
| `E/tests/settings-switches.spec.ts:40,85` | `/admin/settings` | `getByText(templates.settings.off/on/autoOn/autoOff, exact)`, `queued.two`, `gateNotConfigured`. `getByRole('region',{name: notificationCatalogue.title}).locator('[data-key="report_ready"]')` + `blockers.messaging_off`. Buttons `enableTitle` (exact), `disable`, `autoEnable`, `autoDisable`. `getByRole('dialog',{name: enableTitle/disableTitle/autoEnable/autoDisable})` with yes buttons `enableYes/disableYes/autoEnableYes/autoDisableYes` and `common.cancel`. Dialog text includes `queuedGoOut`. |
| `E/tests/settings-academy.spec.ts:31` | `/admin/settings` | `getByLabel(settings.lateCancelHours / renewalAlertRemaining / reportTeacherEditHours / templates.settings.followUpHours, exact)`, the **single** `getByRole('button',{name: common.save, exact})`, `getByRole('status')` toHaveText `settings.saved` (needs exactly one role=status on the page), `getByText(settings.notAscending)`, reload persistence |
| `E/tests/templates.spec.ts:18` | `/admin/settings` | `getByRole('heading',{name: templates.title})`; `getByRole('row').filter({hasText: names[key]})`; buttons `templates.submit`; dialog name `templates.submit` with `submitConfirmYes`; text `submitted`, `needsAttention`; `syncNumber` |
| `E/tests/template-numbers.spec.ts:24` + `E/support/template-numbers.ts:11-16` | `/admin/settings` | `[data-testid="template-line"][data-line=…]`; button `perNumber.syncFor`; text `perNumber.synced`; buttons `moveFor`; dialog `moveTitle` with `getByRole('note')` = `moveProducerWarning`; `moveYes`; `moved`; `submit` / `submitConfirmYes` |
| `E/tests/wa-lines-check.spec.ts:23` | `/admin/settings` | text `lines.title`, `lines.notChecked` (exact); button `lines.check` (exact); `[data-testid="line-row"][data-line=notifications\|chat]`; `[data-tone]` with `subscribed/notSubscribed`; `lines.configured`; region `notificationCatalogue.title` containing the phone |
| `E/tests/google-sync.spec.ts:26` | `/admin/settings#integrations` | heading `googleSync.title`; `getByRole('textbox',{name: connection.redirect})`; buttons `connection.connect`, `drive.discover`, `drive.confirm`, `switches.live`; dialog `confirm.liveTitle` → `confirm.ok`; `waitForURL(/\/admin\/settings/)` after OAuth; `getByRole('list',{name: log.title})`; it also calls `googleApi(PUT /admin/google/settings)` (`E/support/google.ts:42`) |
| `E/support/restricted-templates.ts:47` (`importChatRows`), used by `E/tests/sales-starter.spec.ts:37,78` and `E/tests/teacher-restricted-templates.spec.ts:38` | `/admin/settings` | `syncNumber(admin,'chat')`; `sales-starter` toggles `getByRole('row').filter({hasText:key}).getByRole('checkbox',{name: salesStarterFor})`; text `starterOn/starterOff` |
| `E/tests/responsive.spec.ts:47` | `/admin/settings` in the no-horizontal-scroll list | page width at phone size |

The settings page sets no `data-testid` of its own. The ids that exist are `line-row`, `template-line`, `submit-target` and `google-skeleton`, plus `data-key` (catalogue), `data-line`, `data-tone`, `data-danger` and `data-source`. Everything else is found by role and label, using the **ar.json key names**.

#### 4.2 Helpers and specs that write the stores directly (SQL or API)

| Helper | Store | Ref | Used by |
|---|---|---|---|
| `snapshotSettings` / `restoreSettings` / `settingText` | `public.settings` | `E/support/settings.ts:7-35` | settings-switches, settings-academy |
| `setSetting(key, value)` | `public.settings` upsert | `E/support/messages.ts:55` | guardian-deliveries, teachers-always-available, assistant-course.api, meeting-link-auto, lesson-rating, settings-academy, assistant-auto-assign-off.api |
| `setMessaging(on)` | `messaging_enabled` | `E/support/wa-stub.ts:59` | 18 specs (kapso-driver, sales-starter, inbound-stop, teacher-restricted-templates, wa-two-lines.reply, journey-7, inbound-quick-reply, guardian-deliveries, settings-switches, inbox-send-file, feedback, inbox-template-status, sales-meetings, lesson-rating, journey-1, inbound-new-lead, schedule-stale, inbox-failures) |
| `setSettingTx` | `payout_count_*` in tx | `E/support/pay-rule.ts:56` | pay-rule.sql |
| `setLateCancelHours` | `late_cancel_hours` | `E/support/schedule-extra.ts:32-34` | schedule-cancel |
| `seedSettings` | 11 rows at global setup | `E/support/db.ts:60` | `E/support/global-setup.ts` |
| `resetGoogle` | deletes `google_sync_enabled/mode/window` | `E/support/google.ts:37` | google-sync |
| `autoMessages` | `auto_messages_enabled` | `E/tests/edit-session-time.helpers.ts:58` | edit-session-time |
| `switchNotifications` | `integration_config` WA_PROVIDER, KAPSO_API_BASE | `E/support/kapso.ts:27-38` | kapso-driver |
| direct SQL | `public.settings` google_* | `E/tests/google-sync.sql.spec.ts:22,32` | — |
| direct SQL | `payout_count_late` | `E/tests/teacher-earnings.sql.spec.ts:21` | — |
| direct SQL (RLS checks) | `integration_config` | `E/tests/integration-config.sql.spec.ts:55-64` | — |
| config | `SETTINGS_CACHE_MS: '0'`, `INTEGRATION_REFRESH_MS: ''` | `E/playwright.config.ts:129-132` | all |
| translations | `translation_overrides` key `nav.leads`, `/admin/translations` | `E/tests/translations.spec.ts:8-34` | — |

**e2e file count touching settings:**
- 47 files from the grep: 11 in `support/`, 35 in `tests/` (including the `edit-session-time.helpers.ts` helper), plus `playwright.config.ts`.
- Of these, **8 UI files navigate to `/admin/settings`**: 7 specs plus the `restricted-templates.ts` helper, which brings in sales-starter and teacher-restricted-templates.
- Add `translations.spec.ts` for the overrides.

---

### 5. Design-system pieces available and UX defects

#### 5.1 Pieces to reuse

- **Settings page kit** (`W/components/settings/`):
  - `Section` (id + h2 + `scroll-mt-24`)
  - `SettingRow` (label, hint, error, `extra`, `actions`, `danger`; RTL two-column layout, stacked on phones)
  - `CheckField` (checkbox drawn as a switch)
  - `NumberField` (LTR, `list` mode)
  - `ConfirmSwitchDialog` (cancel default focus, failure shown in the dialog)
  - `DangerFrame`
  - `SettingsSearch` + `settings-search.ts` (`matchesText` normalises Arabic)
  - `setting-text.ts` (`textAt` resolves registry labelKeys)
  - `settings-view.tsx` (context with query and meta)
  - `section-id.ts`
- **Registry form**:
  - `RegistryField` (renders any registry key by type)
  - `ShapeRow` (json)
  - `ResetButton`
  - `RowNotes` (dirty + changed-by)
  - `settings-dirty.ts` (`isDirty`, `isDefault`, `resetPatch`)
  - `settings-form.ts` (generated from the registry)
- **UI** (`W/components/ui/`, shadcn-style; `components.json` exists, Radix only for `label` and `slot`):
  - Dialog
  - Button (variants: secondary, ghost, danger, danger-quiet)
  - Field, Input, Select, TimeZoneSelect
  - SegmentedControl, RadioChips, Tabs
  - StatusChip (tone + glyph)
  - Toast, FormAlert, Skeleton, EmptyState
  - DataTable (`W/components/DataTable`, stacked, client sort and filter)
  - SearchInput, Ltr, NuqtaGlyph, Cartouche, PageHead
  - ThemeToggle, ScrollX, Pager, MoreMenu
  - `use-narrow`, `use-focus-trap`
- **Google**: `GoogleBlock` (titled card), `BlockSkeleton`, `LoadError`. Good patterns for module sub-pages.

#### 5.2 Defects (for the redesign brief)

1. **No optimistic concurrency anywhere.**
   - `PATCH /settings` reads `before`, upserts, reads `after` and audits (`API/common/settings/settings.controller.ts:31-47`; `settings.service.ts:52-58` upserts with `updated_by` only). There is no `updated_at`, `If-Match` or version check.
   - Custom (`custom-config.service.ts:31-33`) and integrations (`integration-config.queries.ts:52-53`) are plain upsert or delete too.
   - Result: last writer wins.
2. **The web form sends every field.** `settingsUpdate` builds the body from all FORM_KEYS (`settings-form.ts:104-110`), so one «حفظ» overwrites all ~34 keys with whatever this tab loaded. That silently reverts another admin's or the phone's change. Mobile sends only changed keys.
3. **The web form never re-syncs.** `useState(() => settingsForm(settings))` (`use-settings-form.ts:32-33`) ignores the refetched `['settings']` (focus refetch is on by default, `W/boot.tsx:13`). The page shows stale values, and 2 makes them win.
4. **Read-only users see writable controls.** The web never checks `settings.write`, `templates.manage` or base-admin for Google. Every control renders for an R-only role and fails on save with the generic `common.error`. Mobile also does not hide the Save button for R-only users (`SettingsScreen.tsx:38-43`).
5. **No unsaved-changes guard.** There is no `beforeunload` or `useBlocker` in the web app. The SaveBar sits at the very bottom of a very long page. «معدَّل» shows per row, but there is no dirty count or "N unsaved" on the bar or the index.
6. **Several save models on one page:**
   - the bar
   - self-saving switches
   - a separate «حفظ التكاملات»
   - per-secret save
   - Google «حفظ النطاق» and self-saves
   - custom «احفظ القيمة»

   A dirty registry field and a switch click can interleave. The switch PATCH returns fresh settings but leaves the form untouched.
7. **Missing confirmations on risky changes:**
   - `crm_cutover_done` in both directions (its warning gates the sending dialog)
   - `recording_retention_days` ON (turns on file deletion)
   - `meeting_link_auto`, `teachers_always_available`, the teacher WhatsApp switches
   - `sales_auto_assign` OFF
   - Google sync OFF, student unmap
   - template starter toggle and per-line Meta sync (imports rows)
   - saving a secret over an existing one
   - custom «عامة» (makes data public)
   - the json `academy_contact` (public)
   - the reset-to-default buttons, which only stage the change
8. **Cache invalidation gaps.**
   - Switches do not invalidate `['config','meta']` (stale «آخر تعديل»).
   - Custom saves and switches never invalidate `['settings','public']`: a public custom value or `meeting_link_auto`/`makeup_window_days` changed this way stays stale for up to 5 min in this tab.
9. **Anchor mismatch.** The external `#integrations` (OAuth callback, `google_sync_alert` web path) does not match the DOM id `settings-integrations`, so the link lands at the top of the page. The template-health h2 sits inside messaging and has no nav entry. On a narrow screen, `SettingsNav` sets `aria-current` only on click, not on scroll.
10. **Search breadth is uneven.** Integration keys, template names, lines and catalogue are searchable. Google sub-section controls are not (IntegrationsPanel hides the Google section only through `integrationsMatch`).
11. **Status regions are fragile.** The e2e relies on exactly one `role=status` (the page toast; `settings-academy.spec.ts:39`). Sub-components avoid `role=status` on purpose (`LinesCard.tsx:43`, `GoogleBlock.tsx:34`). Any new toast or region must keep that.
12. **Mixed control styles.** Custom «عامة» is a plain checkbox, while the rest use CheckField switches. Bespoke switches use a chip plus button rather than CheckField. A secret clear uses `Dialog` with a `danger` button while others use `ConfirmSwitchDialog` (`danger-quiet`).
13. **Custom «أضف قيمة» with an existing key.** `PUT` is an upsert, so adding a key that already exists silently replaces it unless `parseDraft` checks against the list. Worth a check.
14. **Messaging section is overloaded.** It mixes 5 switches, a lines diagnostic, a read-only catalogue (25 rows), 9 fields and a full template table. This is the natural split for the «communications/numbers/notifications/templates/safety» pages (docs/23 §2d). The safety keys (`WA_ALLOWED_RECIPIENTS`, `WA_TEMPLATE_SYNC`) currently live under integrations.

---

### 6. Ten-line summary

1. `/admin/settings` today: 11 index sections plus 2 un-indexed sub-sections (template health, Google), 127 inventory rows in this file.
2. Registry: 39 keys. 34 go through the generic form (37 rows, 2 json fieldsets) and 5 have bespoke self-saving controls. 8 keys are public.
3. Integrations: 32 keys (20 plain, 12 secret, 9 groups). Google: 3 settings rows outside the registry and about 20 controls across 6 cards. Custom-config: 10 controls.
4. Six save models on one page, no `settings.write` gating in the web UI, and no optimistic concurrency in any PATCH or PUT (last write wins).
5. The web form PATCHes all keys and never re-syncs after a refetch, so it can silently revert other admins' or mobile changes. Mobile sends a changed-only diff.
6. Confirmations exist on 9 actions. At least 12 risky actions have none (crm cut-over, recording retention, public custom flag, Google OFF, and others).
7. React Query keys: `['settings']`, `['settings','public']`, `['settings','integrations']`, `['config','meta']`, `['config','custom']`, plus 7 more; i18n prefixes `settings`, `config`, `templates.settings`, `sales.assign`, `integrations`, `googleSync`, `notificationCatalogue` are all keyed by name in `translation_overrides`.
8. Mobile is APK 0.2.0 with runtimeVersion=appVersion OTA. It calls 9 config-related endpoints (`GET`/`PATCH /settings` ×4 call sites, `/settings/public`, `/admin/google/status`, `/admin/notifications`, `/messages/gate`, `/i18n/:l/overrides`), and they must stay stable.
9. e2e: 47 files touch the settings stores (35 in `tests/`, 11 in `support/`, plus `playwright.config.ts`); 8 drive the `/admin/settings` UI by ar.json labels, roles and the `data-testid`s `line-row`/`template-line`.
10. The `#integrations` hash (OAuth callback, google_sync_alert) does not scroll because the DOM id is `settings-integrations`. The redesign must keep that URL working or add a redirect.
