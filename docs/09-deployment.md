# 09 — Deployment

## Staging (live since 2026-10-02)

> **Hosts since 2026-10-03:** the web app is **https://app.ayatalbayan.com** and the API **https://api.ayatalbayan.com** (the domain has a wildcard A record `*.ayatalbayan.com` → 148.230.116.195; Caddy issues the certificates). The older sslip.io hosts below keep working (the API accepts both origins in `WEB_ORIGIN`), and installed Android builds still call the sslip.io API. WhatsApp URL buttons (the feedback template, `https://app.ayatalbayan.com/feedback/{{1}}`) are fixed by Meta at approval, so they always use the domain name. Supabase auth `site_url` is the domain (config.toml `[remotes.staging.auth]`).

| What | Where |
|---|---|
| Web app (admin / teacher / portal) | https://app-staging.148-230-116-195.sslip.io |
| API (NestJS) | https://api-staging.148-230-116-195.sslip.io (`/health`, `/docs`) |
| Database + Auth | Supabase project `ayat-albayan-staging`, ref `knxfwiimjcifwckhwbim`, region eu-central-1 (Frankfurt — no Middle East region is offered) |
| Mobile | EAS project `@holdmycup/ayat-albayan-admin`, profile `preview` (internal APK), EAS environment `preview` holds the `EXPO_PUBLIC_*` values |
| Server | Hostinger VPS `srv939652` (148.230.116.195), ssh alias `hostinger`; files in `/opt/ayat-albayan-staging` (`.env` is root-only, `src/` = shipped HEAD, `web/` = built SPA) |

The same VPS runs the owner's **live WhatsApp CRM** (`/opt/wacrm`, container `wacrm-app-1`, `crm.ayatalbayan.com`). Never stop, rebuild or edit it. The staging API listens on `127.0.0.1:3110` only; Caddy (`/etc/caddy/Caddyfile`, backups `Caddyfile.bak-*`) terminates TLS for the two staging hosts, which were appended as separate site blocks.

The public feedback limiter (`/public/feedback/*`, in memory, keyed on `req.ip` with `trustProxy: 1`) is only sound while exactly one proxy (Caddy) sits in front of a single API instance: keep the API bound to `127.0.0.1`, never expose its port, and revisit `trustProxy` (and move the counter to Redis or the DB) if the proxy depth or the instance count changes.

