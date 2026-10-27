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
bash tools/scripts/env/deploy-staging.sh
```
Pushes migrations, ships the committed `HEAD` with `git archive` (never `node_modules` or `.env`), rebuilds the API container, builds the web app against staging, swaps it in atomically and waits for `/health`. Secrets come from the git-ignored `.claude/artifacts/staging/` of the main checkout (`supabase.md`, `api.env`, `web.env`, `mobile.env`, `credentials.md`).

### From GitHub (no laptop secrets)

**Automatic:** every merge into `develop` deploys staging once `ci` has passed on that commit (a failed `ci` deploys nothing). **By hand:** GitHub → **Actions → deploy-staging → Run workflow** (`.github/workflows/deploy-staging.yml`). Both do the same five steps from a GitHub runner, reading every value from the repository environment **develop** (Settings → Environments → develop). Tick **env_only** to change only the server `.env` (e.g. a new WhatsApp token) and restart the API.

The server `.env` is **merged**, never replaced (`tools/scripts/env/env-merge.mjs`): a key that is empty or missing in GitHub keeps the server's value, a timestamped `.env.bak-*` is left next to it, and the log names the keys it set, never their values.

**Required (only these):**

| Kind | Name | What |
|---|---|---|
| secret | `SSH_PRIVATE_KEY` (or `VPS_SSH_PRIVATE_KEY`) | A key used only for deploys; its public half in `~/.ssh/authorized_keys` of the deploy user on the VPS |
| secret | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` | Supabase CLI token and the staging database password (migrations) |
| variable | `VITE_SUPABASE_ANON_KEY` | Staging anon key (public by design) for the web build |

**Built-in defaults** (a variable of the same name overrides): `SSH_HOST` 148.230.116.195, `SSH_USER` root, `DEPLOY_DIR` /opt/ayat-albayan-staging, `SUPABASE_PROJECT_REF` knxfwiimjcifwckhwbim, `API_URL` and `VITE_API_URL` https://api.ayatalbayan.com, `VITE_SUPABASE_URL` https://knxfwiimjcifwckhwbim.supabase.co, `WA_API_BASE` https://graph.facebook.com. The workflow no longer sets the WhatsApp phone number id or the messaging switch at all (see «GitHub Actions» below).

