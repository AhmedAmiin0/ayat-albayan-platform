# 09 — Deployment

## Staging (live since 2026-10-02)

| What | Where |
|---|---|
| Web app (admin / teacher / portal) | https://app-staging.148-230-116-195.sslip.io |
| API (NestJS) | https://api-staging.148-230-116-195.sslip.io (`/health`, `/docs`) |
| Database + Auth | Supabase project `ayat-albayan-staging`, ref `knxfwiimjcifwckhwbim`, region eu-central-1 (Frankfurt — no Middle East region is offered) |
| Mobile | EAS project `@holdmycup/ayat-albayan-admin`, profile `preview` (internal APK), EAS environment `preview` holds the `EXPO_PUBLIC_*` values |
| Server | Hostinger VPS `srv939652` (148.230.116.195), ssh alias `hostinger`; files in `/opt/ayat-albayan-staging` (`.env` is root-only, `src/` = shipped HEAD, `web/` = built SPA) |

The same VPS runs the owner's **live WhatsApp CRM** (`/opt/wacrm`, container `wacrm-app-1`, `crm.ayatalbayan.com`). Never stop, rebuild or edit it. The staging API listens on `127.0.0.1:3110` only; Caddy (`/etc/caddy/Caddyfile`, backups `Caddyfile.bak-*`) terminates TLS for the two staging hosts, which were appended as separate site blocks.

