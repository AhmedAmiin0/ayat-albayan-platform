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
- **Mobile:** there is no integrations screen in the Expo app; nothing changes there.

## Where Kapso differs from Meta (all handled in `apps/api/src/modules/whatsapp/kapso.ts`)

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
- Answered within 5 s (`RESPONSE_BUDGET_MS`); Kapso times out at 10 s, retries 3 times within ~50 s and pauses a webhook that fails ≥ 85 % of the time, so a webhook item that fails answers 500 for a retry like the Meta route.

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

`tools/wa-stub` serves the same Graph routes under `/kapso/{version}/…`: it requires `X-API-Key` and refuses any bearer, records the credential kind of every request (`GET /__stub/requests`), requires `phone_number_id` on `GET /{media_id}` and answers a `download_url` that only works without credentials, edits templates via `?hsm_id=`, and `POST /__stub/kapso/inbound` forwards a Kapso-signed raw Meta inbound to `/webhooks/kapso`. `e2e/tests/kapso-driver.spec.ts` switches the notifications line to kapso in the database, checks an inbound and a reply end to end and a bad signature, and always switches back to meta.

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
| Template send | `POST /messages {to:"+E164", type:"template", template:{name: meta_name, language, params:{body[], headerMediaUrl?, buttonParams?}}}` built by `crm-body.ts` from the SAME values the meta driver sends (`wa-components.ts` `bodyValues` / `documentHeader` / `buttonValues`): body {{n}}, a document header as the 7-day signed Storage URL, URL-button suffixes and quick-reply payloads by button index. The CRM resolves the template from **its own synced list** by name + language |
| Text / files | `type:"text"` (reply-to dropped: the CRM wants its own uuid) · `type:"document"\|"image"` with `media_url`, `filename`, caption as `text` |
| wamid | `data.whatsapp_message_id` (a 2xx without it = `uncertain`) |
| markRead | no-op (the CRM owns the conversation) |
| Template list / submit / samples / inbound media | `WaError {unsupported:'crm'}`: the sync answers `crm_managed` (no call, **no row touched**: nothing is marked missing or not_submitted), submit is 409 `crm_managed`, a number's sync `crm_managed`, inbound media 409 `crm_no_media`; `canUploadSamples()` false |
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

**Limits.** No template sync or submit from here (submit and approve in the CRM, which syncs from Meta);
the CRM must hold **the same template names and languages** as our registry (`meta_name`, `language`), and
**the same buttons in the same order** (`buttonParams` is keyed by the button's index); no
inbound media; no idempotency (an uncertain send is the admin's call); a document header goes as a link
without our filename; best-effort webhooks (a missed tick stays «sent»). Follow-up: mirror the CRM's
`message.received` into our inbox (the CRM owns that number's conversations today).

### Switching the notifications line to the CRM (owner steps)

1. In the CRM: Settings → API keys → New key with scope **`messages:send`**; copy it (shown once).
2. «التواصل» ← «الحماية» → «نظام CRM»: `WACRM_API_BASE` = `https://<crm-host>/api/v1`, save the key as `WACRM_API_KEY`.
3. In the CRM: add a webhook to `<API origin>/webhooks/wacrm` for event `message.status_updated`; paste its secret as `WACRM_WEBHOOK_SECRET`.
4. Set `WA_PROVIDER` = «نظام CRM», save, press «افحص الخطوط»: the line must show «نظام CRM», nothing missing, «مفتاح واجهة نظام CRM صالح ويملك صلاحية الإرسال».
5. On «القوالب», review **every** notifications template (statuses carry over from the last Meta sync): mark each one the CRM holds (same name, language and button order) approved with «علِّمه معتمدًا في نظام CRM» → «تأكيد الاعتماد», and each one it lacks «علِّمه غير متاح».
6. Send one test to a number in `WA_ALLOWED_RECIPIENTS` before removing the guard.
7. **Rollback:** set `WA_PROVIDER` back to «Meta مباشرة» (or Kapso). Nothing else changes; the hand-set statuses are re-synced by the next Meta sync **that reads the list** (a failed read touches no row: with a dead Meta token, re-check «القوالب» by hand).

`tools/wa-stub` serves a minimal CRM under `/crm/api/v1` (`GET /me`, `POST /messages`, Bearer, `{data}` /
`{error}` envelope; `crm.apiKey` / `crm.scopes` options) for api tests and e2e. Keys: `WACRM_API_BASE` plain
URL (group `wacrm`), `WACRM_API_KEY` / `WACRM_WEBHOOK_SECRET` Vault secrets (migration
`20261025000640_wacrm_driver.sql`, expand-only; ship with the `migrate` input ticked).