**Optional** (empty = the server keeps its value): secrets `SSH_KNOWN_HOSTS`, `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `FEEDBACK_TOKEN_SECRET`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `RECORDING_S3_ACCESS_KEY`, `RECORDING_S3_SECRET`, `EXPO_ACCESS_TOKEN`; variables `SUPABASE_URL`, `WEB_ORIGIN`, `WA_API_VERSION`, `WA_APP_ID`, `LIVEKIT_URL`, `RECORDING_S3_ENDPOINT`, `RECORDING_S3_REGION`, `RECORDING_S3_BUCKET`, `EXPO_API_BASE`, `FX_API_URL`.

On every run: the web app is built on the runner before anything on the server changes; if `/health` fails after the swap, the previous API code and web build are restored automatically (migrations are not undone); the run summary shows the commit and links.

Protect the environment: Settings → Environments → develop → Deployment branches = `develop` only, so no other branch can use its secrets. (Required reviewers would make every automatic deploy wait for an approval click.)

Mobile preview APK: `cd apps/mobile && npx eas-cli build --platform android --profile preview` (EAS keeps the Android keystore). Install link: the build page on expo.dev.

Demo data: `DATABASE_URL=<staging session pooler, aws-1-eu-central-1> node tools/scripts/seed/seed-demo.mjs --allow-remote-staging` (all rows marked DEMO; production is always refused).

Teachers 24/7 (owner 2026-10-12): migration 320 seeds `settings.teachers_always_available = true`, so from that deploy every teacher can be booked at any hour (time off and booked lessons still block). The saved teacher grids are not changed; switch it off on /admin/settings → «الجدول والحلقات» to book inside them again. Lessons generated earlier with an `outside_availability` flag keep it.

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

## Test teacher on staging (owner, 2026-10-05)

A sign-in account with role teacher («معلم تجريبي», English name `Test Teacher (DEMO)`, fake phone +1 555 000 1001, Sun–Thu 16:00–22:00 Asia/Riyadh) and a DEMO guardian «ولي أمر تجريبي» with one active student «طالب تجريبي» assigned to it (student code generated by the database). Script: `tools/scripts/seed/seed-test-account.mjs`; workflow: `.github/workflows/staging-test-account.yml`. Idempotent; the log shows ids and counts only, never the email or the password.

1. GitHub → Settings → Environments → **develop**: add the **secret `TEST_ACCOUNT_PASSWORD`** (at least 10 characters) and the **variable `TEST_TEACHER_EMAIL`** (or a secret with that name if the address should stay private). `SUPABASE_DB_PASSWORD` is already there. Optional: the secret `SUPABASE_SERVICE_ROLE_KEY` (the staging service-role key) makes the login go through the Supabase Admin API; without it the script writes `auth.users` + `auth.identities` with SQL (bcrypt, email confirmed), which signs in the same way.
2. Actions → **staging-test-account** → Run workflow → action **create**. Running it again keeps the same rows and resets the password to the current secret. It refuses an email that already belongs to an account it did not create.
3. Sign in at **https://app.ayatalbayan.com** with that email and password: the teacher pages open and «طالب تجريبي» is under «طلابي».
4. To remove: run the workflow with action **remove** (the student, the guardian, the teacher row and the login). `pnpm clear:demo --apply --allow-remote-staging` also removes the rows but leaves the login. Lessons or reports created for the test student make either refuse (nothing is deleted); delete those first.

Locally: `TEST_TEACHER_EMAIL=… TEST_ACCOUNT_PASSWORD=… pnpm seed:test-account` (`--remove` to delete), against the local Supabase from `pnpm env:local`.

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
| `WA_PHONE_NUMBER_ID`, `WA_WABA_ID` | The academy number's phone-number id and its WhatsApp Business Account id (Meta → WhatsApp → API Setup). The webhook ignores changes for any id that is neither line (this one or `WA_CHAT_PHONE_NUMBER_ID`) and logs one warning per distinct unknown id. This is the **notifications** line: it sends every booking, reminder and other platform template (chat starters go from the chat line, below). |
| `WA_ACCESS_TOKEN` | Permanent System User token with `whatsapp_business_messaging` + `whatsapp_business_management`. |
| `WA_APP_ID` | Id of the Meta app that issued `WA_ACCESS_TOKEN` (Meta app → Settings → Basic → App ID). Needed only to submit `report_ready` (PDF header: the sample PDF goes through Meta's Resumable Upload API); unset = that submit answers 409 `needs_app_id`. |
| `WA_APP_SECRET` | Meta app → Settings → Basic → App secret. Signs every webhook POST; wrong or missing = every POST is 401 and nothing is stored. A POST is accepted when it verifies with ANY of `WA_APP_SECRET` / `WA_CHAT_APP_SECRET`. |
| `WA_VERIFY_TOKEN` | Any long random string; typed again in Meta's webhook form (GET handshake). ONE token for both lines: type the same value in both Meta apps. |
| `WA_CHAT_PHONE_NUMBER_ID` | Phone-number id of the **chat** line (the second Meta number, in its own WABA; normal conversations). ALONE it makes the webhook receive, store and stamp that line's messages (`line = 'chat'`). Unset = single line, today's behaviour. Must differ from `WA_PHONE_NUMBER_ID`. |
| `WA_CHAT_WABA_ID` | WABA of the chat line. Needed to SEND from it (with the phone-number id and a token). |
| `WA_CHAT_ACCESS_TOKEN` | Token of the chat line; unset = `WA_ACCESS_TOKEN` is used. |
| `WA_CHAT_APP_ID` | Id of the chat line's Meta app: the sample upload for a PDF-header template submitted from the chat line, and «افحص الخطوط»; no fallback to `WA_APP_ID`. Set it equal to `WA_APP_ID` when both lines share one Meta app. |
| `WA_CHAT_APP_SECRET` | App secret of the chat line's Meta app. Required when the chat number is on a SEPARATE Meta app (else its webhook POSTs are 401 and Meta retries them); not needed when both lines share one app. |
| `WA_ALLOWED_RECIPIENTS` | Staging safety guard: comma list of E.164 numbers (`+20 100 123 4567`, `201001234567` are normalised). Set = nothing is sent to any other number: those rows stay `queued`, untouched, and read receipts to them are skipped. Unset or blank = unrestricted. Any invalid item, or a non-blank value with no items (`,`), stops the API at boot. |
| `WA_TEMPLATE_SYNC` | Default `true`. `false` stops the boot template sync, «راجع حالة القوالب» and «أرسله إلى ميتا للاعتماد» (409 `template_sync_off`), so Meta TEST credentials cannot rewrite the template registry. |
| `FEEDBACK_TOKEN_SECRET` | >= 32 random characters (`openssl rand -base64 48`). Signs the «رأيك يهمّنا» links (docs/13-forms-spec.md). Unset = «ابعت طلب الرأي» answers 503 and every public link is refused. Changing it invalidates links already sent. The template `lesson_feedback_request` also needs the web host in its button URL to be the final one before the admin submits it to Meta. |
| `LOGIN_CODE_PEPPER` | >= 32 random characters (`openssl rand -base64 48`). The HMAC pepper of the WhatsApp sign-in / password codes (docs/30). Unset = no code is issued (family sign-in shows «غير متاح بعد», staff are sent to the admin's reset). Changing it only voids the codes in flight (10 minutes). Set it in the server's API env (or Vault); never committed. |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | The self-hosted LiveKit (`wss://livekit-staging.148-230-116-195.sslip.io`, tools/livekit/README.md). All three or none: unset = `POST /lessons/:id/room/join` and `POST /public/join/:token` answer 503 `classroom_not_configured`. The API signs join tokens (HS256) with the key and secret; values live only in the server's `.env` and the owner's secret stores. The template `lesson_join_link` (migration 182, `not_submitted`; migration 20261012000330 rewrote its body in Modern Standard Arabic while it was never submitted) is submitted to Meta only by the admin's explicit action, after its button host is the final one, on the WABA of the line that sends templates. «الوضع الافتراضي: الحلقات عبر منصة الأكاديمية» (`settings.meetingLinkAuto` in ar.json; labelled «رابط الحلقة يُنشأ تلقائيًا من المنصة» until it was renamed with migration 20261019000490; `settings.meeting_link_auto`, /admin/settings «الحلقات عبر الإنترنت») needs all three variables AND that template approved before families get a link: until then reminders go out with the time and no link (the teacher still gets `/classroom/<id>` once LiveKit is set). Turning it on is the owner's call; staging-db first. Since migration 20261019000490 the switch is only the academy default: each teacher's «طريقة حضور الحلقات» (`teachers.meeting_mode`: academy default / fixed link / the academy platform) wins, so a teacher set to «منصة الأكاديمية» needs the same three variables and the approved `lesson_join_link` for their families to get a link, even while the switch is OFF. |
| `RECORDING_S3_ENDPOINT`, `RECORDING_S3_REGION`, `RECORDING_S3_BUCKET`, `RECORDING_S3_ACCESS_KEY`, `RECORDING_S3_SECRET` | Audio-only recordings (one MP3 per room) of every lesson and internal meeting (tools/livekit/README.md §Recording). Supabase → Storage → S3 Connection: the endpoint (`https://<project>.supabase.co/storage/v1/s3`), its region, an S3 access key pair; the bucket is `recordings` (migrations 189, 260). Needs LiveKit Egress v1.13.0 or newer (audio-only without Chrome). All five or none: unset = nothing is recorded (admins see «التسجيل غير مفعّل على الخادم»), nothing else changes. Needs LiveKit Egress running next to the server and the LiveKit webhook pointed at `POST /livekit/webhook` (else rows stay `recording`). |
| `EXPO_ACCESS_TOKEN` | Admin push notifications (already on the server). |
| `EXPO_API_BASE` | `https://exp.host` on staging/production. **No default**: unset (local, e2e) = pushes are recorded in `push_notifications` but never leave the server. |
| `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `WEB_PUSH_SUBJECT` | Browser push (R-NOT-02). Generate the key pair once: `node -e "const e=require('crypto').createECDH('prime256v1');e.generateKeys();console.log(e.getPublicKey('base64url'),e.getPrivateKey('base64url'))"` (first value = public, second = private, a secret). Subject: `mailto:<ops address>` or an `https://` URL. Set them in «التكاملات» (group «إشعارات المتصفح»; the private key goes to Vault) or in env. **Any unset = browser push off**: the bell still works, `GET /me/web-push/key` answers null and nothing is sent. Changing the pair invalidates every browser subscription (users turn it on again). |

