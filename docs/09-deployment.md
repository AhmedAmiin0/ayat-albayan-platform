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

- WhatsApp sending (Phase 4). The WhatsApp credentials stay off staging until the webhook cut-over from the CRM is planned with the owner.
- Android push credentials (FCM V1 via a Firebase project) and iOS (Apple Developer account). `EXPO_ACCESS_TOKEN` is already on the server.
- Production: a separate Supabase project and hosts, created at go-live.
