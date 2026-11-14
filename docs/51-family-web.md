# 51 — Family web app (apps/family-web), split from apps/web

Owner 2026-11-14: «its a monorepo» / «why dont you just seperate them» / «go ahead and try to do the same for the web». The family mobile app becomes its own app (`apps/family`, docs/50 §7); the family web pages follow: their own web app in the monorepo, sharing code through a package, never a build variant of apps/web.

Read-only map + design + critique: workflow wf_8d9cbaae-4ef, against origin/develop e37b59c1d and origin/feat/family-portal-api 27d70cb41. Starts after PR #731 (portal API + web) and the apps/family split PR merge.

## 1. Target

- **Folder and stack.** `apps/family-web`, the same stack as apps/web: React 19, Vite, TanStack Router + Query, Tailwind 4, React Compiler. Package name `family-web`.
- **Host.** `https://family.ayatalbayan.com` (proposed; the owner confirms). `*.ayatalbayan.com` already resolves to the VPS, and the host Caddy issues TLS automatically (docs/09 L5).
- **Pages.** Docs/50 §6 with the canvas navigation (the bell at the top):
  - **Guardian bar:** الرئيسية · الجدول · أبنائي · حسابي, with reports inside each child.
  - **Student bar:** الرئيسية · الجدول · التقارير · حسابي.
  - **Paths:** `/login` (family sign-in only), `/portal` (home, then the child view), `/account`, and `/` → `/portal`.
  - The portal logic comes from `@ab/client-core` `people/portal/*` (#731); the web and both mobile apps use it.
- **Signed-link pages stay on `app.`:** `/report`, `/feedback`, `/join`, `/s`, `/m`, `/pay`. Meta fixed `app.` in the approved template buttons, and the API builds these links from the first `WEB_ORIGIN`.

## 2. Shared code: `packages/web-kit` (`@ab/web-kit`)

- **It exports SOURCE, not dist.** The React Compiler and `import.meta.env` need Vite to transform it. Both apps' Vite configs include it.
- **Contents.** Only what both apps use:
  - the UI primitives (`components/ui/*`) and the shell primitives the family shell needs (NOT `AdminLayout`, `MenuBar` or `SectionHome`, which link to `/admin`);
  - the tokens and `index.css`, with `@source "./"` so Tailwind sees the kit's classes;
  - the HTTP client binding and `lib/http/env.ts`, the i18n binding, the query client;
  - the auth session plus the sign-in kit as one unit (`auth/login/*`, `auth/reset/*`, `PhoneSignIn`, `FamilyPanel`): the deep imports stay inside the package;
  - web push subscribe/forget;
  - `ReportPage` (one component, mounted by both apps) and the classroom room component (families join inside the page).
- **apps/web imports these from the kit:** a move, no copies. `@ab/config` gets a Vite/Vitest config factory, so the two app configs are not clones.
- **jscpd** cross-app clones: zero.
- **CI coverage.**
  - `knip.json`, `tools/scripts/ci-checks/e2e-areas/{select,graph}.mjs` and `turbo.json` learn `apps/family-web` and `packages/web-kit`.
  - ci.yml gets family-web lint / typecheck / test / build the way web has them.

## 3. apps/web after the split

- **`/portal` and `/account` for a guardian or student.** In `beforeLoad`, BEFORE `requireRole`:
  1. `forgetWebPush` + `signOut` on `app.`;
  2. `location.replace(FAMILY_ORIGIN + path + search)`.
  - Guard: when `VITE_FAMILY_ORIGIN` is empty or equals the current origin, there is no redirect (dev, Vitest, e2e staff server; no reload loop).
  - So merging is safe before the host exists.
- **Staff `/login`.** The family tab becomes a link to the family host. A student code typed into the staff password form gets the same sign-out + redirect.
- **Installed `app.` icon on iOS.** Show a notice with the link instead of a silent jump, because iOS web push needs the Home Screen app.
- **A staff account on the family host.** A «wrongApp» notice with a link to `app.`, then sign out.

## 4. API and infra

| Item | Change |
|---|---|
| `WEB_ORIGIN` | The live list is in the server `.env` (env-merge skips an empty GitHub variable). Write the FULL list with `app.` FIRST and family last, no leading comma. `env.ts`: refine that the first entry is an http(s) URL. `main.ts:30`: trim inside the split. |
| `users.module.ts:39` | `setPasswordUrl` from `firstOrigin`, not the whole list. Merge and DEPLOY before the `WEB_ORIGIN` change (e2e `users-control.invite.spec.ts` depends on it). |
| Env plumbing | `VITE_FAMILY_ORIGIN` (the staff build, for the redirect) and `VITE_STAFF_ORIGIN` (the family build, for wrongApp): add them to `lib/http/env.ts`, `write-local-env.mjs` (plus the family dev origin in the local `WEB_ORIGIN`), `.env.example`, the Vitest env, the e2e webServer env and the deploy build env. |
| `deploy-staging.yml` | Build `apps/family-web` with the same `VITE_*` values, upload it to `$DEST/family` (`chmod -R o+rX`, own step id) BEFORE swapping `web`, add a rollback swap (`family.old`), and add a health check: curl the family host, and check the server `WEB_ORIGIN` contains it, before the staff redirect goes live. |
| Host Caddy | A `family.ayatalbayan.com` site serving `$DEST/family` (SPA fallback to index.html) with the same headers as `app.`. CSP / Permissions-Policy must allow LiveKit `wss`, camera and microphone, and the `files.` host. Caddy is on the host and not in the repo: done on the VPS after the owner's go. |
| Supabase | No change: no `redirectTo`, and code sign-in is `verifyOtp`. Families sign in once more on the new host (sessions are per origin). |
| Web push | Same VAPID keys and `sw.js` (same-origin opens only); families subscribe on the family host. The manifest `start_url` is `/portal`. |
| Client tag | `WEB_CLIENT_TAG` `family-web/<build>`, so usage counts tell the apps apart. |

## 5. PRs (after #731 and the apps/family split merge; no migrations)

1. **Prep:**
   - `packages/web-kit` extracted, with apps/web consuming it and no behaviour change;
   - the `setPasswordUrl` fix, the `WEB_ORIGIN` trim/refine, the config factory;
   - knip / e2e-areas / turbo / ci wiring for the new package.
2. **apps/family-web:**
   - the app, `FamilyShell` (bell and both bars), the routes, `/` → `/portal`, wrongApp;
   - the new الجدول (lessons query) and التقارير (student, history) screens;
   - the staff-side redirects behind `VITE_FAMILY_ORIGIN`, the deploy upload, health check and rollback;
   - e2e: a third webServer on :5181 with its own `cacheDir`, the API `WEB_ORIGIN` list in e2e, and `family-sign-in.spec.ts` + `support/people/family-portal.ts` moved to the family host;
   - `ar.json` / `en.json` keys.
3. **Go live (owner go):** the Caddy site, the server `WEB_ORIGIN`, then `VITE_FAMILY_ORIGIN` in the deploy env so the staff redirect turns on.

## 6. Owner decisions

1. **Host:** `family.ayatalbayan.com`? (default)
2. **Parent report links already sent on WhatsApp (`/report/:publicId` on `app.`).** Today they open with the session or a code gate. After the split, families have no session on `app.`, so they see the code gate. Default: keep them working on `app.` with the code gate, and also mount the same `ReportPage` in the family app for links opened from the app or push.
