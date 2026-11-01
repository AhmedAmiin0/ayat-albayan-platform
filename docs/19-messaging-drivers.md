# 19 — Messaging drivers: Meta direct, Kapso or the academy CRM, per line

Owner request 2026-10-17: «a notification/messaging engine: one driver using a third party like Kapso, the other using Meta native APIs».

## What it is (and is not)

There is **one** messaging engine: the outbox and its queue, the send gate and kill switch, the `WA_ALLOWED_RECIPIENTS` allow-list, dedupe keys, the template registry and the webhook parser are shared and unchanged (docs/12 §3, §13). What is new is a **driver per WhatsApp line**: the thing that actually talks HTTP to WhatsApp.

| Driver | How it reaches WhatsApp | Credential |
| --- | --- | --- |
| `meta` (default) | Meta's Cloud API directly (`WA_API_BASE`, `WA_API_VERSION`) | the line's System User token (`Authorization: Bearer …`) |
| `kapso` | Kapso's **Meta proxy** (`KAPSO_API_BASE`, `KAPSO_API_VERSION`, default `v24.0`), which mirrors the Cloud API paths and bodies | the Kapso project key (`X-API-Key: …`, never a bearer) |

- **Per line.** `WA_PROVIDER` picks the notifications line's driver, `WA_CHAT_PROVIDER` the chat line's. Both default to `meta`, so nothing changes until an admin switches a line in «التكاملات» (/admin/settings → «مزوّد الإرسال»).
- **The same ids.** A kapso line uses the same `WA_PHONE_NUMBER_ID` / `WA_WABA_ID` (chat: `WA_CHAT_*`) as under meta. It needs no Meta token and no `WA_API_BASE`.
- **No automatic failover.** Switching is manual. A send whose answer was lost (timeout) may already have gone out; retrying it through the other driver could deliver it twice, so the engine never does that.
- **Half-configured = off, loudly.** A line switched to kapso without `KAPSO_API_BASE`, `KAPSO_API_KEY` or its ids refuses every call (its rows stay `queued`, nothing fails). «افحص الخطوط» shows each line's driver and NAMES the missing keys (never values; a meta chat line names `WA_API_BASE` too when it is unset), a chat phone id equal to the notifications one as its own flag (`duplicate_chat_phone`), and for a kapso line a note that inbound arrives via `/webhooks/kapso` instead of Meta's subscribed-app verdict; the API logs the same names once at boot. The send gate requires the notifications line to be configured under its own driver.
- **Mobile:** no integrations screen in the Expo app; the per-line driver switch is on «نظرة عامة» (see «Mobile» in the crm section).

## Where Kapso differs from Meta (all handled in `apps/api/src/modules/messaging/whatsapp/drivers/kapso/kapso.ts`)

| Topic | Meta | Kapso |
| --- | --- | --- |
| Auth header | `Authorization: Bearer <token>` | `X-API-Key: <project key>` |
| Send / mark read | `POST /{phone_number_id}/messages` | same path and body; `messages[0].id` is the wamid |
| Template list paging | follow `paging.cursors.after` while `paging.next` is present | no `paging.next`: follow `after` while it is set **and** the page is full (100); same 20-page cap |
| Create a template | `POST /{waba_id}/message_templates` | same |
| Edit a rejected template | `POST /{template_id}` | `POST /{waba_id}/message_templates?hsm_id=<template_id>` (there is no `/{template_id}`) |
| Outbound media (docs/21 D2) | `POST /{phone_number_id}/messages` with `{ type: 'image' \| 'document', [type]: { link, caption?, filename? } }`, the link a 7-day signed `wa-media/out/…` URL | same path and body (by link, never an upload) |
| Inbound media | `GET /{media_id}` → `url`, downloaded with the bearer | `GET /{media_id}?phone_number_id=<line>` → `download_url` (token inside, ~4 min), downloaded with **no credential at all**; Kapso's `url` (Meta's lookaside) is never used |
| Sample uploads (Resumable Upload API) | `/{app_id}/uploads` with `WA_APP_ID` | none: `canUploadSamples()` is false, so submitting a document-header template (`report_ready`) answers 409 `needs_meta_driver` («حوِّل مزوّد الإرسال إلى Meta مباشرة»), not `needs_app_id` |
| Errors | `{error:{message,type,code,error_subcode}}` | same shape (same `WaError` mapping) |
| A refused credential | Meta code 190 / 10 / 200 only: the line's queue is held 15 min, uncounted (a Meta HTTP 401 without one of those codes is an ordinary error: retried, then failed; inbound media answers 410 `media_expired`) | a 401 / 403 without a Meta code of its own on a request that carried the key is tagged `credential: 'kapso'` (`graph.ts` `byDriver`): the queue is held the same way and the line paused, rows read `error_code = 'kapso_auth'` («رفض Kapso مفتاح المشروع — حدِّث KAPSO_API_KEY في «التكاملات»»), never Meta's Business Manager advice; inbound media and template submit answer 502 `kapso_auth`, and «افحص الخطوط» shows the same words. The credential-free `download_url` is never tagged, so its 401 / 403 is an expired link: 410 `media_expired`. One rule decides (shared `isWaAuthFailure`): Meta's code or the tag, never a bare HTTP status. |