**Before deploying the build without the env fuse (docs/23 phase 2) to any server**, check `select value from public.settings where key = 'messaging_enabled'`: it must be `false` (or no row) wherever the old env `MESSAGING_ENABLED` was off, otherwise sending starts at the deploy. Staging: `false` (owner, 2026-10-22). No production server exists yet.

**Two gates, both required to send** (`sendingAllowed`): WhatsApp configured (base, phone-number id, WABA id, token) and the admin's **kill switch** in `/admin/settings` (`settings.messaging_enabled`, seeded `false`), plus the allow-list `WA_ALLOWED_RECIPIENTS` where set. **There is no env switch any more** (owner 2026-10-22, docs/23 answer 2): a server `MESSAGING_ENABLED` is ignored. Fail-closed: only a stored `true` opens the switch; a missing or malformed row reads as `false`. Either gate off → outbound rows stay `queued`: nothing fails, nothing is lost. The inbox and the settings page say which gate is closed (`GET /messages/gate`): «الإرسال متوقف» for the switch, «واتساب غير مضبوط بعد» for the config (the chip then reads «مفعّل هنا · لا يُرسل شيء»). The switch asks for confirmation both ways: ON says how many queued messages go out at once, OFF who stops getting messages (the sender re-reads the gate before every message).

At send time the sender also drops rows that are no longer true (`failed`, `error_code = 'stale'`, never sent, no push): a booking confirmation or reminder whose lesson was cancelled or moved, a follow-up to a lead who paused, asked to stop, moved on or wrote again, and a `renewal_due` whose renewal task closed. A timeout after the request left (Meta may have sent it) is `failed` / `uncertain` for the admin to check — never resent blindly. An expired or revoked token (Meta 190 / 10 / 200) holds the queue (one admin push a day) instead of failing every row. A webhook item that fails (DB down) answers 500, so Meta re-sends it.

**Automatic messages switch** (`settings.auto_messages_enabled`, migration 162, seeded `false`; «الرسايل التلقائية (تذكير الحلقات، المتابعة، التجديد)» next to the sending switch in `/admin/settings`). OFF: the reminder job queues no `lesson_reminder*` / `teacher_lesson_reminder*` / `lesson_reminder_24h` (the `lesson_needs_confirmation` push still goes), the follow-up job does nothing (no `follow_up_slots`, no stage advances), and a renewal raises its admin task and the `payment_due` push but queues no `renewal_due`. Rows of those kinds the jobs queued earlier are not left waiting (they would go out at a wrong time later): on every sender pass while the switch is OFF (and the send gate is open), every one still queued (`created_by` null) is marked `failed`, `error_code = 'auto_off'` (no push), whatever its template's approval status, so a row under a template Meta approves later never slips out on its own; the switch is read again before every row, so OFF also stops the rest of a pass. A row the sender already claimed (`sending`) is never held: the admin is asked instead. The admin sees held rows in the thread with «جرّب تاني»; while the switch is OFF it answers 409 `auto_off` (the row stays held), once ON it re-queues the row. A held `renewal_due` whose package is renewed or paid meanwhile turns `stale` (no retry). Not affected: the admin's own texts and templates from the inbox (`created_by` set, even a `lesson_reminder`), booking confirmations and `report_ready`. The three gates above still govern everything that is queued.

**Lesson rating by buttons** (`lesson_rating`, migration 195, owner 2026-10-05 «so the chats don't get closed»). After a lesson is marked completed / late, the rating job queues one `lesson_rating` per guardian («كيف كانت حلقة {{1}} بتاريخ {{2}}؟ اختر تقييمك:» + quick replies «ممتازة» / «جيدة» / «تحتاج تحسينًا»; dedup `lesson_rating:{lesson}:{guardian}`, expires 72 h after the start) — only when `settings.feedback_mode = 'buttons'` (default; `'link'` = nothing automatic), automatic messages are ON and Meta approved the template; it is an automatic kind (held `auto_off` like reminders) and the three gates still govern it. A tap is an inbound message, so it **reopens the 24 h window**, and it is stored on `lesson_feedback.quick_rating`. In a closed chat the admin can press «إرسال تقييم الحلقة» (`POST /threads/:phone/rating`, the guardian's latest lesson that took place; not held by the automatic switch). **Owner action:** submit `lesson_rating` to Meta from `/admin/settings` («ابعته لميتا للموافقة», utility, no header) once the wording is confirmed; until Meta approves it nothing is queued and the inbox button stays disabled.

**Two lines** (docs/12 §13, owner 2026-10-10). The **notifications** line (`WA_*`) sends every platform template (booking, reminders, reports, renewals, follow-ups, rating); submit stays on its WABA. **Starter templates** (owner 2026-10-12, docs/12 §13.18): «راجع حالة القوالب» also reads the chat line's WABA and imports its new approved templates as sales starters, sent from the chat number (from notifications while `WA_CHAT_*` is unset); sales see only starters («قالب بدء محادثة للمبيعات» on the templates page). Cut-over: when the main number becomes the chat line, approve the booking / reminder templates and `lesson_join_link` on the notifications number's WABA first (submit them from `/admin/settings`). The optional **chat** line (`WA_CHAT_*`) is for normal conversations. Both lines' inbound land in the SAME inbox, one merged thread per phone, each bubble labelled with its line. A session reply leaves from the line of the customer's NEWEST inbound (the composer says «سيصل ردّك عبر …»); if that is the chat line and the chat line cannot send (`WA_CHAT_WABA_ID` or a token missing) the reply answers 503 `line_not_configured`. Read receipts and media downloads use the line the message arrived on. A dead token holds only its own line (one push per line per day). The API logs ONE boot warning naming any missing `WA_CHAT_*` piece. Two Meta apps = **two webhook subscriptions** (each app: our callback URL, the `messages` field) + **two app secrets** (`WA_APP_SECRET`, `WA_CHAT_APP_SECRET`) + **the same `WA_VERIFY_TOKEN`** typed in both. «افحص الخطوط» in `/admin/settings` (`POST /messaging/lines/check`, admin) reads each line's number status and the WABA's subscribed apps from Meta (read-only).

