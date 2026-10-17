# 19 — Messaging drivers: Meta direct or Kapso, per line

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
| Inbound media | `GET /{media_id}` → `url`, downloaded with the bearer | `GET /{media_id}?phone_number_id=<line>` → `download_url` (token inside, ~4 min), downloaded with **no credential at all**; Kapso's `url` (Meta's lookaside) is never used |
| Sample uploads (Resumable Upload API) | `/{app_id}/uploads` with `WA_APP_ID` | none: `canUploadSamples()` is false, so a document-header template (`report_ready`) is refused exactly as without `WA_APP_ID` |
| Errors | `{error:{message,type,code,error_subcode}}` | same shape (same `WaError` mapping) |
| Refused credential | `190` / `10` / `200` (with HTTP 401) | HTTP **401** with body code `401`: `isWaAuthFailure` (code or status 401) holds the queue uncounted and pauses the line exactly like Meta's 190; inbound media answers 502 `meta_error`, never 410 |

## Webhook

- **`POST /webhooks/kapso`** (public, raw body). Kapso forwards Meta's **raw** payload (webhook kind `meta`), so the existing parser and the phone_number_id line routing apply unchanged.
- Authenticated by **`KAPSO_WEBHOOK_SECRET` only**: `X-Webhook-Signature` = lowercase hex HMAC-SHA256 of the raw body, or `X-Hub-Signature-256` = `sha256=` + that hex. Constant-time compare. No secret set = every POST is 401. A 401 logs (debug level, like the silent Meta route) only which signature header NAMES were present. Never activity-logged (`SKIPPED_ROUTES`).
- The Meta route `POST /webhooks/whatsapp` keeps verifying only `WA_APP_SECRET` / `WA_CHAT_APP_SECRET`; neither route ever accepts the other's secret.
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