## Webhook

- **`POST /webhooks/kapso`** (public, raw body). Kapso forwards Meta's **raw** payload (webhook kind `meta`), so the existing parser and the phone_number_id line routing apply unchanged.
- Authenticated by **`KAPSO_WEBHOOK_SECRET` only**: `X-Webhook-Signature` = lowercase hex HMAC-SHA256 of the raw body, or `X-Hub-Signature-256` = `sha256=` + that hex. Constant-time compare. No secret set = every POST is 401. A 401 logs (debug level, like the silent Meta route) only which signature header NAMES were present.
- The Meta route `POST /webhooks/whatsapp` keeps verifying only `WA_APP_SECRET` / `WA_CHAT_APP_SECRET`; neither route ever accepts the other's secret.
- Like the Meta route it is never written to the activity log (`SKIPPED_ROUTES`), so refused or high-volume deliveries cannot flood it.
- «افحص الخطوط» on a kapso line says inbound arrives via the Kapso webhook (neutral) instead of comparing the WABA's subscribed apps with a Meta app id; with `KAPSO_WEBHOOK_SECRET` unset it says every Kapso delivery is refused (act). It reports only whether the secret is set, never its value.
- WhatsApp voice calls (docs/28): the same route also reads changes whose field is `calls` (subscribe the webhook to `calls`); they move `wa_calls` rows and never become messages or ticks.
- Answered within 5 s (`RESPONSE_BUDGET_MS`); Kapso times out at 10 s, retries 3 times within ~50 s and pauses a webhook that fails ≥ 85 % of the time, so a webhook item that fails answers 500 for a retry like the Meta route.
- **A webhook gap never loses a message** (incident 2026-10-30: the chat number's Kapso webhook vanished at ~08:49 UTC and no family message arrived until it was recreated). Two read-only catch-up jobs list Kapso's message history every 10 minutes for each enabled Kapso chat number: `external-catch-up` (outbound: staff replies from Kapso's inbox) and `inbound-catch-up` (`webhook/external/inbound/`: the families' messages). The inbound one reads `direction=inbound` since the newest inbound row of the number (always the last 24 h, never more than 7 days; the first run after a deploy reads the whole 7 days), at most 20 pages of 100, and hands every wamid we do not hold to `InboundService.handle`, the webhook's own path (row, line and number, lead or guardian, auto-assign, quick reply, media id, reaction, unread, thread summary). Idempotent by wamid (unique `wa_message_id`): a webhook delivery racing it stores one row. A Kapso error stops that number's run only.
- **Back-filled messages do not push.** A message more than 15 minutes old when the catch-up stores it (`LATE_MS`) is stored and counted unread (badges, thread summary) but fires no new-message / new-lead push; a fresh one pushes like a webhook message. One that staff already answered from Kapso's inbox is stamped read (as an outbound echo does). Late messages mean the webhook is not delivering: the admins get ONE alert per chat number per UTC day (bell + push, kind `new_message`, «لا تصل رسائل العائلات من Kapso مباشرة»: check the webhook in Kapso). The logs carry counts and the number id's last 4 characters only.
- **Edits, deletes, reactions and other non-messages (owner 2026-10-30, migration `20261030000992`).** The WhatsApp Business app's actions reach us as echoes (`smb_message_echoes`) and history items, and families edit and delete too. One mapper (`echoPayload` / `chatMarkerOf`, `packages/shared/src/messaging/markers/`) serves the webhook echo, both catch-ups and the inbound path. An `edit`, `revoke` or `reaction` is a hidden marker row (`interactive_payload = {type, marker: true, target, text | reaction}`, idempotent by wamid, never a bubble, never unread, never the chats-list preview). The database applies it to the message it names on the same phone (`message_markers_apply`, an insert trigger): now, or when that message arrives (up to 7 days later). An edit replaces the text (`edited_at`, «تم التعديل»; the newest edit wins whatever the arrival order). A revoke sets `deleted_at` (the row and body stay for audit; the API withholds text, file and payload: «تم حذف هذه الرسالة»). A reaction sets `our_reaction` (echo) or `their_reaction` (family). Files from the app keep their file (no «[image]» caption; the mime falls back to Kapso's `media_data` or WhatsApp's default). Kapso's `errors` item (the click-to-WhatsApp ad's automatic welcome, origin `history_sync`) shows the ad's own welcome text when the item carries `referral.welcome_message.text`, else «رسالة الترحيب من الإعلان». An outbound `unsupported` shows «رسالة غير مدعومة». Rows stored before this: `tools/scripts/chat-markers/chat-markers-backfill.mjs` (export → `--dry-run` → reviewed SQL; the operator runs it).

## Free text after the 24 h window (owner 2026-10-31)

Owner: «try to send a request to the chat on message if last conversation was older than 24 hour», then «dont use templates just reopen the conversation with kapso on submit if the last message was older 24h».

- **Kapso chat line only.** When no window is open and the chat line runs on kapso (legacy `WA_CHAT_PROVIDER`, or the default chat number in module mode), `POST /threads/:phone/text` no longer answers 409: `textLine` (`inbox/send/text-line.ts`) queues the text from the chat line (module mode stamps its default number). meta and crm chat lines, and a number that never wrote (no thread), keep the 409 `session_closed`. Only a staff member's own text is tried: forwards (text or file: the picker skips a closed chat, `forwardedFrom`), teacher mode (`scope`), file sends and reactions keep `sendLine` and its 409, with no Kapso call.
- **Kapso's record first.** Before the enqueue, `KapsoReopener` (the same one as «إعادة فتح المحادثة») lists the phone's Kapso conversations on that phone_number_id (`GET /platform/v1/whatsapp/conversations?phone_number=…&phone_number_id=…`, `X-API-Key`), takes the newest and PATCHes `{ whatsapp_conversation: { status: 'active' } }` only when that newest one is `ended` (already active: no PATCH, so a second reopen never wakes an older thread). Bounded to 5 s and never thrown: a failure is logged with the phone's last 4 digits only, and the text is still queued.
- **Meta's rule still applies.** The PATCH changes Kapso's own inbox record only; it does not open WhatsApp's 24 h window. WhatsApp decides: a refused text fails at once with 131047 («مضى أكثر من 24 ساعة على آخر رسالة منه»), which is final (no retry, no «حاول مرة أخرى»). The row shows its failed text only: no template action under it (web bubble, mobile FailedSheet).
- **The gates are unchanged:** `messaging_enabled`, `WA_ALLOWED_RECIPIENTS`, the rate limits and the dedup key (`admin:<phone>:<request id>` / `sales:<id>:<phone>:<request id>`).
- **Composers.** `ThreadView.try_after_window` (true while the chat line is on kapso) lets staff (admin and sales; never teacher mode) type after the window, text only (no files, voice or saved replies), under the note «آخر رسالة منذ أكثر من 24 ساعة: سنعيد فتح المحادثة عند الإرسال» (`inbox.tryAfterWindow`). No template nudge: the note names no template, the web template toggle is not highlighted and the mobile pill's template icon is plain (`quietTemplate`).

## Keys

| Key | Kind | Group in «التكاملات» |
| --- | --- | --- |
| `WA_PROVIDER` | plain, `meta` \| `kapso` (select), default `meta` | خط إشعارات واتساب |
| `WA_CHAT_PROVIDER` | plain, `meta` \| `kapso` (select), default `meta` | خط محادثات واتساب |
| `KAPSO_API_BASE` | plain URL, **no default** (`https://api.kapso.ai/meta/whatsapp` in production; never hardcoded in the API) | Kapso |
| `KAPSO_API_VERSION` | plain, default `v24.0` | Kapso |
| `KAPSO_API_KEY` | secret (Vault) | Kapso |
| `KAPSO_WEBHOOK_SECRET` | secret (Vault) | Kapso |

Migration `20261017000450_kapso_secret_keys.sql` adds the two secrets to `integration_secret_key_ok` (the full list from migration 380 plus these two). Ship it with the `deploy-staging` `migrate` input ticked; it is expand-only.

## Going live on Kapso (owner steps)

1. In Kapso: create (or open) the project that holds the academy's number, and copy its **project API key**.
2. In «التكاملات» → Kapso: `KAPSO_API_BASE` = `https://api.kapso.ai/meta/whatsapp`, keep `KAPSO_API_VERSION` = `v24.0`, save the **API key** as a secret.
3. In Kapso: create a webhook of kind **`meta`** pointing at `<API origin>/webhooks/kapso` (staging: `https://api.ayatalbayan.com/webhooks/kapso`); copy its signing secret into «التكاملات» → `KAPSO_WEBHOOK_SECRET`.
4. Switch «مزوّد الإرسال» of the line to **Kapso**, save, then press «افحص الخطوط»: the line must show «Kapso» with nothing missing.
5. Send one test reply to a number in `WA_ALLOWED_RECIPIENTS` before removing the guard.
6. To go back: switch the line to «Meta مباشرة». Nothing else changes.

**Kapso sandbox limits:** no templates (only session messages inside the 24 h window) and one registered recipient. Use it only with `WA_ALLOWED_RECIPIENTS` set to that recipient.

## Local and e2e

`tools/wa-stub` serves the same Graph routes under `/kapso/{version}/…`: it requires `X-API-Key` and refuses any bearer, records the credential kind of every request (`GET /__stub/requests`), requires `phone_number_id` on `GET /{media_id}` and answers a `download_url` that only works without credentials, edits templates via `?hsm_id=`, and `POST /__stub/kapso/inbound` forwards a Kapso-signed raw Meta inbound to `/webhooks/kapso`. `e2e/tests/messaging/kapso-driver.spec.ts` switches the notifications line to kapso in the database, checks an inbound and a reply end to end and a bad signature, and always switches back to meta.

## crm driver (owner 2026-10-25: «add one driver for the crm», «deal with the crm as api»)

A third driver, `crm`: a line sends through the academy's self-hosted WA CRM (open-source wacrm, deployed at
commit `98b5bd2`) via its **public REST API**, not a Meta proxy. Meant for the notifications line (its Meta
token is dead; the CRM already holds a working connection to the academy's main number and the approved
booking / reminder templates). Either line may select it; both on crm = one CRM account twice, so the chat
line stays off (`duplicate_chat_phone`, boot log `WA_CHAT_PROVIDER (crm, same as WA_PROVIDER)`). Default stays `meta`.

| Topic | crm |
| --- | --- |
| Base / auth | `WACRM_API_BASE` (`https://<crm-host>/api/v1`, no default) · `Authorization: Bearer <WACRM_API_KEY>` (account-scoped key, scope `messages:send`) |
| Ids | none of ours: `CrmLineEnv {provider:'crm', base, apiKey}`. Line facts, the lines check and parity show null phone / WABA / app ids; `WA_PHONE_NUMBER_ID` (if set) and `WA_APP_SECRET` stay on the Meta webhook route, so whatever Meta still delivers for that number is stored, never dropped |
| Template send | `POST /messages {to:"+E164", type:"template", template:{name: crmTemplateName, language: crmTemplateLanguage, params:{body[], headerMediaUrl?, buttonParams?}}}` built by `crm-body.ts` from the SAME values the meta driver sends (`wa-components.ts` `bodyValues` / `documentHeader` / `buttonValues`): body {{n}}, a document header as the 7-day signed Storage URL, URL-button suffixes and quick-reply payloads by button index. The CRM resolves the template from **its own synced list** by name + language. The name is the template's `crm_name` (admin, «القوالب»), else the old script's name (`CRM_DEFAULT_NAMES`), else `meta_name`; the language `crm_language`, else `language` («Mapping to the old script» below) |
| Text / files | `type:"text"` (reply-to dropped: the CRM wants its own uuid) · `type:"document"\|"image"` with `media_url`, `filename`, caption as `text` |
| wamid | `data.whatsapp_message_id` (a 2xx without it = `uncertain`) |
| markRead | no-op (the CRM owns the conversation) |
| Template list / submit / samples / inbound media | `WaError {unsupported:'crm'}`: the sync answers `crm_managed` (no call, **no row touched**: nothing is marked missing or not_submitted; the one exception is a send Meta refuses with #132001, «تحقق من القالب» below), submit is 409 `crm_managed`, a number's sync `crm_managed`, inbound media 409 `crm_no_media`; `canUploadSamples()` false |
| 401 / 403, 400 `whatsapp_not_configured` | `credential: 'crm'` (the key, or the CRM's own WhatsApp connection, is down: the line, not the message): the queue is held 15 min, uncounted, line paused, one push a day; rows read `crm_auth` («رفض نظام CRM مفتاح الواجهة…») |
| 429 | queued until `Retry-After` (default 1 min, max 1 h), uncounted, `crm_rate_limited` (120 req/min per key); the line pauses for the rest of the pass, **no** «token refused» push |
| 502 `meta_error`, 500 `template_malformed`, any other 4xx, a 3xx | failed at once with `crm_<code>` and the CRM's message (nothing was sent). Redirects are never followed (`redirect: 'manual'`); a body that is not the CRM's envelope is kept as `http_<status>` only |
| 500 `internal`, other 5xx, a timeout, a connection lost after the request left | `uncertain` (the CRM may have reached Meta before failing its own insert). **No idempotency key: never resent automatically** |

The `WA_ALLOWED_RECIPIENTS` allow-list and `messaging_enabled` gate are unchanged and run before any client.
One factory (`client-factory.ts` `whatsappClient`) builds every line's and number's client. Module mode: a
`wa_numbers` row with `provider = 'crm'` (migration 640 widens the check) sends with `WACRM_API_BASE` /
`WACRM_API_KEY`, like a kapso number with Kapso's project key; its `phone_number_id` only names it. A crm
number's template approval is `message_templates.status` (the hand-set one): routing ignores any
`message_template_numbers` row it kept from its meta days, and a meta number's sync never writes to a crm
number on the same `waba_id`.

**Template status on a crm line.** The queue gate (teacher-alert.plan.ts, confirmations) and the send gate
(sender.queries.ts) read `message_templates.status` from our db, and a crm line is never synced. So on
«القوالب» a template whose line is on crm shows «يدويًا» beside its chip (missing reads «غير متاح في نظام CRM»)
and two buttons: «علِّمه معتمدًا في نظام CRM» (`approved`, after a second «تأكيد الاعتماد»: messages go out with
it at once) / «علِّمه غير متاح» (`missing`) → `PUT /messaging/templates/:key/crm-status`
(templates.manage, audited `template_crm_status_set`; 409 `not_crm_line` on any other line). No sync
overwrites it while the line stays on crm. Moving a template to a crm line resets it to not_submitted as
any move does; set it by hand afterwards. **Switching a line to crm keeps every status from the last Meta
sync**: an `approved` row starts going to the CRM as soon as `WA_PROVIDER` is saved (the
`WA_ALLOWED_RECIPIENTS` guard covers steps 4–6 below), so review every row of that line (step 5).

**«تحقق من القالب» (owner 2026-10-31).** Hand-set statuses go stale: a teacher reminder failed with Meta #132001
while our row said approved. The CRM does not gate sends on its own template list (wacrm's `resolveTemplateRow`
sends even without a local row), so #132001 means the WABA the CRM sends from lacks that name + language. When a
crm send fails with the CRM's `502 meta_error` carrying #132001 («Template name does not exist in the
translation»), `templates/check/template-missing.ts` (called by the worker after it records the failure) sets that
row `missing`: compare-and-set from `approved`, only while the row's line is the line it went from, the CRM's words
in `last_error`, audited `template_marked_missing` (actor null), never thrown into the worker. Only when the name
the CRM was asked for (`WaError.info.template`, set by the crm client) is the key's own `crmTemplateName`: a row
that went by a fallback (`crmRowName`: a `_meet` reminder or a new-student alert without its `crm` values, by
`meta_name`) fails alone and the key stays approved, or every later row of it would stop. The sender stops
reading its rows (`due()` reads approved templates only). «القوالب» lists the number's missing templates under
«تحقق من القالب» in the crm number's block, with how to fix one; once the CRM holds it, «علِّمه معتمدًا» again.
Meta and Kapso lines are not touched by this: their sync reads the WABA's own list.

**Creating a template («قالب جديد», owner 2026-10-31).** `POST /messaging/templates` (templates.manage +
`TemplateManagerGuard`; 400 on a bad body, 409 `invalid_template` / `template_exists`; audited `template_created`;
no Meta call): key = the Meta name (`[a-z0-9_]`), line, category utility / marketing, language, an optional fixed
text header (kept in `display.header`, sent by the submit as a TEXT header) and footer, the body with {{1}}…{{9}},
each variable's name (one the composers label and prefill, or `var_n`) and its review sample (`samples`, migration
`20261031000994_template_samples.sql`, expand-only), up to three buttons (one URL with an optional `{{1}}` suffix;
quick replies that confirm / ask to reschedule / stop). The row is `not_submitted`. On a meta / kapso line the web
opens the existing «إرسال إلى ميتا» confirm next: the same submit, then the same line sync. On a crm line it stays
`not_submitted` here: create it in the CRM (Settings → Templates → New template, then sync from Meta) with the same
name, language, text and buttons, then «علِّمه معتمدًا». Not built: editing or deleting a row, authentication
templates, a variable in the header, a media header on a new row, admin template screens on mobile.

**What the CRM would need for real create / sync from here.** wacrm's public API (pinned 98b5bd26, and main at
c81299d1 on 2026-10-30) has no templates resource and no `templates:*` scope (`src/lib/api-keys/scopes.ts`), and its
outbound webhooks carry no template event. Its dashboard does it all through session-cookie routes for a CRM admin:
`POST /api/whatsapp/templates/submit` (creates on Meta with the CRM's token), `POST /api/whatsapp/templates/sync`
(pulls from Meta, upserts by name + language), `PATCH` / `DELETE /api/whatsapp/templates/{id}`; the list is a direct
read of its `message_templates` table. Calling those from our API would need a CRM admin's password and Supabase
cookies: not done. The clean path is a wacrm change (upstream PR, then a pin bump, or a local patch; the owner's
go): scopes `templates:read` / `templates:write`, `GET /api/v1/templates` (the account's rows, paged), `POST
/api/v1/templates` (the submit route's core), `POST /api/v1/templates/sync`, `DELETE /api/v1/templates/{id}`, the
key's minter (`createdBy`) as the row's `user_id` (409 when there is none), then a key minted with those scopes.
`crm.client.ts` `getTemplates` / `submitTemplate` would then map onto it and the crm line would sync like the others.

**Webhook `POST /webhooks/wacrm`** (public, raw body, never in the activity log). `X-Wacrm-Signature:
t=<unix>,v1=<hex>` with v1 = HMAC-SHA256(`WACRM_WEBHOOK_SECRET`, `${t}.${rawBody}`), constant-time; `t` more
than 5 minutes from now = 401 (replay); unset secret = every POST 401. Deduped on the payload `id` (in memory
per instance, 10 min; a duplicate elsewhere is harmless, statuses only move forward; a failed write answers
500 and forgets the id). `message.status_updated` → the existing delivery-status path by `wa_message_id`
(ticks; the CRM's conversation id is not stored). `message.received` / `conversation.created` → logged, 200.
Never sends anything.

**Lines check.** A crm line makes one call, `GET /me`: ok, key refused (`errors[0].credential = 'crm'`), or
`crm_send_scope: false` (no `messages:send`); plus `crm_webhook_secret` (set or not, never the value). Never
a test message.

**Mapping to the old script** (owner 2026-10-25: «add a similar integration»). The CRM holds the templates
of the academy's old Google Apps Script («نظام تسجيل الطلاب», CRM.gs), which sent through the same
`/api/v1/messages`. Per template, `message_templates.crm_name` / `crm_language` (migration
`20261025000680_template_crm_name.sql`, expand-only) are what the crm driver sends **instead of** `meta_name` /
`language`, read only while the template's line is on crm (the meta and kapso drivers never read them). Set on
«القوالب» for a crm line's row: «عدّل اسمه في نظام CRM» → name / language (blank = the default) →
`PUT /messaging/templates/:key/crm-name` (templates.manage, audited `template_crm_name_set`, 409 `not_crm_line`
when setting a name on any other line; clearing both back to the default works on any line; Meta's name rules
checked in the form and by the API). A crm_name equal to `meta_name` (the CRM's copy of the Meta template) sends the
Meta values, never the producer's CRM values.

| Ours (`key`) | The CRM's template | Values |
|---|---|---|
| `booking_confirmation` / `_meet` / `_plain`, `lesson_reminder` (`lesson_reminder_v2` on Meta) / `_meet` / `_plain` | same names (no change) | the meta driver's values |
| `teacher_new_student` | `teacher_lesson_v2` (default, no crm_name needed) | body [teacher, students, their codes `AB-nnnn`, the first lesson's time in the teacher's tz, its duration «45 دقيقة»]; URL buttons by index: 0 «ادخل الحلقة» = `classroom/<lesson id>`, 1 «تقرير الحلقة» = `teacher/report/<lesson id>` (**wrong on the real template**, see below) |
| `teacher_lesson_reminder` / `_meet` (the same-day reminder, since 2026-10-31: the CRM's account has no `teacher_lesson_reminder_meet`, Meta #132001) | `teacher_lesson_reminder` (default, the old script's own teacher template, no buttons) | body [teacher, one line: «<the lesson's time in the teacher's tz> · سهيلة (AB-0101) ومريم (AB-0102) · رابط الحلقة: <join> · تقرير الحلقة: <report>»]; no buttons |
| `report_ready` | `report_ready` (default) **or**, once `crm_name` = `report_session`, the old script's flow | the PDF as a `type:"document"` message (7-day signed URL), then `report_trial_session` (the lesson's rule is a trial package) or `report_session` (any other), **no variables** |

The teacher alert's CRM values are built by `teacherLessonCrm`, the teacher reminder's by `teacherReminderCrm`
(both `reminders/plan/teacher-lesson.crm.ts`; the reminder read adds `students.code`), into `template_params.crm`
beside the Meta values (the alert's {{1}}–{{3}}, the reminder's {{1}}–{{2}} and Meet code; the Meta path is
unchanged). The reminder's line is one line for Meta (no newline, no tab, never 4 spaces in a row); its texts are
`templates.teacherReminderCrm` / `teacherReminderCrmStudent` in ar.json; `<join>` is the lesson's own link as the
reminders send it (Meet, the teacher's fixed link, our classroom when LiveKit runs it), else our classroom, and
`<report>` the teacher's report form, both absolute (`<WEB_ORIGIN>/classroom/<id>`, `<WEB_ORIGIN>/teacher/report/<id>`,
login required); an empty `buttons` sends no `buttonParams` (not even the Meet code). The old script's default
name carries the CRM values even when it equals `meta_name` (`teacher_lesson_reminder`). A row without its `crm`
part (queued before this change, or a value missing: no teacher name, a student without a name or code, no web
origin, the alert's end time) goes as before, `meta_name` with the Meta values (`crmRowName`): a `_meet` row then
asks for `teacher_lesson_reminder_meet` and fails with #132001 again; an admin's crm_name is always sent as set.

**teacher_lesson_v2's real buttons (read from the old script, 2026-10-31).** «ادخل الحلقة» is
`https://meet.google.com/{{1}}` and «تقرير الحلقة» is `https://vercelayat-r.vercel.app/r/{{1}}`, a redirector to the
**old Google report form** (`/r/<a>/<b>/<c>` → the form, prefilled). They are not `<WEB_ORIGIN>/{{1}}` (an earlier
note here said so, never verified). So `teacher_new_student`'s two suffixes on a crm line open a broken Meet URL
(`meet.google.com/classroom/<id>`) and the old form: **owner decision pending** (send a Meet code and the old form's
values, a new CRM template with platform buttons, or a crm_name to a template without buttons); not changed yet.

The report kind is `template_params.crm.report` (`report-ready.ts`, from `schedule_rules.package`). The report flow is two calls
from one row: the document first (a failure there fails the row as today, nothing sent); if the template call
fails after the PDF went, the row fails as **`uncertain`**, never resent automatically, so the PDF never goes
twice on its own. Its text says which: «the CRM refused its template» (a CRM code; the code and a refused key's
credential flag are kept) or «its CRM template may have gone too: check the CRM before a retry» (timeout, 5xx,
a 2xx without wamid). **A manual retry (M1) sends both again**, the PDF included: the row does not record that
the document went (follow-up: keep the document's wamid on the row and skip it on a retry); the row's wamid (ticks) is the template's.
Dedup stays `report_ready:{report id}`: one row per report, whatever its version.

**Not known: the variables of `report_session` / `report_trial_session`.** The old script's exact values are not
in this repo, so the platform does not guess: report_ready keeps its own path by default, and the flow above
sends the two templates **without variables**. Owner: switch it on (`crm_name` = `report_session` on
report_ready) only after checking in the CRM that both templates have no variables (and no buttons); if they
do, keep report_ready (the CRM must then hold an approved `report_ready` with a document header) and tell us
their variables to map them.

**Limits.** No template sync or submit from here (submit and approve in the CRM, which syncs from Meta);
the CRM must hold **the same template names and languages** as our registry (`meta_name`, `language`, or the row's
`crm_name` / `crm_language` / the old script's default), and
**the same buttons in the same order** (`buttonParams` is keyed by the button's index); no
inbound media; no idempotency (an uncertain send is the admin's call); a document header or the report PDF goes
as a link and the CRM shows its own file name, not ours (`AB-nnnn_<date>_تقرير-الحلقة.pdf` is lost); best-effort webhooks (a missed tick stays «sent»). Follow-up: mirror the CRM's
`message.received` into our inbox (the CRM owns that number's conversations today).

### Switching the notifications line to the CRM (owner steps)

1. In the CRM: Settings → API keys → New key with scope **`messages:send`**; copy it (shown once).
2. «التواصل» ← «الحماية» → «نظام CRM»: `WACRM_API_BASE` = `https://<crm-host>/api/v1`, save the key as `WACRM_API_KEY`.
3. In the CRM: add a webhook to `<API origin>/webhooks/wacrm` for event `message.status_updated`; paste its secret as `WACRM_WEBHOOK_SECRET`.
4. Set `WA_PROVIDER` = «نظام CRM» (web «التكاملات», or on the phone «التواصل» → «نظرة عامة» → «مزوّد الإرسال لكل خط»: pick «نظام CRM», check the missing keys it names, confirm «سيُرسل هذا الخط عبر نظام CRM»; same audited save), save, press «افحص الخطوط»: the line must show «نظام CRM», nothing missing, «مفتاح واجهة نظام CRM صالح ويملك صلاحية الإرسال».
5. On «القوالب», review **every** notifications template (statuses carry over from the last Meta sync): mark each one the CRM holds (same name, language and button order) approved with «علِّمه معتمدًا في نظام CRM» → «تأكيد الاعتماد», and each one it lacks «علِّمه غير متاح».
6. On «القوالب», review the **CRM names** (the line under each crm row's buttons, «في نظام CRM: …»): teacher_new_student must read `teacher_lesson_v2` (its buttons: see «teacher_lesson_v2's real buttons»), teacher_lesson_reminder and teacher_lesson_reminder_meet `teacher_lesson_reminder`; correct any name or language the CRM spells differently with «عدّل اسمه في نظام CRM». For the old script's report flow set report_ready to `report_session` only after the check in «Not known» above.
7. Send one test to a number in `WA_ALLOWED_RECIPIENTS` before removing the guard.
8. **Rollback:** set `WA_PROVIDER` back to «Meta مباشرة» (or Kapso). Nothing else changes; the hand-set statuses are re-synced by the next Meta sync **that reads the list** (a failed read touches no row: with a dead Meta token, re-check «القوالب» by hand).

`tools/wa-stub` serves a minimal CRM under `/crm/api/v1` (`GET /me`, `POST /messages`, Bearer, `{data}` /
`{error}` envelope; `crm.apiKey` / `crm.scopes` options) for api tests and e2e. Keys: `WACRM_API_BASE` plain
URL (group `wacrm`), `WACRM_API_KEY` / `WACRM_WEBHOOK_SECRET` Vault secrets (migration
`20261025000640_wacrm_driver.sql`, expand-only; ship with the `migrate` input ticked). The CRM names: migration
`20261025000680_template_crm_name.sql` (two nullable columns, expand-only, idempotent; ship with `migrate` ticked).

**Mobile.** «التواصل» → «نظرة عامة» shows «مزوّد الإرسال لكل خط»: each line's driver (Meta مباشرة / Kapso /
نظام CRM) as radio pills. A pick never saves alone: it lists the key NAMES that driver still lacks
(`driverKeys` in packages/shared, an approximation of the API's `lineGaps`; «افحص الخطوط» on the web stays the
final word) and asks «سيُرسل هذا الخط عبر …» first; the confirm sends `PUT /settings/integrations` with that
line's key only (settings.write, audited like the web); one save at a time. Without settings.write it is shown,
not offered; the keys themselves are still entered on the web (CRM and Kapso keys on «الحماية», the line ids
and tokens on «الأرقام» → «إعداد الخطوط السابق»). In module mode (`comms_source` = module) each number's own
provider sends and `WA_PROVIDER` is not read, so the section shows only a note pointing to «الأرقام». JS-only.

### Script relay: the old Apps Script sends through the platform (owner 2026-11-01)

Owner: «i want it to send to platform and platform send to crm with crm engine», «no need to enter new key, old
key is valid». The old Google Apps Script (not in this repo) sends its WhatsApp reminders, confirmations and
reports by calling the CRM's public API at Script Property `CRM_URL` + `/api/v1/…`. The API exposes the same two
routes, so the script reaches the CRM **through** the platform (`modules/messaging/whatsapp/relay/`):

- `GET /script-relay/api/v1/me` → `200 {data:{account:{name}, key:{scopes:['messages:send']}}}`.
- `POST /script-relay/api/v1/messages`, the script's body as it sends it today (`type` template / text /
  document; unknown keys stripped, `to` → E.164) → `201 {data:{message_id, whatsapp_message_id}}`.

**Auth = the script's own CRM key.** Public like `/webhooks/*` (no user JWT). The CRM holds two keys on one
account (11-01: «Apps Script - Booking messages», the script's, and «apis», the platform's `WACRM_API_KEY`), so
the `Authorization: Bearer` is accepted when it is the notifications line's own key (constant time, no call) or
when the CRM itself answers `GET /me` for it with the same `account.id` as the line's key and the
`messages:send` scope (`relay.keys.ts`; an accepted key is remembered as its sha256 for 10 minutes). The send
always goes with the line's key. No new key or secret. Wrong or missing key → 401; the CRM unreachable during
the check → 502; notifications line not on the crm driver → 503; invalid body → 422; failures use the CRM's
envelope `{error:{message, code}}`.

**What happens.** One `messages` row (outbound, line notifications, the module-mode number stamped, no lead,
guardian or staff, `created_by` null) is written first, with a readable body (template: `[name]` + its body
values; document: caption, file name, link), so it shows in the family's or teacher's chat with its ticks (the
`/webhooks/wacrm` status path matches its wamid). Then the body goes, unchanged in shape and with the CRM's own
template name (no translation through our templates table), through the notifications line's crm driver
(`CrmWhatsappClient.sendBody`: same allow-list, same call). Not gated by «الرسائل التلقائية»: the script decides.
Idempotent (rule 8): `dedup_key` = `script-relay:` + sha256 of recipient, type, content and the 15-minute window,
so the script's retries (it retries 429 / 5xx with no key) send once. A CRM 4xx refusal answers the same 4xx (the
row is removed, nothing was sent, so a retry is a fresh send); a CRM 5xx or network error answers 502 and the
row is kept as «uncertain» (a retry in the window gets the first row back, unsent); a 2xx without a wamid is
201 and the row is «sent».

**Cut-over (owner step).** In the Apps Script project → Project Settings → Script Properties, change `CRM_URL`
only, to `<API origin>/script-relay` (production: `https://api.ayatalbayan.com/script-relay`, no trailing
slash needed). `CRM_API_KEY` stays as it is (any key of the CRM account with `messages:send`). The notifications
line must be on «نظام CRM». **Rollback:** set `CRM_URL` back to the CRM's own URL (`https://crm.ayatalbayan.com`).

### Files imported from the old CRM: our own copy of all of them (owner 2026-10-27 «Fix it»)

A family's photo or voice note imported from the old CRM is an inbound row with no Meta media id whose body is
only a public link to the CRM's own storage (`…/storage/v1/object/public/chat-media/…`). Anyone with that link can
open the file. The chat fetches one of these files once, when an admin first opens it, from the host in
`crm_media_host` («القيم» → «مضيف ملفات CRM القديم»; empty = such files are not fetched; the value is never in the
repo), and keeps it in the private `wa-media` bucket (`messages/crm-history/`).

**Copy all of them now** (`messages/crm-copy/`, `CrmMediaCopyJob`): while the switch `crm_media_copy_all`
(«القيم» → «نسخ كل ملفات CRM القديم الآن», default off) is on **and** `crm_media_host` is a host name, the API
copies, once a minute, a batch of 20 such rows (two at a time) through the same path an admin's open uses (same
host check, no redirect, 10 s timeout, size cap, one object per message, `media_path` set only where empty). A file
that fails three times is left as is and counted as failed; a row that cannot be ours (a body that is more than the
link, a file over the cap) is skipped. Only a real storage answer about the file (400, 404, …) counts as a failure:
when the CRM's storage does not answer (no connection, the timeout, 5xx, 429: `crm_unreachable`) no attempt is
counted, the tick stops with a warning in the API log and the next minute tries again. Turning the switch on again
re-arms every failed row (migration `20261028000920_crm_media_copy_retry.sql` deletes its non-skipped failure
rows); skipped rows stay skipped. When no row is left the switch turns itself off and one audit row
(`crm_media_copy_done`, `{copied, failed, skipped, remaining}`) is written. `remaining` counts the rows the batch would pick on
**any** host (a crm number, the body only one chat-media link) still without a copy and never tried: a link on
another host than `crm_media_host` is never picked by the batch. Only a whole round the storage did not answer is
an outage; a file that never answers while others do counts its attempts like any failure, and a row still
unanswered after 30 outage rounds (about half an hour) counts one attempt, so the last file that never answers
cannot keep the run from ending. Message bodies are never changed and nothing is
deleted. Failed or skipped rows are listed in `crm_media_copy_failures` (migration
`20261028000891_crm_media_copy.sql`). The 30-day purge of cached voice notes and videos (`WaMediaRetentionJob`)
skips these copies: only rows with Meta's media id are purged, because once the CRM's storage is private our copy
is the only one.

**Owner steps.** 1) Set `crm_media_host` (only the host, no `https://`, no path). 2) Turn on «نسخ كل ملفات CRM القديم
الآن». 3) Wait for it to turn itself off (a few hundred files take well under an hour), then read the
`crm_media_copy_done` audit row. Go on only when `remaining` = 0 **and** `copied` > 0, with `failed` and `skipped`
0 or explained: `remaining` > 0 means links on another host (fix `crm_media_host` and turn the switch on again);
`copied` = 0 means nothing was copied (a wrong host). `failed` > 0 after an outage: turn the switch on again to
retry those rows. 4) **Only once the old CRM no
longer needs to show its chat history**, in the old CRM's Supabase dashboard: Storage → `chat-media` → make the
bucket private. We never change the old CRM or its storage settings: it is live and uses those links.