`*.sslip.io` hosts resolve to the VPS IP, so no DNS change was needed. To move to real names, add A records for e.g. `app-staging.ayatalbayan.com` and `api-staging.ayatalbayan.com` → `148.230.116.195` at **Namecheap** (the domain's DNS), then rename the two Caddy blocks, update `WEB_ORIGIN` in `/opt/ayat-albayan-staging/.env`, the `[remotes.staging.auth]` URLs in `packages/db/supabase/config.toml` (`supabase config push --project-ref knxfwiimjcifwckhwbim`), `.claude/artifacts/staging/web.env` and the EAS `preview` variables.

## Redeploy

```bash
bash tools/scripts/deploy-staging.sh
```
Pushes migrations, ships the committed `HEAD` with `git archive` (never `node_modules` or `.env`), rebuilds the API container, builds the web app against staging, swaps it in atomically and waits for `/health`. Secrets come from the git-ignored `.claude/artifacts/staging/` of the main checkout (`supabase.md`, `api.env`, `web.env`, `mobile.env`, `credentials.md`).

### From GitHub (no laptop secrets)

**Automatic:** every merge into `develop` deploys staging once `ci` has passed on that commit (a failed `ci` deploys nothing). **By hand:** GitHub → **Actions → deploy-staging → Run workflow** (`.github/workflows/deploy-staging.yml`). Both do the same five steps from a GitHub runner, reading every value from the repository environment **develop** (Settings → Environments → develop). Tick **env_only** to change only the server `.env` (e.g. a new WhatsApp token) and restart the API.

The server `.env` is **merged**, never replaced (`tools/scripts/env-merge.mjs`): a key that is empty or missing in GitHub keeps the server's value, a timestamped `.env.bak-*` is left next to it, and the log names the keys it set, never their values.

**Required (only these):**

| Kind | Name | What |
|---|---|---|
| secret | `SSH_PRIVATE_KEY` | A key used only for deploys; its public half in `~/.ssh/authorized_keys` of the deploy user on the VPS |
| secret | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` | Supabase CLI token and the staging database password (migrations) |
| variable | `VITE_SUPABASE_ANON_KEY` | Staging anon key (public by design) for the web build |

**Built-in defaults** (a variable of the same name overrides): `SSH_HOST` 148.230.116.195, `SSH_USER` root, `DEPLOY_DIR` /opt/ayat-albayan-staging, `SUPABASE_PROJECT_REF` knxfwiimjcifwckhwbim, `API_URL` and `VITE_API_URL` https://api.ayatalbayan.com, `VITE_SUPABASE_URL` https://knxfwiimjcifwckhwbim.supabase.co, `WA_API_BASE` https://graph.facebook.com, `WA_PHONE_NUMBER_ID` 1111735608697582 and `WA_WABA_ID` 1302549868709212 (Meta **test** number +1 555 663 0046), `MESSAGING_ENABLED` false.

**Optional** (empty = the server keeps its value): secrets `SSH_KNOWN_HOSTS`, `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `FEEDBACK_TOKEN_SECRET`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `RECORDING_S3_ACCESS_KEY`, `RECORDING_S3_SECRET`, `EXPO_ACCESS_TOKEN`; variables `SUPABASE_URL`, `WEB_ORIGIN`, `WA_API_VERSION`, `WA_APP_ID`, `LIVEKIT_URL`, `RECORDING_S3_ENDPOINT`, `RECORDING_S3_REGION`, `RECORDING_S3_BUCKET`, `EXPO_API_BASE`, `FX_API_URL`.

On every run: the web app is built on the runner before anything on the server changes; if `/health` fails after the swap, the previous API code and web build are restored automatically (migrations are not undone); the run summary shows the commit and links.

Protect the environment: Settings → Environments → develop → Deployment branches = `develop` only, so no other branch can use its secrets. (Required reviewers would make every automatic deploy wait for an approval click.)

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

## Online classroom: «السبورة للعرض فقط» / share not working (2026-10-05)

**What was wrong (fixed in code, no server change needed for it):**
1. A signed-in admin or teacher who opened the shared link of an internal meeting (`/m/<token>`) or a family's lesson link (`/join/<token>`) entered **as a guest**: the board said «السبورة للعرض فقط» and «شارك الشاشة» failed (a guest token may publish camera and microphone only). Now the link page sends signed-in staff to their own room (`/meeting/<id>`, `/classroom/<lesson>`; `GET /meetings/by-link/:token`, `GET /join-links/:token/lesson`). The student's long-lived link `/s/<token>` still joins as a guest.
2. «مشاركة السبورة» published a canvas track that carried no frames while nobody drew, so LiveKit never forwarded it. The board is now re-sent a few times a second while shared.
3. Share buttons appear only where they can work: no «شارك الشاشة» on phones (no `getDisplayMedia`); a guest gets «اطلب مشاركة الشاشة» and the teacher / admin / assistant answers «سماح» / «رفض» (`POST …/participants/:identity/share`, LiveKit `RoomService/UpdateParticipant`, nothing stored).

**If the room still says it cannot connect, check the server (owner, on the VPS):**
1. `/opt/ayat-albayan-staging/.env` has all three of `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (else every join is 503 and the page says «الحلقات عبر الإنترنت غير مفعّلة على الخادم بعد»). `LIVEKIT_URL` **must start with `wss://`** (`wss://livekit-staging.148-230-116-195.sslip.io`): the app is served over https, and browsers block a `ws://` socket from an https page; the room then says «عنوان خادم الحلقات يبدأ بـ ws://…». After editing: `docker compose up -d` in `/opt/ayat-albayan-staging` (or the GitHub deploy with **env_only**).
2. Open `https://livekit-staging.148-230-116-195.sslip.io` in a browser: it must answer `OK` (Caddy → `livekit-server` on 127.0.0.1:7880). If not, the room says «تعذّر الوصول إلى خادم الحلقات…»; check `docker ps` / `docker logs <livekit container>` and the Caddy block.
3. The media ports must be open in the VPS firewall: **UDP 7882**, **TCP 7881**, TURN **UDP 3478** (`ufw status`; Hostinger panel firewall too). With them closed the call connects but no video, audio or shared screen arrives.
4. While someone joins, `docker logs -f <livekit container>` shows `participant joined` and, for a shared board or screen, `mediaTrack published`. A track that stays `pending track` means no media reaches the server (ports in 3).

Local check against a real LiveKit: `docker run -d --name lk -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev --bind 0.0.0.0`, then `LIVEKIT_URL=ws://localhost:7880 LIVEKIT_API_KEY=devkey LIVEKIT_API_SECRET=secret pnpm --filter e2e run e2e --project=desktop tests/classroom-live.spec.ts tests/classroom-live-phone.spec.ts` (skipped without `LIVEKIT_URL`).

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
| `WA_APP_ID` | Id of the Meta app that issued `WA_ACCESS_TOKEN` (Meta app → Settings → Basic → App ID). Needed only to submit `report_ready` (PDF header: the sample PDF goes through Meta's Resumable Upload API); unset = that submit answers 409 `needs_app_id`. |
| `WA_APP_SECRET` | Meta app → Settings → Basic → App secret. Signs every webhook POST; wrong or missing = every POST is 401 and nothing is stored. |
| `WA_VERIFY_TOKEN` | Any long random string; typed again in Meta's webhook form (GET handshake). |
| `MESSAGING_ENABLED` | `true` opens the deployment's gate. Default `false`. |
| `FEEDBACK_TOKEN_SECRET` | >= 32 random characters (`openssl rand -base64 48`). Signs the «رأيك يهمّنا» links (docs/13-forms-spec.md). Unset = «ابعت طلب الرأي» answers 503 and every public link is refused. Changing it invalidates links already sent. The template `lesson_feedback_request` also needs the web host in its button URL to be the final one before the admin submits it to Meta. |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | The self-hosted LiveKit (`wss://livekit-staging.148-230-116-195.sslip.io`, tools/livekit/README.md). All three or none: unset = `POST /lessons/:id/room/join` and `POST /public/join/:token` answer 503 `classroom_not_configured`. The API signs join tokens (HS256) with the key and secret; values live only in the server's `.env` and the owner's secret stores. The template `lesson_join_link` (migration 182, `not_submitted`) is submitted to Meta only by the admin's explicit action, after its button host is the final one. |
| `RECORDING_S3_ENDPOINT`, `RECORDING_S3_REGION`, `RECORDING_S3_BUCKET`, `RECORDING_S3_ACCESS_KEY`, `RECORDING_S3_SECRET` | Lesson recordings (tools/livekit/README.md §Recording). Supabase → Storage → S3 Connection: the endpoint (`https://<project>.supabase.co/storage/v1/s3`), its region, an S3 access key pair; the bucket is `recordings` (migration 189). All five or none: unset = lessons are not recorded, nothing else changes. Needs LiveKit Egress running next to the server and the LiveKit webhook pointed at `POST /livekit/webhook` (else rows stay `recording`). |
| `EXPO_ACCESS_TOKEN` | Admin push notifications (already on the server). |
| `EXPO_API_BASE` | `https://exp.host` on staging/production. **No default**: unset (local, e2e) = pushes are recorded in `push_notifications` but never leave the server. |

**Three gates, all required to send** (`sendingAllowed`): `MESSAGING_ENABLED=true`, WhatsApp configured (base, phone-number id, WABA id, token), and the admin's **kill switch** in `/admin/settings` (`settings.messaging_enabled`, seeded `false`). Any of them off → outbound rows stay `queued`: nothing fails, nothing is lost. The inbox and the settings page say which gate is closed (`GET /messages/gate`): «الإرسال متوقف» for the switch, «الإرسال مقفول من السيرفر» for the env / config. Turning the switch ON asks for confirmation and says how many queued messages go out at once; OFF is immediate (the sender re-reads the gate before every message).

At send time the sender also drops rows that are no longer true (`failed`, `error_code = 'stale'`, never sent, no push): a booking confirmation or reminder whose lesson was cancelled or moved, a follow-up to a lead who paused, asked to stop, moved on or wrote again, and a `renewal_due` whose renewal task closed. A timeout after the request left (Meta may have sent it) is `failed` / `uncertain` for the admin to check — never resent blindly. An expired or revoked token (Meta 190 / 10 / 200) holds the queue (one admin push a day) instead of failing every row. A webhook item that fails (DB down) answers 500, so Meta re-sends it.

**Automatic messages switch** (`settings.auto_messages_enabled`, migration 162, seeded `false`; «الرسايل التلقائية (تذكير الحلقات، المتابعة، التجديد)» next to the sending switch in `/admin/settings`). OFF: the reminder job queues no `lesson_reminder*` / `teacher_lesson_reminder*` / `lesson_reminder_24h` (the `lesson_needs_confirmation` push still goes), the follow-up job does nothing (no `follow_up_slots`, no stage advances), and a renewal raises its admin task and the `payment_due` push but queues no `renewal_due`. Rows of those kinds the jobs queued earlier are not left waiting (they would go out at a wrong time later): on every sender pass while the switch is OFF (and the send gate is open), every one still queued (`created_by` null) is marked `failed`, `error_code = 'auto_off'` (no push), whatever its template's approval status, so a row under a template Meta approves later never slips out on its own; the switch is read again before every row, so OFF also stops the rest of a pass. A row the sender already claimed (`sending`) is never held: the admin is asked instead. The admin sees held rows in the thread with «جرّب تاني»; while the switch is OFF it answers 409 `auto_off` (the row stays held), once ON it re-queues the row. A held `renewal_due` whose package is renewed or paid meanwhile turns `stale` (no retry). Not affected: the admin's own texts and templates from the inbox (`created_by` set, even a `lesson_reminder`), booking confirmations and `report_ready`. The three gates above still govern everything that is queued.

**Lesson rating by buttons** (`lesson_rating`, migration 195, owner 2026-10-05 «so the chats don't get closed»). After a lesson is marked completed / late, the rating job queues one `lesson_rating` per guardian («كيف كانت حلقة {{1}} بتاريخ {{2}}؟ اختر تقييمك:» + quick replies «ممتازة» / «جيدة» / «تحتاج تحسينًا»; dedup `lesson_rating:{lesson}:{guardian}`, expires 72 h after the start) — only when `settings.feedback_mode = 'buttons'` (default; `'link'` = nothing automatic), automatic messages are ON and Meta approved the template; it is an automatic kind (held `auto_off` like reminders) and the three gates still govern it. A tap is an inbound message, so it **reopens the 24 h window**, and it is stored on `lesson_feedback.quick_rating`. In a closed chat the admin can press «إرسال تقييم الحلقة» (`POST /threads/:phone/rating`, the guardian's latest lesson that took place; not held by the automatic switch). **Owner action:** submit `lesson_rating` to Meta from `/admin/settings` («ابعته لميتا للموافقة», utility, no header) once the wording is confirmed; until Meta approves it nothing is queued and the inbox button stays disabled.

Independent of the gates: the webhook stores inbound messages and statuses, the jobs (reminders every 5 min, follow-ups every 5 min, push receipts every 15 min) keep **queuing** rows with dedup keys (reminders, follow-ups and renewals only while automatic messages are ON), and with WhatsApp configured the API runs one read-only template health check 5 s after boot (log only). Templates are submitted to Meta only when an admin presses «ابعته لميتا للموافقة» in `/admin/settings`; `report_ready` (PDF header) is submitted by hand in Business Manager.

## WhatsApp cut-over runbook (owner-run; documentation only)

Today the academy number (+966 56 610 1447) is served by the owner's CRM on the same VPS. Nothing below has been done; each step is the owner's call.

### 1. The owner confirms first
- Which Meta app the CRM uses. Same app as ours → the cut-over is a callback-URL change (3b). Its own app → the WABA's app subscription moves (3c).
- The CRM stops its own reminders / automations at the moment our gate opens, or guardians get every reminder twice.
- Wording of `report_ready`, `renewal_due`, `follow_up_slots`, `lesson_reminder_24h`, `lesson_rating` before anyone submits them; the open questions in docs/12 §10 («stop» from a guardian, quiet hours). Implemented per the contract, for the owner to confirm: a bare «تمام» confirms only the open lesson of the latest lesson-linked message we sent that guardian in the last 48 h (docs/12 §3.5), and `lesson_needs_confirmation` is pushed at the same-day reminder time (docs/12 §6).
- A quiet time window, and who watches `/admin/inbox` during it.

### 2. Prepare (no traffic moves)
1. **Deploy the build with the automatic-messages switch first** (develop at or after the cut-over prep commits, migration `20261001000162_auto_messages`), before any `WA_*` or `MESSAGING_ENABLED` change. `deploy-staging.sh` ships the committed `HEAD` of the checkout that runs it, so run it from an up-to-date develop checkout (or fast-forward the `deploy/staging` worktree to develop first). Then confirm all three on the target, and stop if any is missing (without the switch, the old build's reminder and follow-up jobs would message the imported families):
   - `select max(version) from supabase_migrations.schema_migrations;` → `20261001000162` (or later);
   - `select value from settings where key = 'auto_messages_enabled';` → `false`;
   - `/admin/settings` shows «الرسايل التلقائية» (OFF).
   The same holds for production.
   Then on the server (`/opt/ayat-albayan-staging/.env`, or the production host's): set the `WA_*` values above with `WA_API_BASE=https://graph.facebook.com`, leave `MESSAGING_ENABLED` unset. Redeploy (`bash tools/scripts/deploy-staging.sh`). `/health` must answer.
2. `/admin/settings` → «راجع حالة القوالب»: a read-only sync from Meta. The 8 approved templates must show «متوافق عليه» with Meta's real text.
3. Look at what would go out the moment sending opens:
   `select template_key, count(*), min(created_at) from messages where direction = 'outbound' and status = 'queued' group by 1;`
   With automatic messages OFF (5), opening the gate sends only queued admin texts and templates, booking confirmations and `report_ready`; job-made reminders, follow-ups and `renewal_due` are held as `auto_off` on the first pass (5). Of what does go, confirmations of lessons cancelled or moved since are dropped as `stale` when their turn comes. Mark the admin texts / `report_ready` rows that should not go as sent by hand from the inbox, or decide with the owner. To hold the automatic rows up front, before the gate opens (the sender does the same on its first pass):
   `update messages set status = 'failed', error_code = 'auto_off', error_text = 'cut-over hold', next_attempt_at = null where direction = 'outbound' and status = 'queued' and created_by is null and (error_code is null or error_code <> 'sending') and template_key in ('lesson_reminder', 'lesson_reminder_meet', 'lesson_reminder_plain', 'lesson_reminder_24h', 'teacher_lesson_reminder', 'teacher_lesson_reminder_meet', 'follow_up_slots', 'renewal_due');` To drop the stale lesson rows up front (same rule as the sender):
   `update messages m set status = 'failed', error_code = 'stale', error_text = 'cut-over cleanup', next_attempt_at = null from lessons l where m.lesson_id = l.id and m.direction = 'outbound' and m.status = 'queued' and l.status not in ('scheduled', 'confirmed') and m.template_key in ('booking_confirmation', 'booking_confirmation_meet', 'booking_confirmation_plain', 'lesson_reminder', 'lesson_reminder_meet', 'lesson_reminder_plain', 'lesson_reminder_24h', 'teacher_lesson_reminder', 'teacher_lesson_reminder_meet');`
4. With imported real data (staging since 2026-10-02), the first sender ticks after step 3.4 reach real families, but with automatic messages OFF only through chat, booking confirmations made in the app and lesson reports. Same-day reminders for the imported schedule rules (guardians and teachers), `renewal_due` for imported subscriptions at or under the alert threshold, and follow-ups for leads in `interested_no_slot` / `no_reply` start only after 3.5. Check `select template_key, count(*) from messages where status = 'queued' group by 1;` right before switching sending on, and before 3.5 tell the teachers and families that reminders now come from the academy number.
5. Keep **automatic messages OFF** (`/admin/settings` → «الرسايل التلقائية», seeded OFF) through the cut-over: the owner's old Apps Script still sends lesson reminders through the CRM, so ours would arrive twice, and the times of the imported schedule rules are not confirmed yet. With it OFF, opening the send gate sends only chat, booking confirmations and lesson reports; every job-made reminder / follow-up / `renewal_due` row already queued (`created_by` null), approved template or not, is held as `failed` / `auto_off` on the first pass (check: `select template_key, count(*) from messages where error_code = 'auto_off' group by 1;`; on staging this includes the 2 `renewal_due` rows).

### 3. Cut over
1. Meta App Dashboard → WhatsApp → Configuration → Webhook: **write down** the current callback URL and verify token (the rollback target).
2. (a) Point the webhook at us: callback `https://api-staging.148-230-116-195.sslip.io/webhooks/whatsapp` (or the production API host), verify token = `WA_VERIFY_TOKEN`, «Verify and save». Meta's GET must succeed (our route answers the challenge).
   (b) Same app as the CRM: (a) replaces the CRM's URL. Subscribe the webhook field `messages`.
   (c) CRM on its own app: in our app do (a) and subscribe `messages`; subscribe our app to the WABA (`POST /{WA_WABA_ID}/subscribed_apps` with our token) and unsubscribe the CRM's app (`DELETE /{WA_WABA_ID}/subscribed_apps` with the CRM app's token).
3. Stop the CRM's automations (1).
4. Set `MESSAGING_ENABLED=true` on the server, restart the API, then switch sending ON in `/admin/settings`.
5. Only after the Apps Script reminders are stopped (3) **and** the owner confirmed the imported lesson times in the calendar: turn «الرسايل التلقائية» ON in `/admin/settings`. Reminders start with the next lesson inside the reminder window, follow-ups go to every due lead in `interested_no_slot` / `no_reply` on the next tick, and renewals are queued on the next lesson change or alert sweep. Reminder and renewal rows held as `auto_off` are not re-queued on their own (their dedup key is taken; held follow-ups get fresh slots by themselves): from the inbox, «جرّب تاني» the ones still worth sending (a renewal), leave the rest (past reminders; a retried one whose lesson passed or moved is dropped as `expired` / `stale`). A held renewal whose package was renewed or paid meanwhile is already `stale`.
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
