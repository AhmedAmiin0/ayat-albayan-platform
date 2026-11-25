# 51 — Family web app (apps/family-web), split from apps/staff-web

Owner 2026-11-14: «its a monorepo» / «why dont you just seperate them» / «go ahead and try to do the same for the web». The family mobile app is its own app (`apps/family-mobile`, docs/50 §7); the family web pages follow: their own web app in the monorepo, sharing code through a package, never a build variant of apps/staff-web.

Names (rename #735): `apps/staff-web` (package `staff-web`), `apps/staff-mobile`, `apps/family-mobile` (the family Expo app), `apps/api`. Owner 2026-11-15 changes (§1a) are what the family mobile app already ships (#738, #739); the web mirrors them.

## 1. Target

- **Folder and stack.** `apps/family-web`, the same stack as apps/staff-web: React 19, Vite, TanStack Router + Query, Tailwind 4, React Compiler. Package name `family-web`, dev port 5174.
- **Host.** `https://family.ayatalbayan.com` (default; the owner confirms). `*.ayatalbayan.com` already resolves to the VPS, and the host Caddy issues TLS automatically (docs/09 L5).
- **Brand.** The family app's English name «Ayat Al-Bayan» and the academy emblem (owner 2026-11-16 «use the logo from the project», #748, #753), not the old book-and-crescent icon. The sign-in shows the kit `Mark` (`docs/design/brand/logo-mark.png`) on the deep-green tile (`bg-brand-tile` = theme.ts `brandTile`). Favicon (ico + png), apple-touch-icon and the manifest icons (192, 512, maskable 512) are the same emblem on that green tile, like the family mobile app icon.
- **Brand assets live in one package** (owner 2026-11-18: apps never share by copying): `packages/web-kit/public/` (`/sw.js`, `/brand/*.png`, every web app) and `packages/web-kit/icons/<staff|family>/` (each app's favicons and icons), written by `docs/design/brand/tools/build.mjs` (`web-icons.mjs`). `webConfig({ icons })` (`packages/config/vite-public.js`) serves them in dev and emits them beside `index.html` in the build, at the same URLs; no copies in `apps/*/public` (only each app's `manifest.json`). Title; theme colour `#064E3B`. The manifest `start_url` is `/portal`.
- **Paths:** `/login` (family sign-in only), `/portal` (home: the page of the student in view), `/schedule`, `/reports`, `/children` («اختر الطالب», a guardian of several), `/children/$studentId` (a push or link target, never filtered by the pick), `/report/$reportId`, `/alerts`, `/account`, and `/` → `/portal`.
- The portal logic comes from `@ab/client-core` `people/portal/**`, including `people/portal/app/*` (family-tabs, week-schedule, alerts, child-summary, seen-store, day-word); the web and the family mobile app use the same rules.
- **Signed-link pages stay on `app.`:** `/report`, `/feedback`, `/join`, `/s`, `/m`, `/pay`. Meta fixed `app.` in the approved template buttons, and the API builds these links from the first `WEB_ORIGIN`.

### 1a. Owner changes, 2026-11-15 (the family mobile app ships them)

1. **One sign-in for guardians and students, no tabs.** Default: WhatsApp number → code. Secondary, one tap away: «الدخول برمز الطالب وكلمة المرور» («أول دخول؟» / «نسيت كلمة المرور؟» send a code to the guardian). While WhatsApp codes are off: the password form and one line saying why. Owner: «whatsapp works always, the app code is optional».
   - The pure sign-in logic (sign-in-way, student-code, phone-check, countries, country-dial, country-search, code-digits) MOVED from apps/family-mobile to `@ab/client-core` `people/family-auth/` with its tests; both apps import it.
   - The web mirrors the app (#741, #752): one LTR number field with the country (flag, «+966» as an LTR island) at its start; «اختر الدولة» lists every country, the region of the browser's language tag and the usual ones first, searchable; a whole number pasted picks its country. The code step: «أدخل الرمز» for the number, the sixth digit signs in, a refused code empties the boxes.
   - «من يسجّل الدخول؟» (one number, several accounts): the API answers one account per number today (`guardianByPhone`) and the family mobile app has no picker either; it needs an API change first (open item).
   - The staff `/login` keeps the staff form; its family tab becomes a link to the family host once it is live (§3).
2. **Navigation = the family mobile app (#739).**
   - One bar for every login (develop #746, owner 2026-11-16): الرئيسية · الجدول · التقارير · حسابي, all of the student in view (`familyTabs(familyPick(…))`); «التقارير» waits until that student is known.
   - A guardian of several children picks one on «اختر الطالب» (shown in place of the home until then, saved per profile in this browser: `pickStore`) and switches from the child's name on top of every page. A student never sees money or the package.
   - A bell with an unread badge at the top → الإشعارات.
   - Chat (done): while `family_chat_enabled` is on, the child's page has «المحادثة» last, with its unread count (`childTabPill`, shared with the family app), and the thread of the student in view (`ChannelThread`, refs `portal` + student, from the kit). Off: no tab, no channel read. A «chat» alert opens `?tab=chat` while it is on, else the child's page.
   - Wide screens: a side rail or top nav; phones: a bottom bar.
3. **No biometric on the web.**
4. **Join inside the page:** the classroom room is in the kit (§2); a Meet lesson opens its Meet URL.

## 2. Shared code: `packages/web-kit` (`@ab/web-kit`)

- **It exports SOURCE, not dist.** The React Compiler and `import.meta.env` need Vite to transform it. `@ab/web-kit/<path>` resolves through the kit's package.json `exports` (no tsconfig `paths`, no Vite alias): an explicit entry for `index.css` and each folder module, and `./*` for files, whose `types` condition lists `src/*.ts` then `src/*.tsx` for TypeScript and whose `default` is the extensionless `src/*` that Vite completes. The kit's own files import each other the same way or as `./` siblings; they never use `@/`.
- **Contents** (moved from apps/staff-web with the repo's move codemod, `tools/scripts/ci-checks/move-module.ts`; no copies):
  - the UI primitives (`components/ui/*`, the side `Drawer`) and `LanguageSwitch` (NOT `AdminLayout`, `MenuBar` or `SectionHome`, which link to `/admin`);
  - the tokens and `index.css`, with `@source "./"` so each app's Tailwind sees the kit's classes;
  - `lib/`: the HTTP client binding and `env.ts` (with `familyOrigin` / `staffOrigin`), i18n, clock, theme, `use-now`, viewer zone, public config, money text, `session-end` (an app registers its tab memories; the kit forgets them when the session ends);
  - `boot/`: `startApp` (texts and overrides first) and `renderApp` (theme, push binding, router);
  - `auth/`: the session (`sign-in`, `me`, `session-activity`, return-to), the code steps, `PasswordInput`, `PasswordForm`, `PhoneSignIn`, `ResetFlow`, and the «تجريبي» chips (`TestChip`, `MeTestChip`, docs/56);
  - `push/`: web push subscribe/forget and `public/sw.js` (served at `/sw.js` of both apps by the config factory);
  - `report/` (`ReportPage`, one component mounted by both apps) and `portal/` (the portal's lessons with the family's lesson options, history, report, recordings, package and home cards);
  - `schedule/` (the week slot grid, `WeekSlotsFrame`, `MoveReason`, slots and date labels: staff rescheduling and the family's «اطلب موعدًا آخر») and `lesson-files/` (the audio player and file words: staff «ملفات الحلقة» and the family's «التسجيلات»);
  - `classroom/`: the LiveKit room (room, board, mute, kick, share, recordings, stage and their API) — families join inside the page.
  - `components/channel/`: the student channel thread (`ChannelThread`, bubbles, composer, edits, live socket, its API and the chat header's presence line); staff-only parts (teacher messages, monitor, seats) stay in apps/staff-web `student-channel`.
- **apps/staff-web imports these from the kit:** a move, no copies. `@ab/config` has the shared configs: `@ab/config/vite` (`webConfig`, merged with `testConfig` from `@ab/testing/vitest`), `@ab/config/eslint-web` (`webReactConfig`) and `webBlocks` in `@ab/config/lint`, so the three web workspaces' configs are not clones.
- **jscpd** cross-app clones: zero.
- **CI coverage.**
  - `knip.json`, `tools/scripts/ci-checks/e2e-areas/{select,graph}.mjs`, `e2e/areas.json` and turbo know `apps/family-web` and `packages/web-kit` (turbo hashes the kit's files into every dependant's tasks).
  - ci.yml «verify»: lint and typecheck cover every workspace; «test family web» runs apps/family-web and the kit.

## 3. apps/staff-web after the split

- **`/portal` and `/account` for a guardian or student.** In `beforeLoad`, BEFORE `requireRole` (`features/people/auth/family-host`):
  1. `signOut` on `app.` (activity report, `forgetWebPush`, session);
  2. `location.replace(FAMILY_ORIGIN + path + search)`.
  - Guard: when `VITE_FAMILY_ORIGIN` is empty or equals the current origin, there is no redirect (dev, Vitest, the e2e staff server; no reload loop).
  - So merging is safe before the host exists.
  - A signed-out visitor on `/portal` goes too (the page is the families'); staff on `/account` stay.
- **Staff `/login`.** With the family host set, the family tab becomes a link to it. A student code typed into the staff password form lands on `/portal`, which then signs out and redirects the same way.
- **Installed `app.` icon.** A notice («انتقلت صفحات الأسرة») with the link instead of a silent jump, because iOS web push needs the Home Screen app.
- **A staff account on the family host.** A «wrongApp» notice with a link to `app.` (`VITE_STAFF_ORIGIN`), then sign out.

## 4. API and infra

| Item | Change |
|---|---|
| `WEB_ORIGIN` | The live list is in the server `.env` (env-merge skips an empty GitHub variable). Write the FULL list with `app.` FIRST and family last, no leading comma. `env.ts`: the first entry must be an http(s) origin (refine). `main.ts`: CORS trims each entry. |
| `users.module.ts` | `setPasswordUrl` from `firstOrigin`, not the whole list. Deploy before the `WEB_ORIGIN` change (e2e `users-control.invite.spec.ts` depends on it). |
| Env plumbing | `VITE_FAMILY_ORIGIN` (the staff build, for the redirect) and `VITE_STAFF_ORIGIN` (the family build, for wrongApp): `lib/http/env.ts`, `write-local-env.mjs` (plus the family dev origin in the local `WEB_ORIGIN`), `.env.example`, the e2e webServer env and the deploy build env. |
| `deploy-staging.yml` | Build `apps/family-web` with the same `VITE_*` values, upload it to `$DEST/family` (`chmod -R o+rX`, own step) BEFORE swapping `web`, a rollback swap (`family.old`). Only when `vars.VITE_FAMILY_ORIGIN` is set: curl the family host and check the server `WEB_ORIGIN` lists it before the staff build goes live; unset = skipped, so every deploy stays green before the go-live. |
| Host Caddy | A `family.ayatalbayan.com` site serving `$DEST/family` (SPA fallback to index.html) with the same headers as `app.`. CSP / Permissions-Policy must allow LiveKit `wss`, camera and microphone, and the `files.` host. Caddy is on the host and not in the repo: done on the VPS after the owner's go. |
| Supabase | No change: no `redirectTo`, and code sign-in is `verifyOtp`. Families sign in once more on the new host (sessions are per origin). |
| Web push | Same VAPID keys and `sw.js` (same-origin opens only); families subscribe on the family host. |
| Client tag | `WEB_CLIENT_TAG` as today (`web/<build>`); telling the two apps apart in usage counts is a follow-up. |

## 5. PR (one PR, two commits; no migrations)

1. **Prep:** `packages/web-kit` extracted with apps/staff-web consuming it (no behaviour change); the `setPasswordUrl` fix, the `WEB_ORIGIN` trim/refine; the config factories; the client-core sign-in move; knip / e2e-areas / turbo / ci wiring.
2. **apps/family-web:** the app, the family shell (bell and both bars), the routes, `/` → `/portal`, wrongApp, the schedule and student reports screens; the staff-side redirect and login link behind `VITE_FAMILY_ORIGIN`; the deploy upload, gated check and rollback; e2e: a third webServer on :5181 with its own Vite cache, the API `WEB_ORIGIN` list, and the family specs on the family host; `ar.json` / `en.json` keys.
3. **Go live (owner go, after the merge):**
   1. the Caddy site for `family.ayatalbayan.com` (SPA fallback; CSP / Permissions-Policy for LiveKit `wss`, camera, microphone and the `files.` host);
   2. the server `WEB_ORIGIN`: `https://app.ayatalbayan.com,https://family.ayatalbayan.com` (app. FIRST);
   3. the repository variable `VITE_FAMILY_ORIGIN=https://family.ayatalbayan.com`, then a deploy: the staff redirect turns on.

## 6. Owner decisions

1. **Host:** `family.ayatalbayan.com` (default).
2. **Parent report links already sent on WhatsApp (`/report/:publicId` on `app.`).** They keep working on `app.` with the code gate (families have no session there after the split); the family app also mounts the same report view for reports opened from the app or a push.
3. **«من يسجّل الدخول؟»** needs an API that answers several accounts for one number (open).