**WhatsApp drivers: Meta direct or Kapso, per line** (owner 2026-10-17, docs/19-messaging-drivers.md). Each line sends through Meta's Cloud API (`meta`, the default) or Kapso's Meta proxy (`kapso`), chosen in «التكاملات» (`WA_PROVIDER`, `WA_CHAT_PROVIDER`); a manual switch only, never an automatic failover. Kapso needs `KAPSO_API_BASE` (no default), `KAPSO_API_KEY` and, for inbound, a `meta`-kind Kapso webhook to `<API origin>/webhooks/kapso` signed with `KAPSO_WEBHOOK_SECRET`. Ship migration `20261017000450_kapso_secret_keys` (Vault allow-list for the two Kapso secrets) with `migrate` ticked. Optional `.env.example` lines for the owner: `# WA_PROVIDER=meta`, `# WA_CHAT_PROVIDER=meta`, `# KAPSO_API_BASE=`, `# KAPSO_API_VERSION=v24.0`, `# KAPSO_API_KEY=`, `# KAPSO_WEBHOOK_SECRET=`.

**Migration before API.** This release reads `messages.line` (migration `20261010000290_wa_lines`) in the sender, the media lookup and the thread list: ship it with the `deploy-staging` `migrate` input ticked, never with `migrate` unticked or `env_only`. The migration is expand-only (a code rollback needs no SQL; docs/12 §13.15).

**`apps/api/.env.example` (the OWNER pastes these lines; agents never read or edit `.env` files):**

```
# Two WhatsApp lines (docs/12 §13): chat line (optional) and the staging guards
# WA_CHAT_PHONE_NUMBER_ID=
# WA_CHAT_WABA_ID=
# WA_CHAT_ACCESS_TOKEN=
# WA_CHAT_APP_ID=
# WA_CHAT_APP_SECRET=
# WA_ALLOWED_RECIPIENTS=
# WA_TEMPLATE_SYNC=true
```

They are set by hand on the server like `WA_PHONE_NUMBER_ID`: no workflow sets them and `deploy-staging` does not merge them.

Independent of the gates: the webhook stores inbound messages and statuses, the jobs (reminders every 5 min, follow-ups every 5 min, push receipts every 15 min) keep **queuing** rows with dedup keys (reminders, follow-ups and renewals only while automatic messages are ON), and with WhatsApp configured the API runs one read-only template health check 5 s after boot (log only). Templates are submitted to Meta only when an admin presses «ابعته لميتا للموافقة» in `/admin/settings`; `report_ready` (PDF header) is submitted by hand in Business Manager.

## WhatsApp cut-over runbook (owner-run; documentation only)

Today the academy number (+966 56 610 1447) is served by the owner's CRM on the same VPS. Nothing below has been done; each step is the owner's call.

### 1. The owner confirms first
- Which Meta app the CRM uses. Same app as ours → the cut-over is a callback-URL change (3b). Its own app → the WABA's app subscription moves (3c).
- The CRM stops its own reminders / automations at the moment our gate opens, or guardians get every reminder twice.
- Wording of `report_ready`, `renewal_due`, `follow_up_slots`, `lesson_reminder_24h`, `lesson_rating` before anyone submits them; the open questions in docs/12 §10 («stop» from a guardian, quiet hours). Implemented per the contract, for the owner to confirm: a bare «تمام» confirms only the open lesson of the latest lesson-linked message we sent that guardian in the last 48 h (docs/12 §3.5), and `lesson_needs_confirmation` is pushed at the same-day reminder time (docs/12 §6).
- A quiet time window, and who watches `/admin/inbox` during it.