`*.sslip.io` hosts resolve to the VPS IP, so no DNS change was needed. To move to real names, add A records for e.g. `app-staging.ayatalbayan.com` and `api-staging.ayatalbayan.com` → `148.230.116.195` at **Namecheap** (the domain's DNS), then rename the two Caddy blocks, update `WEB_ORIGIN` in `/opt/ayat-albayan-staging/.env`, the `[remotes.staging.auth]` URLs in `packages/db/supabase/config.toml` (`supabase config push --project-ref knxfwiimjcifwckhwbim`), `.claude/artifacts/staging/web.env` and the EAS `preview` variables.

## Redeploy

```bash
bash tools/scripts/deploy-staging.sh
```
Pushes migrations, ships the committed `HEAD` with `git archive` (never `node_modules` or `.env`), rebuilds the API container, builds the web app against staging, swaps it in atomically and waits for `/health`. Secrets come from the git-ignored `.claude/artifacts/staging/` of the main checkout (`supabase.md`, `api.env`, `web.env`, `mobile.env`, `credentials.md`).

Mobile preview APK: `cd apps/mobile && npx eas-cli build --platform android --profile preview` (EAS keeps the Android keystore). Install link: the build page on expo.dev.

Demo data: `DATABASE_URL=<staging session pooler, aws-1-eu-central-1> node tools/scripts/seed-demo.mjs --allow-remote-staging` (all rows marked DEMO; production is always refused).

## Report PDFs (Chromium in the API image)

Lesson report PDFs (R-REP-03) are rendered in the API process by `playwright-core` (pinned to `1.63.0`, browser build chromium-1243, the same one the e2e suite installs). `chromium.launch()` takes no executable path: playwright-core finds the browser through `PLAYWRIGHT_BROWSERS_PATH`.

- **API image** (`apps/api/Dockerfile`): the runtime stage sets `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` and runs `playwright-core/cli.js install --with-deps --only-shell chromium` (headless shell + system libraries), plus `fonts-hosny-amiri` as a fallback font. The PDF embeds its own Amiri and IBM Plex Sans Arabic, so the container needs no other fonts.
- **Local dev / e2e**: leave `PLAYWRIGHT_BROWSERS_PATH` unset; playwright-core uses the default cache (`%LOCALAPPDATA%\ms-playwright` on Windows, `~/.cache/ms-playwright` on Linux) that `pnpm --filter e2e exec playwright install chromium` fills.
- **Bumping playwright-core**: bump `apps/api` and `e2e` together, rebuild the image. A browser mismatch shows as `pdf_status = 'failed'` with "Executable doesn't exist" in `lesson_reports.pdf_error`; the admin retry (R12) re-queues it once fixed.
- The logo is read at runtime from `apps/web/public/brand/mark.png`, so the image keeps the whole repo (`COPY . .`); don't move that file without updating `report-pdf/pdf-assets.ts`.

## Roll back

- API: on the VPS `cd /opt/ayat-albayan-staging && mv src src.bad && mv src.old src && docker compose up -d --build`.
- Web: `mv web web.bad && mv web.old web` (Caddy serves the folder directly; no reload needed).
- Caddy: restore the newest `/etc/caddy/Caddyfile.bak-*`, `caddy validate`, `systemctl reload caddy`.
- Database: migrations are forward-only; restore from the Supabase dashboard backup if needed.

## Not on staging yet

- WhatsApp (Phase 4). The code is shipped; the credentials stay off staging until the owner runs the cut-over below.
- Android push credentials (FCM V1 via a Firebase project) and iOS (Apple Developer account). `EXPO_ACCESS_TOKEN` is already on the server; **add `EXPO_API_BASE=https://exp.host`** with the Phase 4 fixes release, or admin pushes stay on the server (recorded, never sent).
- Production: a separate Supabase project and hosts, created at go-live.

## WhatsApp messaging (Phase 4)

The API talks to the WhatsApp Cloud API only through `WA_API_BASE`; there is **no default**, so a server without it can never reach Meta. Local runs and e2e point it at `tools/wa-stub` (`pnpm env:local` → `:4010`; Playwright → `:4110`). Never put production values in a local `.env`, and never read `apps/api/.env.secrets`.

| Env var (`apps/api`) | Meaning |
|---|---|
| `WA_API_BASE` | `https://graph.facebook.com` in production; the stub URL locally. Unset = WhatsApp off. |
| `WA_API_VERSION` | Graph version, default `v21.0`. |
| `WA_PHONE_NUMBER_ID`, `WA_WABA_ID` | The academy number's phone-number id and its WhatsApp Business Account id (Meta → WhatsApp → API Setup). The webhook ignores changes for any other phone-number id. |
| `WA_ACCESS_TOKEN` | Permanent System User token with `whatsapp_business_messaging` + `whatsapp_business_management`. |
| `WA_APP_SECRET` | Meta app → Settings → Basic → App secret. Signs every webhook POST; wrong or missing = every POST is 401 and nothing is stored. |
| `WA_VERIFY_TOKEN` | Any long random string; typed again in Meta's webhook form (GET handshake). |
| `MESSAGING_ENABLED` | `true` opens the deployment's gate. Default `false`. |
| `EXPO_ACCESS_TOKEN` | Admin push notifications (already on the server). |
| `EXPO_API_BASE` | `https://exp.host` on staging/production. **No default**: unset (local, e2e) = pushes are recorded in `push_notifications` but never leave the server. |

**Three gates, all required to send** (`sendingAllowed`): `MESSAGING_ENABLED=true`, WhatsApp configured (base, phone-number id, WABA id, token), and the admin's **kill switch** in `/admin/settings` (`settings.messaging_enabled`, seeded `false`). Any of them off → outbound rows stay `queued`: nothing fails, nothing is lost. The inbox and the settings page say which gate is closed (`GET /messages/gate`): «الإرسال متوقف» for the switch, «الإرسال مقفول من السيرفر» for the env / config. Turning the switch ON asks for confirmation and says how many queued messages go out at once; OFF is immediate (the sender re-reads the gate before every message).

At send time the sender also drops rows that are no longer true (`failed`, `error_code = 'stale'`, never sent, no push): a booking confirmation or reminder whose lesson was cancelled or moved, a follow-up to a lead who paused, asked to stop, moved on or wrote again, and a `renewal_due` whose renewal task closed. A timeout after the request left (Meta may have sent it) is `failed` / `uncertain` for the admin to check — never resent blindly. An expired or revoked token (Meta 190 / 10 / 200) holds the queue (one admin push a day) instead of failing every row. A webhook item that fails (DB down) answers 500, so Meta re-sends it.

**Automatic messages switch** (`settings.auto_messages_enabled`, migration 162, seeded `false`; «الرسايل التلقائية (تذكير الحلقات، المتابعة، التجديد)» next to the sending switch in `/admin/settings`). OFF: the reminder job queues no `lesson_reminder*` / `teacher_lesson_reminder*` / `lesson_reminder_24h` (the `lesson_needs_confirmation` push still goes), the follow-up job does nothing (no `follow_up_slots`, no stage advances), and a renewal raises its admin task and the `payment_due` push but queues no `renewal_due`. Rows of those kinds the jobs queued earlier are not left waiting (they would go out at a wrong time later): when the sender reaches them it marks them `failed`, `error_code = 'auto_off'` (no push); the admin sees them in the thread with «جرّب تاني», which re-queues the row — it goes out only once the switch is ON (while OFF it is held again). Not affected: the admin's own texts and templates from the inbox (`created_by` set, even a `lesson_reminder`), booking confirmations and `report_ready`. The three gates above still govern everything that is queued.

Independent of the gates: the webhook stores inbound messages and statuses, the jobs (reminders every 5 min, follow-ups every 5 min, push receipts every 15 min) keep **queuing** rows with dedup keys (reminders, follow-ups and renewals only while automatic messages are ON), and with WhatsApp configured the API runs one read-only template health check 5 s after boot (log only). Templates are submitted to Meta only when an admin presses «ابعته لميتا للموافقة» in `/admin/settings`; `report_ready` (PDF header) is submitted by hand in Business Manager.

## WhatsApp cut-over runbook (owner-run; documentation only)

Today the academy number (+966 56 610 1447) is served by the owner's CRM on the same VPS. Nothing below has been done; each step is the owner's call.

### 1. The owner confirms first
- Which Meta app the CRM uses. Same app as ours → the cut-over is a callback-URL change (3b). Its own app → the WABA's app subscription moves (3c).
- The CRM stops its own reminders / automations at the moment our gate opens, or guardians get every reminder twice.
- Wording of `report_ready`, `renewal_due`, `follow_up_slots`, `lesson_reminder_24h` before anyone submits them; the open questions in docs/12 §10 («stop» from a guardian, quiet hours). Implemented per the contract, for the owner to confirm: a bare «تمام» confirms only the open lesson of the latest lesson-linked message we sent that guardian in the last 48 h (docs/12 §3.5), and `lesson_needs_confirmation` is pushed at the same-day reminder time (docs/12 §6).
- A quiet time window, and who watches `/admin/inbox` during it.

### 2. Prepare (no traffic moves)
1. On the server (`/opt/ayat-albayan-staging/.env`, or the production host's): set the `WA_*` values above with `WA_API_BASE=https://graph.facebook.com`, leave `MESSAGING_ENABLED` unset. Redeploy (`bash tools/scripts/deploy-staging.sh`). `/health` must answer.
2. `/admin/settings` → «راجع حالة القوالب»: a read-only sync from Meta. The 8 approved templates must show «متوافق عليه» with Meta's real text.
3. Look at what would go out the moment sending opens:
   `select template_key, count(*), min(created_at) from messages where direction = 'outbound' and status = 'queued' group by 1;`
   Reminders past their lesson expire on their own (`failed`, `expired`); confirmations / reminders of lessons cancelled or moved since, follow-ups to leads who replied or paused, and renewals already settled are dropped as `stale` when their turn comes. Admin texts and still-due `renewal_due` / `report_ready` rows do go out: mark the ones that should not as sent by hand from the inbox, or decide with the owner. To drop the stale lesson rows up front (same rule as the sender):
   `update messages m set status = 'failed', error_code = 'stale', error_text = 'cut-over cleanup', next_attempt_at = null from lessons l where m.lesson_id = l.id and m.direction = 'outbound' and m.status = 'queued' and l.status not in ('scheduled', 'confirmed') and m.template_key in ('booking_confirmation', 'booking_confirmation_meet', 'booking_confirmation_plain', 'lesson_reminder', 'lesson_reminder_meet', 'lesson_reminder_plain', 'lesson_reminder_24h', 'teacher_lesson_reminder', 'teacher_lesson_reminder_meet');`
4. With imported real data (staging since 2026-10-02), the first sender ticks after step 3.4 will also reach real families: same-day reminders for upcoming lessons of the imported schedule rules (guardians and teachers), `renewal_due` for imported subscriptions at or under the alert threshold, and follow-ups for leads in `interested_no_slot` / `no_reply` (imported leads are mostly `new`, which gets none). Check `select template_key, count(*) from messages where status = 'queued' group by 1;` right before switching sending on, and tell the teachers and families that reminders now come from the academy number.
5. Keep **automatic messages OFF** (`/admin/settings` → «الرسايل التلقائية», seeded OFF) through the cut-over: the owner's old Apps Script still sends lesson reminders through the CRM, so ours would arrive twice, and the times of the imported schedule rules are not confirmed yet. With it OFF, opening the send gate sends only chat, booking confirmations and lesson reports; the `renewal_due` / reminder rows already queued are held as `failed` / `auto_off` (check: `select template_key, count(*) from messages where error_code = 'auto_off' group by 1;`).

### 3. Cut over
1. Meta App Dashboard → WhatsApp → Configuration → Webhook: **write down** the current callback URL and verify token (the rollback target).
2. (a) Point the webhook at us: callback `https://api-staging.148-230-116-195.sslip.io/webhooks/whatsapp` (or the production API host), verify token = `WA_VERIFY_TOKEN`, «Verify and save». Meta's GET must succeed (our route answers the challenge).
   (b) Same app as the CRM: (a) replaces the CRM's URL. Subscribe the webhook field `messages`.
   (c) CRM on its own app: in our app do (a) and subscribe `messages`; subscribe our app to the WABA (`POST /{WA_WABA_ID}/subscribed_apps` with our token) and unsubscribe the CRM's app (`DELETE /{WA_WABA_ID}/subscribed_apps` with the CRM app's token).
3. Stop the CRM's automations (1).
4. Set `MESSAGING_ENABLED=true` on the server, restart the API, then switch sending ON in `/admin/settings`.
5. Only after the Apps Script reminders are stopped (3) **and** the owner confirmed the imported lesson times in the calendar: turn «الرسايل التلقائية» ON in `/admin/settings`. Reminders start with the next lesson inside the reminder window, follow-ups go to every due lead in `interested_no_slot` / `no_reply` on the next tick, and renewals are queued on the next lesson change or alert sweep. Reminder and renewal rows held as `auto_off` are not re-queued on their own (their dedup key is taken; held follow-ups get fresh slots by themselves): from the inbox, «جرّب تاني» the ones still worth sending (a renewal), leave the rest (past reminders).
6. In `/admin/settings` press «نقلنا الرقم من الـCRM» (`settings.crm_cutover_done`): the «don't turn sending on» CRM warning goes away. On a rollback (5), press «الرقم رجع على الـCRM؟ رجّع التحذير» on the same page: the flag goes back to false and the warning returns.

### 4. Verify (10 minutes)
- From a staff phone, write to the academy number: the thread shows in `/admin/inbox` within seconds. The API log shows `POST /webhooks/whatsapp` 200; a 401 means `WA_APP_SECRET` is wrong (nothing was stored).
- Reply from the inbox: it arrives on the staff phone, and the bubble moves «اتبعتت» → «وصلت» → «اتقرت».
- No new `failed` rows: `select error_code, count(*) from messages where status = 'failed' and created_at > now() - interval '1 hour' group by 1;`
- The admin phone gets the `new_message` push (needs the FCM credentials, see above).

### 5. Roll back
1. `/admin/settings` → sending OFF (immediate; rows stay queued) and automatic messages OFF. Or `MESSAGING_ENABLED=false` + restart.
2. Meta App Dashboard: put back the callback URL and verify token from 3.1 (or re-subscribe the CRM's app to the WABA and unsubscribe ours).
3. Turn the CRM's automations back on.
4. Messages that reached us during the window are only in our database: list them for the owner with `select phone_e164, body, created_at from messages where direction = 'inbound' and created_at > '<cut-over time>' order by created_at;`.