### 2. Prepare (no traffic moves)
1. **Deploy the build with the automatic-messages switch first** (develop at or after the cut-over prep commits, migration `20261001000162_auto_messages`), before any `WA_*` change or switching sending on. `deploy-staging.sh` ships the committed `HEAD` of the checkout that runs it, so run it from an up-to-date develop checkout (or fast-forward the `deploy/staging` worktree to develop first). Then confirm all three on the target, and stop if any is missing (without the switch, the old build's reminder and follow-up jobs would message the imported families):
   - `select max(version) from supabase_migrations.schema_migrations;` → `20261001000162` (or later);
   - `select value from settings where key = 'auto_messages_enabled';` → `false`;
   - `/admin/settings` shows «الرسايل التلقائية» (OFF).
   The same holds for production.
   Then on the server (`/opt/ayat-albayan-staging/.env`, or the production host's): set the `WA_*` values above with `WA_API_BASE=https://graph.facebook.com`, and keep «إرسال الرسائل» OFF in `/admin/settings`. Redeploy (`bash tools/scripts/env/deploy-staging.sh`). `/health` must answer.
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
4. Switch sending ON in `/admin/settings` (the only switch; it asks first and names the queue).
5. Only after the Apps Script reminders are stopped (3) **and** the owner confirmed the imported lesson times in the calendar: turn «الرسايل التلقائية» ON in `/admin/settings`. Reminders start with the next lesson inside the reminder window, follow-ups go to every due lead in `interested_no_slot` / `no_reply` on the next tick, and renewals are queued on the next lesson change or alert sweep. Reminder and renewal rows held as `auto_off` are not re-queued on their own (their dedup key is taken; held follow-ups get fresh slots by themselves): from the inbox, «جرّب تاني» the ones still worth sending (a renewal), leave the rest (past reminders; a retried one whose lesson passed or moved is dropped as `expired` / `stale`). A held renewal whose package was renewed or paid meanwhile is already `stale`.
6. In `/admin/settings` press «نقلنا الرقم من الـCRM» (`settings.crm_cutover_done`): the «don't turn sending on» CRM warning goes away. On a rollback (5), press «الرقم رجع على الـCRM؟ رجّع التحذير» on the same page: the flag goes back to false and the warning returns.

### 4. Verify (10 minutes)
- `/admin/settings` → «افحص الخطوط»: each configured line shows its number, «CONNECTED», its quality and «التطبيق مربوط بالحساب». «لا يوجد تطبيق مربوط بالحساب» or «التطبيق المربوط بالحساب ليس التطبيق المضبوط على الخادم» = the webhook will not arrive (fix the subscription first: (e) under «Meta test credentials on staging»). A call error about the access token (the card names it) = a bad or expired token for that line.
- From a staff phone, write to the academy number (and, with the chat line, to the chat number): the thread shows in `/admin/inbox` within seconds, the bubble labelled with its line. The API log shows `POST /webhooks/whatsapp` 200; a 401 means the app secret of that line's Meta app is wrong or missing (`WA_APP_SECRET` / `WA_CHAT_APP_SECRET`; nothing was stored). A 200 with a warning naming a `phone_number_id` = Meta sends an id that is neither line (fix `WA_PHONE_NUMBER_ID` / `WA_CHAT_PHONE_NUMBER_ID`).
- Reply from the inbox: it arrives on the staff phone, and the bubble moves «اتبعتت» → «وصلت» → «اتقرت».
- No new `failed` rows: `select error_code, count(*) from messages where status = 'failed' and created_at > now() - interval '1 hour' group by 1;`
- The admin phone gets the `new_message` push (needs the FCM credentials, see above).

### 5. Roll back
1. `/admin/settings` → sending OFF (confirm; rows stay queued) and automatic messages OFF. Or in SQL: `update public.settings set value = 'false' where key = 'messaging_enabled'` (read within `SETTINGS_CACHE_MS`).
2. Meta App Dashboard: put back the callback URL and verify token from 3.1 (or re-subscribe the CRM's app to the WABA and unsubscribe ours).
3. Turn the CRM's automations back on.
4. Messages that reached us during the window are only in our database: list them for the owner with `select phone_e164, body, created_at from messages where direction = 'inbound' and created_at > '<cut-over time>' order by created_at;`.

## Meta test credentials on staging

Staging may run on Meta TEST numbers (two test WABAs) so nothing reaches a real family. Content fixed by docs/12 §13.13. Since 2026-10-12 these keys may live in the database instead (see «Integration config in the database»): a value saved there wins over the server `.env` and over the deploy merge.

1. **(a) The deploy merge.** `deploy-staging`'s env-merge rewrites `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN` (secrets) and `WA_API_BASE`, `WA_API_VERSION`, `WA_WABA_ID`, `WA_APP_ID` (variables) from the GitHub environment `develop` on EVERY develop merge whenever they are NON-EMPTY there. So: FIRST deploy this feature with the new keys unset (behaviour changes only by: null `line` / `last_inbound_line` keys in reads; the sender and media selects reading the new column, hence the migration runs first; 502 `meta_error` instead of 410 for a media download refused with a Meta auth error; one warning per unknown `phone_number_id`); THEN switch the server to test credentials (with `WA_TEMPLATE_SYNC=false` already set, see (b)); and while test credentials are on the server, either put the same test values into the GitHub environment or empty those GitHub entries first. Otherwise the next deploy silently restores the real values next to the test phone-number id (auth errors, auth hold, webhook 401). `WA_PHONE_NUMBER_ID` and all the new keys are not merged, so they survive a deploy.
2. **(b) Order.** Set `WA_TEMPLATE_SYNC=false` (and `WA_ALLOWED_RECIPIENTS`) on the server BEFORE, or in the same edit and restart as, switching any `WA_*` credential to test values: the boot template sync runs whenever WhatsApp is configured, regardless of the sending switch, and would mark every approved template that is not on the test WABA `missing`. Only then switch sending ON in `/admin/settings`.
3. **(c) Templates on a test WABA.** Templates are per WABA; a Meta TEST WABA has `hello_world` only, so template sends to allowed recipients fail `132001` (not retryable) while session text works, and the platform pushes `reminder_failed`. With the sync off the registry still says `approved`. Keep the allow-list small.
4. **(d) Before lifting the allow-list.** Rows for other recipients stay `queued`, untouched, and several kinds never expire (booking / renewal rows), so removing the list would send them in one burst. First read `GET /messages/gate` (`queued`) and review / clear the queue deliberately.
5. **(e) Webhooks per app.** Each Meta app needs its OWN callback URL (ours), the SAME `WA_VERIFY_TOKEN`, the `messages` field subscribed, AND the app subscribed to its WABA (`POST /{WABA_ID}/subscribed_apps` with that line's token, or the dashboard's WABA subscription), verified by «افحص الخطوط» («التطبيق مربوط بالحساب»). The app-level subscription cannot be read with a WABA token; «افحص الخطوط» shows the WABA's subscribed apps and any WABA-level `override_callback_uri`; a phone-number-level override is visible only via `GET /{phone_number_id}?fields=webhook_configuration` or the Meta dashboard. A CRM app subscribed to the same WABA is the usual reason nothing arrives. The API log warns once per distinct unknown `phone_number_id`. A separate chat Meta app WITHOUT `WA_CHAT_APP_SECRET` makes its webhook POSTs 401, and Meta retries them.
6. **(f) `WA_API_VERSION`.** Check it before enabling: the default `v21.0` is about two years old and Meta silently upgrades calls to an expired Graph version.
7. **(g) Token expiry.** Meta test tokens expire in about 24 h: Graph 190 → auth hold (rows wait 15 min, nothing is lost) and ONE push per line per day (`whatsapp_auth:` / `whatsapp_auth:chat:`); the other line keeps sending.
8. **(h) Recipients and wa.me.** Add (and verify) each test recipient in the Meta app's recipient list, else Meta answers 131030; list the same numbers in `WA_ALLOWED_RECIPIENTS`. `academy_whatsapp_e164` (wa.me links, PDF footer) should hold the CHAT number.
9. **(i) `.env.example`.** The commented keys in «WhatsApp messaging (Phase 4)» above are for the owner to paste.
10. **Migration first.** Never deploy this release with the `migrate` input unticked or with `env_only`: the API reads `messages.line` (see «Migration before API» above). Behaviour rollback (unset only `WA_CHAT_WABA_ID` + `WA_CHAT_ACCESS_TOKEN` to stop chat SENDING; never unset `WA_CHAT_PHONE_NUMBER_ID` / `WA_CHAT_APP_SECRET` before the chat app's webhook is repointed in Meta) is docs/12 §13.15.

## Integration config in the database

Owner request 2026-10-12: «try not to use .env and make most of the config in the db». The integration values are now edited by an admin in **`/admin/settings` → «التكاملات»** and stored in Postgres; the server `.env` keeps only bootstrap and infrastructure keys and stays the **fallback**.

**Precedence: a non-empty database value wins over env.** Clearing a value in «التكاملات» (empty field, or «مسح» for a secret) brings the env value back. With neither, the key is unset, as before.

| Kind | Keys | Stored in |
|---|---|---|
| Plain | `WA_PROVIDER`, `WA_API_BASE`, `WA_API_VERSION`, `WA_PHONE_NUMBER_ID`, `WA_WABA_ID`, `WA_APP_ID`, `WA_CHAT_PHONE_NUMBER_ID`, `WA_CHAT_WABA_ID`, `WA_CHAT_APP_ID`, `WA_CHAT_PROVIDER`, `KAPSO_API_BASE`, `KAPSO_API_VERSION`, `WA_ALLOWED_RECIPIENTS`, `WA_TEMPLATE_SYNC`, `LIVEKIT_URL`, `EXPO_API_BASE`, `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_SUBJECT`, `FX_API_URL`, `GOOGLE_CLIENT_ID` | `public.integration_config` (admins read through RLS, only the API writes) |
| Secret | `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN`, `WA_CHAT_ACCESS_TOKEN`, `WA_CHAT_APP_SECRET`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `EXPO_ACCESS_TOKEN`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `KAPSO_API_KEY`, `KAPSO_WEBHOOK_SECRET`, `GOOGLE_CLIENT_SECRET` | Supabase **Vault**, name `integration:<KEY>`, through service-role-only functions (`integration_secret_set` / `_clear` / `integration_secrets_read` / `integration_secrets_status`). Write-only in the app: never returned, logged or audited (audit rows hold key names only). The allow-list is `integration_secret_key_ok`, last re-created by migration `20261022000610`; a new secret key needs a new migration (docs/25 §5) |
| Stays in env | `PORT`, `WEB_ORIGIN`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SETTINGS_CACHE_MS`, `INTEGRATION_REFRESH_MS`, `MESSAGE_SENDER_POLL_MS`, `AUTH_PASSWORD_MIN_LENGTH`, `FEEDBACK_TOKEN_SECRET`, `LOGIN_CODE_PEPPER`, `RECORDING_S3_*`, `GOOGLE_API_BASE`, `GOOGLE_REDIRECT_URI`, `GOOGLE_SYNC_POLL_MS`, `INTEGRATION_CONFIG_FROM_DB` (sending itself is only `settings.messaging_enabled`; `MESSAGING_ENABLED` was removed, 2026-10-22) | `.env` |

**How the API applies it.** At boot (before any job or the template boot sync, never blocking: a failed read logs a warning and keeps env only), every refresh period (minimum 1 s: `INTEGRATION_REFRESH_MS` when set, otherwise `SETTINGS_CACHE_MS` but at least 60 s (2026-10-27: fewer round trips; 0 stays 0 for e2e); `apps/api/src/common/integrations/integration-refresh.ts`) and right after an admin save, the API reads the database values, checks each one against the env schema (a bad one is dropped with one warning naming the key, never the value) and lays them over `process.env`. Every reader takes the config per call, so a change applies without a restart. `INTEGRATION_CONFIG_FROM_DB=false` makes the API ignore the database (env only; the unit tests use it).

**Order on a server.** Migration `20261012000310_integration_config` first (the API works without it: the read fails, env applies). Then, once:

```bash
# On the VPS, in /opt/ayat-albayan-staging (the container reads .env through compose):
docker compose exec ayat-api node dist/scripts/config-import-env.js            # keeps values already in the DB
docker compose exec ayat-api node dist/scripts/config-import-env.js --overwrite # replaces them
# Locally: pnpm --filter api build && pnpm --filter api config:import-env
```

It copies the **current non-empty** env values of the keys above into the table / Vault with the service role and prints only `KEY: imported` or `KEY: skipped (…)`, never a value. A value the env schema would refuse is skipped. After the import, check «التكاملات» (each field says «من الإعدادات» / «من الخادم»), then the moved keys may be removed from `.env` at your pace.

**The GitHub env merge is now a fallback only.** `deploy-staging` still merges the WhatsApp / LiveKit / Expo / FX values from the GitHub environment `develop` into the server `.env`, but a value saved in «التكاملات» wins over it, so a deploy can no longer silently restore a token over the admin's choice (the risk in «Meta test credentials on staging» (a) is gone for any key kept in the database). To switch staging to Meta test credentials, save them in «التكاملات» (with `WA_TEMPLATE_SYNC=false` and `WA_ALLOWED_RECIPIENTS` saved first, same order as (b)). No workflow can switch sending on: it is a database setting only.

## GitHub Actions

Owner request 2026-10-05: deploys, mobile builds/OTA, database migrations and the Claude routines run from GitHub, not from a PC. Files: `.github/workflows/`. Guarded by `tools/scripts/ci-checks/workflows.test.mjs` (every secret below must stay in this table).

> **THE REPOSITORY IS PUBLIC (the owner wants it private).** Strangers can open PRs and issues, and read every workflow and every log. So: no workflow uses `pull_request_target`; every workflow has `permissions: contents: read` at the top; deploys run only on push to `develop` (through `ci`) or by hand; secrets are only bound to jobs that name a protected environment; logs show key *names*, ids and counts, never values. **Make the repository private as soon as you can**, and set Settings → Actions → General → *Fork pull request workflows* → «Require approval for all outside collaborators». Repository-level secrets are readable by any workflow in the repo, so prefer creating them as **environment** secrets (table below) and restricting each environment's *Deployment branches* to `develop`.

### Workflows

| Workflow | Trigger | What it does | Environment | If a stranger opens a PR |
|---|---|---|---|---|
| `ci` | push, PR, manual | lint, typecheck, unit, e2e | none | runs without secrets (forks get none) |
| `deploy-staging` | `ci` green on a push to `develop`; manual | migrations (via `db-migrate`), env merge, API image, web swap, health check, auto rollback | `develop` (+ `staging-db` for the migration job) | never triggered by a PR |
| `db-migrate` | PR touching migrations; manual `apply` (+ `include_all`); called by `deploy-staging` | PR: read-only name/SQL check, no secrets (no database dry-run on PRs: a PR run uses the PR's own workflow and lockfile). Apply: `db push` to staging; manual runs may tick `include_all` | apply: `staging-db` | check only, no secrets |
| `mobile` | manual, on `develop`; `ota-update` to `preview` started by `deploy-staging` (see «Automatic OTA») | `build-android-apk` (EAS preview), `ota-update` (`eas update`), or `both`; OTA is refused if native deps/plugins/app.json native fields changed since the last build unless `force_ota` (images in `assets/<folder>/` and pure-JS packages such as Google fonts ship by OTA; check `node tools/scripts/ci-checks/native-changes.mjs <last OTA commit>` before forcing) | `mobile` | never triggered by a PR |
| `claude-tasks` | manual with a `prompt`; `@claude` comment | Claude Code opens a PR into `develop` | none (no deploy secrets) | ignored: needs the owner as actor, as author of the issue/PR and of every comment in the thread |
| `roster-report`, `staging-test-account` | manual | read-only roster CSV; test teacher + student on staging | `develop` | never triggered by a PR |

Migrations are **never applied by surprise**: the `apply` job waits in `staging-db` for the required reviewer. Since 2026-10-23 an automatic deploy **skips** the migrate job (no approval click) only when its `plan` job proves that nothing under `packages/db/supabase/migrations/` changed since the last deploy that pushed migrations (`tools/scripts/env/deploy-baseline.mjs` reads the run titles `deploy-staging <sha>`); if that deploy cannot be found or anything fails, migrate runs and waits for review as before. Every apply that does run pauses at «waiting for review»; approve it after reading the diff.

**Automatic OTA** (2026-10-23): after a green automatic or manual (non-`env_only`) deploy, `deploy-staging` starts `mobile` (`ota-update`, `preview`) when `apps/mobile/**` or `packages/shared/**` changed since the last green preview OTA (else the last deploy) and `native-changes.mjs <OTA_BASELINE_SHA>` finds no native change (repository variable `OTA_BASELINE_SHA`, default `c140b4cc` = the installed APK; update it after each new APK). Never an APK, iOS or production; `mobile` keeps its own native-change refusal. Manual runs apply only from `develop` (`deploy-staging` also refuses a manual run on any other branch). Untick `migrate` on `deploy-staging` to deploy code only.

**e2e on PRs** (2026-10-27): a pull request runs only the e2e specs its change can reach, plus the «single line» smoke set (the six journeys). `tools/scripts/ci-checks/e2e-areas/select.mjs` follows each changed file through the import graph (web, API, `packages/shared`, `packages/client-core`, e2e; changed `ar.json`/`en.json` keys to the files that read them) to the page routes and API modules that use it (a layout route counts with every page it renders; an edited barrel with everyone importing from it), and `e2e/areas.json` names the specs that drive those; the shard count follows their measured time. **Full suite** when a change is not understood: migrations and `packages/db`, any `package.json` or the lockfile, `.github`, e2e config and `e2e/support`, `apps/api/src/common`, `config`, `main.ts`, `app.module.ts`, web shell/layout routes, `apps/web/src/lib`, auth (web `people/auth`, API `people/sign-in`), anything the graph reaches that no area lists, a UI string nobody is found to read, or any error. Pushes to `develop`/`main` always run every spec on both projects. The `guards` job fails when a spec is in no area and not in `developOnly` (the SQL-only specs, which run whenever `packages/db` changes), or when an area path matches no file. A new page or API module: add it to an area of `e2e/areas.json`, or every PR that reaches it runs the full suite.

**`include_all`** (manual `db-migrate` run only, default off): adds `--include-all` to `supabase db push`. Staging has migration 212 applied while 206 and 213 are pending, so a plain push fails «out of order». Run `db-migrate` once with `apply` and `include_all` ticked, then leave it off. The automatic deploy never forces order.

### What you must add (Settings → Secrets and variables → Actions, and Settings → Environments)

**Environments:** `develop` (exists; Deployment branches = `develop`), `staging-db` (**add a required reviewer = you**; branches `develop`), `mobile` (branches `develop`; optional reviewer).

| Secret | Where to get it | Used by |
|---|---|---|
| `VPS_SSH_PRIVATE_KEY` (or `SSH_PRIVATE_KEY`) | A deploy-only key; public half in `authorized_keys` of the deploy user | `deploy-staging` |
| `VPS_HOST`, `VPS_USER` | The VPS address and login (variables `SSH_HOST`, `SSH_USER` win if set) | `deploy-staging` |
| `SSH_KNOWN_HOSTS` | **Recommended, not yet created:** `ssh-keyscan -t ed25519 <host>` from your PC, paste the line. Without it the run warns and uses `ssh-keyscan` | `deploy-staging` |
| `STAGING_SUPABASE_URL` | Supabase → Project Settings → API | `deploy-staging`, `staging-test-account` |
| `STAGING_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_ANON_KEY`) | Same page, `anon` key (public by design) | `deploy-staging` (web build) |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) | Same page, `service_role` | `deploy-staging` (server .env), `staging-test-account` |
| `STAGING_DATABASE_URL` | Supabase → Connect → **Session pooler** URI (GitHub runners have no IPv6, so not the `db.` host) | `db-migrate` |
| `STAGING_DB_PASSWORD` (or `SUPABASE_DB_PASSWORD`) | Supabase → Database settings | `db-migrate` (fallback path), `roster-report`, `staging-test-account` |
| `SUPABASE_ACCESS_TOKEN` | **Not created yet, optional:** supabase.com → Account → Access Tokens. Only needed if you do not set `STAGING_DATABASE_URL` | `db-migrate` |
| `SUPABASE_JWT_SECRET`, `FEEDBACK_TOKEN_SECRET` | Optional; empty keeps the server's value | `deploy-staging` |
| `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN` | Meta app; optional, empty keeps the server's value | `deploy-staging` |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | LiveKit project; optional | `deploy-staging` |
| `RECORDING_S3_ACCESS_KEY`, `RECORDING_S3_SECRET`, `EXPO_ACCESS_TOKEN` | Optional server keys | `deploy-staging` |
| `EXPO_TOKEN` | expo.dev → Account → Access tokens | `mobile` |
| `GOOGLE_SERVICES_JSON` | Firebase `google-services.json` content; optional if the EAS `preview` environment already holds it | `mobile` (OTA) |
| `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` | console.anthropic.com key, or `claude setup-token` | `claude-tasks` (the only secret it sees) |
| `TEST_ACCOUNT_PASSWORD`, `TEST_TEACHER_EMAIL` | Your choice (see «Test teacher on staging») | `staging-test-account` |
| `TURBO_TOKEN` | Optional Turborepo remote cache | `ci` |

Variables (all optional, defaults in the workflows): `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `DEPLOY_DIR`, `SSH_HOST`, `SSH_USER`, `API_URL`, `VITE_API_URL`, `WEB_ORIGIN`, `RUN_E2E`, `TURBO_TEAM`, `OTA_BASELINE_SHA`. **`develop` is NOT branch-protected today** (and neither is `main`): `claude-tasks` can only open PRs by convention, not by rule. Enabling protection (PR required) is an owner step, see the checklist.

Already created but **not used by any workflow yet:** `CRM_*`, `MEETING_CODE`, `FCM_SERVICE_ACCOUNT_JSON`, other `WA_*`, `LIVEKIT_*` beyond the two above, `GOOGLE_SERVICES_JSON` outside `mobile`. They sit unused until a workflow names them.

### Owner checklist (before and after merging the Actions PR)

Before merging:

1. Settings → Environments: create **`staging-db`** (required reviewer = you; deployment branches = `develop`) and **`mobile`** (deployment branches = `develop`). Without them the jobs wait or fail.
2. Apply the pending migrations **206 and 213** once: Actions → `db-migrate` → Run workflow on `develop` with `apply` and `include_all` ticked, approve in `staging-db`.
3. Compare `/opt/ayat-albayan-staging/.env` with the secrets that will overwrite it (`STAGING_SUPABASE_URL`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`, `WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN`): a secret that is set replaces the server's value, an empty one keeps it. Also check `WA_PHONE_NUMBER_ID` on the server (no workflow touches it) and «إرسال الرسائل» in `/admin/settings`.
4. Create the secret **`SSH_KNOWN_HOSTS`** (`ssh-keyscan -t ed25519 <host>`).

After merging:

5. Settings → Branches: protect **`develop`** and **`main`** (PR required, `ci` must pass).
6. Settings → Actions → General → Fork pull request workflows: «Require approval for all outside collaborators».
7. Delete the unused repository secrets `CRM_*`, `MEETING_CODE`, `FCM_SERVICE_ACCOUNT_JSON`.

Plan note: a **private** repository on the GitHub **Free** plan loses environment protection (required reviewers and deployment-branch rules), so the `staging-db` gate would no longer pause anything. Keep the repository public, or move to a paid plan, before relying on it.

Notes on `claude-tasks`: PRs it opens with the built-in token do not start `ci` by themselves (a GitHub rule): close and reopen the PR in the UI, or run `ci` by hand on its branch. It reads the whole issue/PR thread, so a thread where anyone but you commented is refused. Comments on a PR from a fork are ignored.

### Roll back

- **Staging deploy:** automatic. If `/health` fails after the swap the workflow restores `src.old` and `web.old` (kept as `src.bad` / `web.bad`). By hand see «Roll back» above.
- **A good deploy you do not want:** revert the commit on `develop`; the next deploy replaces it.
- **Migrations:** forward-only, no automatic undo. Write a new migration that reverses the change, or restore the Supabase backup (dashboard → Database → Backups).
- **OTA:** run `mobile` with `ota-update` on a `develop` that is reverted, or on expo.dev → Updates → republish an older update to the branch.
- **Server `.env`:** `deploy-staging` leaves `.env.bak-*` next to it.

### Deliberately NOT automated

- `WA_PHONE_NUMBER_ID`, `WA_CHAT_*`, `WA_ALLOWED_RECIPIENTS` and `WA_TEMPLATE_SYNC`: no workflow sets them (`tools/scripts/ci-checks/workflows.test.mjs` guards `WA_PHONE_NUMBER_ID`, `WA_CHAT_PHONE_NUMBER_ID` and `WA_ALLOWED_RECIPIENTS`). Sending is switched on only in `/admin/settings` (cut-over runbook); a repository variable or server env `MESSAGING_ENABLED` has no effect any more.
- The WhatsApp CRM cut-over, and anything on `/opt/wacrm` (live CRM on the same VPS). The only Docker clean-up is `docker image prune` limited to the label `com.docker.compose.project=ayat-albayan-staging`.
- Production: no production deploy, import (docs/06) or `production` EAS profile.
- iOS / Apple builds, signing and store submission.
- Creating, rotating or reading secrets.
