# 27 — Code & folder-structure refactor plan (Phase 0, for owner approval)

Status: **proposal**. This change is docs only. No code moves until the owner approves §8.
Measured on `develop` @ `62d191f` (2026-10-25). Owner request, 2026-10-25: reusable, understandable code; small single-purpose functions and files; no crowded folders; more shared code; files grouped into feature folders and modules.

## 1. Goals and rules

| #   | Rule                                                                                                                                                                            | Enforced by (today → after refactor)                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | Max **150 lines** per file (blank lines and comments count)                                                                                                                     | `max-lines` ✅ (already)                             |
| 2   | Max **3 params** per function (the owner allows 4; we keep 3, the current lint). For more inputs, pass a typed options object                                                   | `@typescript-eslint/max-params` ✅ (already)         |
| 3   | Single responsibility: one component, service, query set or mapper per file                                                                                                     | review + rules 1–2                                   |
| 4   | **≈ 12 code files max per folder** (tests not counted) and ≈ 12 sub-folders max per folder                                                                                      | new `tools/scripts/folder-cap.mjs` in CI             |
| 5   | Feature = folder with sub-folders by sub-domain. It exposes a public `index.ts`                                                                                                 | new barrels                                          |
| 6   | Import another feature **only through its `index.ts`**. No deep imports                                                                                                         | `eslint-plugin-boundaries` / `no-restricted-imports` |
| 7   | Code used by 2+ apps lives in `packages/shared` (pure TS) or the new `packages/client-core` (shared by web and mobile: http client, query keys and query options, non-UI hooks) | jscpd threshold in CI                                |
| 8   | Tests stay next to their code (`*.test.ts`), and test splits follow the code splits                                                                                             | existing                                             |
| 9   | Refactor PRs are **pure moves** (no behaviour change), except the explicit dedup PRs in §5 Wave E                                                                               | review + full CI + e2e                               |

**Decision: Effect-TS is NOT adopted.** It would change the programming style across Nest, React and RN, it duplicates Nest DI, and it hurts readability for a small team. Instead, `packages/shared/src/async/` gets one shared `retry`/backoff helper, a small `Result<T, E>` (`ok`/`err`) type and error-code helpers. Today 5 call sites each have their own backoff: `google-sync/backoff.ts`, `whatsapp/send-plan.ts`, `whatsapp/message.worker.ts`, `report-pdf/report-pdf.job.ts` and `shared/messaging/wa.ts`.

## 2. Current state (measured)

### 2.1 Files per folder

All `.ts/.tsx/.js/.mjs` files; a file is a test if it matches `*.test|spec.*`. 303 folders hold code. **107 of them have more than 12 code files**: 2,719 code files and 1,878 tests.

| Root                                                      | code | test | folders > 12 |
| --------------------------------------------------------- | ---- | ---- | ------------ |
| apps/api/src                                              | 976  | 815  | 27           |
| apps/web/src                                              | 1265 | 755  | 36           |
| apps/mobile/src                                           | 871  | 547  | 31           |
| apps/mobile/app                                           | 130  | 0    | 0            |
| packages/shared/src                                       | 235  | 199  | 9            |
| tools/* (migrate, scripts, wa-stub, google-stub, livekit) | 148  | 83   | 4            |

The 25 worst folders (code / test):

| code | test | folder                  |     | code | test | folder                       |
| ---- | ---- | ----------------------- | --- | ---- | ---- | ---------------------------- |
| 78   | 93   | web/features/inbox      |     | 41   | 28   | web/components/ui            |
| 77   | 63   | api/modules/classroom   |     | 40   | 27   | web/features/settings/values |
| 75   | 92   | api/modules/whatsapp    |     | 38   | 38   | api/modules/lessons          |
| 68   | 71   | api/modules/booking     |     | 38   | 7    | mobile/assistants            |
| 59   | 59   | mobile/inbox            |     | 37   | 28   | api/modules/subscriptions    |
| 51   | 19   | api/modules/google-sync |     | 36   | 23   | mobile/ops                   |
| 50   | 28   | web/features/sales      |     | 36   | 18   | mobile/finance               |
| 49   | 35   | mobile/booking          |     | 36   | 0    | web/routes/admin             |
| 48   | 36   | web/features/booking    |     | 35   | 34   | api/modules/inbox            |
| 46   | 41   | web/features/schedule   |     | 35   | 16   | web/features/meetings        |
| 45   | 45   | web/features/classroom  |     | 35   | 16   | web/features/dashboard       |
| 45   | 31   | web/features/students   |     | 33   | 10   | mobile/users                 |
|      |      |                         |     | 29   | 28   | shared/messaging             |

The remaining 82 folders each have 13–33 code files. The full list is in §5, where every one of them is covered.

Crowded parents: `apps/api/src/modules` has 46 modules, `apps/web/src/features` 40 features, `apps/mobile/src` 39 folders, and `apps/api/src` 17 loose `env.*.ts` files. **No `index.ts` barrel exists in any of the 125 features/modules.**

### 2.2 Duplicated code — `jscpd --min-lines 8` (tests, node_modules and dist ignored)

| Scope                                      | clones       | dup lines       |
| ------------------------------------------ | ------------ | --------------- |
| TS/TSX/JS code only                        | 184          | 2,352           |
| **web ↔ mobile**                           | **45**       | **801**         |
| api ↔ mobile                               | 1            | 12              |
| inside web / inside mobile / inside api    | 57 / 55 / 29 | 765 / 684 / 460 |
| SQL migrations (historic, **not touched**) | 55           | 1,388           |

Top cross-app clones: `users/validation.ts` (66), `users/edit-form.ts` (54), report fixtures (51), `assistants/terms-form.ts` (35+17+16+12), earnings fixtures (34+17), `activity-format.ts` (25), `lib/api.ts` (25+19), `qualification-form.ts` (20+11), `create-form.ts` (19), `public-config.ts` (18), `use-autosave.ts` (16), `users/api.ts` (16), `RolePicker`, `lead-sort`, `sessions`, `work-text`, `recording-format`.

### 2.3 Domain logic duplicated between web and mobile

The low-level helpers are already shared: phone, time zone, money amount, `StatusStyle`, messaging params, the permission catalogue and the public-config key. What is still copied is the layer above them:

| What                                                                                                                    | web                                                                | mobile                                                   | ≈ dup lines      | Target                                  |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- | ---------------- | --------------------------------------- |
| Users: api, create/edit forms, validation, errors                                                                       | features/users/*                                                   | users/*                                                  | 161              | client-core/users + shared/users        |
| Pay mutations (upload receipt, then send with an idempotency id) × 5                                                    | teacher-earnings, assistants, payments, inbox/sales-money, payouts | earnings, assistants, payments, sales-subscribe, finance | ≈ 175 (semantic) | client-core/payments                    |
| Test fixtures                                                                                                           | assistants, teacher-earnings, reports, inbox                       | same                                                     | 205              | shared/testing                          |
| Report entry, autosave, report api                                                                                      | features/reports                                                   | teacher/report                                           | 61               | client-core/reports                     |
| Assistant terms form                                                                                                    | features/assistants                                                | assistants                                               | 59               | client-core/assistants                  |
| Lead qualification form                                                                                                 | features/inbox                                                     | inbox/qualification                                      | 55               | shared/sales                            |
| Week and Riyadh-day math (addDays, weekStart, riyadhToday…)                                                             | schedule/tz, dashboard, sales, classroom                           | calendar/week, sales-text, payments/format               | ≈ 55             | shared/time-zone                        |
| Booking draft and request bodies, reschedule and edit-time bodies                                                       | booking/draft, schedule/*                                          | booking/*, reschedule, edit-time                         | ≈ 46             | client-core/booking + shared/lessons    |
| Template param prefill (mobile keeps it inside `TemplateForm.tsx`)                                                      | inbox/template-params                                              | inbox/TemplateForm                                       | ≈ 40             | shared/messaging/params                 |
| `usePermissions` / `canDo` (**the two behave differently**: mobile allows everything while `/auth/me` is still loading) | auth/use-permissions                                               | auth/use-permissions                                     | ≈ 25             | client-core/auth                        |
| `ApiError` / `apiFetch` (mobile's copy says "same shape as web on purpose")                                             | lib/api.ts                                                         | lib/api.ts                                               | 26               | client-core/http                        |
| Status styles (commission, trial outcome), error-text maps, lead-sort, kpis, sessions                                   | various                                                            | various                                                  | ≈ 70             | shared/status-style, client-core/errors |

Other measurements:

- 164 file basenames exist in both apps.
- 104 mobile files mention the web version in a comment.
- 108 API paths are called by both apps.
- Query keys: web defines 258 and mobile 182. They follow **different conventions**: web mostly writes literal arrays, mobile uses `pathKey`/`listKey`. Only 7 key prefixes match, so the two apps invalidate different keys for the same endpoint.

### 2.4 Dead code — `knip` (it ran in under 10 min; it reported issues)

| Kind                             | count     | Note                                                                                     |
| -------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| Unused files                     | 9         | Some are false positives: e2e setup and design/brand tools need entries in a `knip.json` |
| Unused exports                   | 194       | Real candidates for deletion (PR E-last)                                                 |
| Unused exported types            | 641       | Mostly `export type` used in one file only; drop the `export`                            |
| Unused deps / devDeps / unlisted | 2 / 2 / 1 | Font packages in the api; `react-test-renderer`; `expo-system-ui` unlisted               |

### 2.5 Near-limit files, 3-param functions, deep imports

| Metric                                                        | api     | web     | mobile  | shared | tools |
| ------------------------------------------------------------- | ------- | ------- | ------- | ------ | ----- |
| Code files of 130–150 lines                                   | 39      | 12      | 9       | 11     | 8     |
| Test files of 130–150 lines                                   | 25      | 8       | 10      | 1      | 8     |
| Functions with exactly 3 params (not counting constructors)   | 203     | 73      | 53      | 29     | –     |
| Deep cross-feature imports (into another feature's internals) | **731** | **660** | **790** | –      | –     |

- The only file over 150 lines is `packages/db/src/types.ts` (4,886, generated, exempt).
- 3-param hotspots: api whatsapp 23, api classroom 21, api users 19, web classroom 14, web inbox 12.
- **Api: 309 of the 731 deep imports point at two misplaced shared helpers**: `teachers/http` (174) and `scheduling/errors` (135). Moving them to `common/http` removes ~42 % of api deep imports.
- Most reached-into modules and features: api `teachers` (235), api `scheduling` (193), mobile `more` (167), mobile `payments` (124), web `subscriptions` (102), web `schedule` (88).

## 3. Target trees

Numbers are code-file counts per folder (all ≤ 12). `root` = what stays beside `index.ts` (and `*.module.ts` for the api). Existing sub-folders are kept.

### 3.1 apps/api/src

```
src/
  app.module.ts  main.ts  openapi.ts
  config/env/{core, whatsapp, google, livekit, recording, web-push, numbers}   # 17 loose env.*.ts
  common/{http (← teachers/http + scheduling/errors), async-adapters, activity, audit, auth,
          config-store/{store,boundaries,io}, push/{expo,web,dispatch}, …}
  modules/                                    # 46 modules → 7 domain folders (§8 decision D2)
    messaging/  whatsapp, webhook, inbox, chat-lists, numbers, messaging-jobs, notification-rules,
                push, reminders, follow-ups
    sales/      leads, sales, sales-money, sales-registration, job-applicants
    teaching/   booking, scheduling, lessons, classroom, student-recordings, lesson-rating, feedback
    reporting/  reports, report-pdf, dashboard, exports
    people/     students, guardians, teachers, teacher-students, users, roles, me
    finance/    subscriptions, payments, payouts, invoices, receivables, expenses, pricing, fx,
                teacher-earnings, assistant-pay
    platform/   google-sync, translations, health
```

| Module                                                                                                                                                                                                                                                   | Target sub-tree (code files)                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| whatsapp                                                                                                                                                                                                                                                 | root(9: module, settings, types, client, client-factory, live-client, fakes, test-app) · drivers/meta(6) · drivers/kapso(2) · drivers/crm(5) · gate(6) · lines(4) · numbers(5) · messages(10) · sender(9) · templates/catalog(9) · templates/sync(10) |
| classroom                                                                                                                                                                                                                                                | root(8) · assistants(4) · internal-meetings(8) · join(12) · livekit(8) · meetings/invites(11) · meetings/schedule(6) · moderation(9) · recordings(6) · student-link(5)                                                                                |
| booking                                                                                                                                                                                                                                                  | root(7: module, controllers, dto, errors, settings, fakes) · core(12) · plan(6) · invoice(3) · makeup(3) · course-change(11) · instant(4) · sales/booking(4) · sales/course(5) · teacher(6) · trial-date(7)                                           |
| google-sync                                                                                                                                                                                                                                              | root(6) · admin(6) · oauth(5) · http(9, incl. backoff → uses shared retry) · map(6) · sync(7) · writers/{calendar(3), drive(3), sheets(6)}                                                                                                            |
| lessons                                                                                                                                                                                                                                                  | root(7) · store(6) · status(7) · proposals(3) · reschedule(6) · time-edit(7) · teacher-me(2) · overview(existing)                                                                                                                                     |
| subscriptions                                                                                                                                                                                                                                            | root(12) · alerts(6) · money(7) · student-lifecycle(9) · trial(3)                                                                                                                                                                                     |
| inbox                                                                                                                                                                                                                                                    | root(6) · threads(7) · sales-threads(2) · teacher-threads(4) · people(2) · reads(3) · send(6) · files(5)                                                                                                                                              |
| 20 modules with 13–28 files (reports, webhook, sales, users, assistant-pay, scheduling, numbers, notification-rules, report-pdf, dashboard, feedback, student-recordings, payments, sales-money, reminders, me, teacher-earnings, config-store, push, …) | 2–3 sub-folders each, split by file prefix (e.g. `webhook/{parse, inbound, status}`, `reports/{submit, read, pdf-queue}`)                                                                                                                             |

Nest: each `*.module.ts` stays at its module root and imports controllers from their sub-folders. A sub-folder becomes its own Nest child module only if it is over 12 files after the split. DI tokens and module boundaries do not change.

### 3.2 apps/web/src

```
src/
  app/ (main, router, providers)   lib/{http→client-core, query, dates, test}   styles/
  components/ui/{form(12), overlay(8), layout(10), display(11)}   components/shell/{nav, header, rail}
  routes/ (TanStack file routes, nested; pathless groups keep URLs unchanged)
    admin/{index, settings/(6), students/(4), teachers/(3), assistants/(2),
           (finance)/(8), (people)/(5), (ops)/(7)}
  features/<domain>/<feature>/{index.ts, components/, hooks/, api/, lib/}   # 40 → 7 domains, as for api
```

| Feature                                                                                                                  | Target sub-tree (code files)                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| inbox                                                                                                                    | root(1) · api(2) · shared(3) · composer/{components(7), lib(7)} · messages/{components(8), lib(5)} · threads/{list(11), pane(10)} · lists(existing) · lead(8) · lead/qualification(5) · sales(9) · sales-money(existing, → 3 sub-folders) · testing(2) |
| sales                                                                                                                    | root(6) · teachers(12) · students(6) · money(7) · subscriptions(5) · schedule(6) · live(3) · registration(5)                                                                                                                                           |
| booking                                                                                                                  | root(9) · draft(7) · steps/{who(6), package(6), slots(7), review(5)} · invoice(8) · course-change · trial-date(existing → 2 sub-folders)                                                                                                               |
| schedule                                                                                                                 | root(9) · grid(9) · lesson(9) · edit-time(9) · reschedule(10)                                                                                                                                                                                          |
| classroom                                                                                                                | api(4) · room/{components(10), livekit(11)} · join(9) · student-link(4) · sessions(7) · board, kick, mute, recordings, share, stage (existing)                                                                                                         |
| students                                                                                                                 | root(2) · list(12) · create(6) · duplicates(7) · profile(9) · recordings(9)                                                                                                                                                                            |
| settings/values                                                                                                          | root(11) · sheet(7) · conflicts(3) · description(8) · hooks(7) · lib(4) · cells, editors, rows (existing)                                                                                                                                              |
| meetings                                                                                                                 | root(4) · internal(5) · instant(2) · scheduled(5) · rows(7) · invitees(12)                                                                                                                                                                             |
| dashboard                                                                                                                | root(6) · shared(4) · today(9) · work(5) · finance(5) · funnel(6)                                                                                                                                                                                      |
| 20 others with 13–33 files (teachers, assistants, users, reports, google-sync, numbers, templates, payments, account, …) | components/ · hooks/ · api/ · lib/, each ≤ 12                                                                                                                                                                                                          |

### 3.3 apps/mobile

```
app/                       # expo-router: route files only (stay thin, import screens from src/)
src/
  core/{lib, ui/{primitives, form, feedback, layout}, nav, push, test, theme}
  sales/{app, course, money, subscribe, registration-check}          # today 5 sibling folders
  finance/{expenses, payouts, summary, invoices, money, payments, earnings, pricing}
  teaching/{booking, trial-date, reschedule, edit-time, calendar, classroom, live, meetings, today, teacher}
  people/{students, student-file, users, assistants, assistant-app, account, auth}
  messaging/{inbox, notifications}   ops/{activity, dashboard, reports, google-sync, numbers, settings, comms, notif-rules, values}
  more/  feedback/  subscribe/
  <feature>/{index.ts, screens/, components/, hooks/, api/}
```

| Feature                    | Target sub-tree (code files)                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| inbox                      | screens(3) · thread/{components(10), hooks(7)} · messages(12) · composer(7) · threads-list(6) · leads(existing + 7) · sales(3) · shared(4) · qualification, rating, subscription, lists (existing) |
| booking                    | screens(2) · trial/{components(12), lib(10)} · makeup(7) · invoice(9) · shared(7) · testing(2)                                                                                                     |
| assistants                 | screens(2) · list(6) · commission(7) · terms(5) · statements/{components(8), hooks(6)} · api(4)                                                                                                    |
| ops                        | shared(3) · activity(5) · dashboard(8) · reports(5) · google-sync(4) · numbers(5) · settings(5) · comms, notif-rules, values (existing)                                                            |
| finance                    | shared(7) · expenses(9) · payouts(10) · summary(8) · invoices(2)                                                                                                                                   |
| 26 others with 13–33 files | screens / components / hooks / api                                                                                                                                                                 |

`more/` is reached into 167 times. Its shared parts (schedule, settings rows) move to `core/` or to their owning feature's `index.ts`.

### 3.4 packages

```
packages/shared/src/                      # pure TS, no React
  async/{retry, result, errors}           # NEW (P1)
  format/{time, money, phone, digits, plural}  time-zone/{zones, week, riyadh-day}
  messaging/{params, render, wa, templates, numbers}   money/{amount, schemas/(split), state}
  settings/{domains (existing), catalogue, values}   schemas/{people, lessons, sales, money}
  status-style/  permissions/  sales/  lessons/  students/  testing/ (shared fixtures)  i18n/
packages/client-core/src/                 # NEW: shared by web and mobile; react + @tanstack/react-query as peers; no DOM/RN imports
  http/{api-error, api-fetch (token getter + client tag injected)}  keys/ (one key convention)
  auth/ (usePermissions, one behaviour)  users/  payments/ (pay-with-receipt mutation)
  reports/ (entry, autosave)  booking/ (draft, request body)  assistants/  config/ (public-config)
  errors/ (error-text maps)
```

## 4. Tooling (written in P2, used by every move PR)

| Tool                                                             | Purpose                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tools/scripts/move-module.ts` (ts-morph)                        | Reads a move map (`refactor/moves/<pr>.json`: from → to). Moves files together with their tests and `__snapshots__`. Rewrites every import, re-export and `vi.mock`/`jest.mock` string, and `@/` alias paths. Writes `index.ts` barrels. Idempotent: run twice = no diff |
| `tools/scripts/folder-cap.mjs`                                   | Fails CI when a folder has more than 12 code files or more than 12 sub-folders (allow-list shrinks per PR)                                                                                                                                                               |
| `eslint-plugin-boundaries` (or `no-restricted-imports` patterns) | Blocks `features/x/**` → `features/y/<internal>`; only `features/y` (its index) is allowed                                                                                                                                                                               |
| jscpd in CI                                                      | Fails above the baseline; the baseline is lowered after each dedup PR                                                                                                                                                                                                    |
| knip in CI                                                       | Runs with a `knip.json` (entries for e2e, design tools); new unused exports fail                                                                                                                                                                                         |

## 5. Move list — small PRs, in order

Every move PR is created by the codemod, contains **pure moves only**, ≤ ~60 files, one module group per PR, and is verified with `pnpm turbo lint typecheck test e2e` (full CI) plus a check that `git diff -M` shows only renames and import-line changes. Size: S ≤ 30 files, M ≤ 60, L = 60–70 (a module kept whole).

### Wave 0 — foundations

| PR  | Scope                                                                                                                                                                                                                       | Files                        | Risk | Verify                                     | Size |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---- | ------------------------------------------ | ---- |
| P1  | `shared/async/{retry,result,errors}` (+ tests ≥ 80 %). `packages/client-core` skeleton (package.json, tsconfig, vitest, eslint, an empty `http/`). Wire the 5 backoff sites to `retry` (same delays and caps, tests pinned) | ~12 new, 5 edited            | low  | unit tests for exact delays; full CI       | S    |
| P2  | `move-module.ts` codemod + tests; `folder-cap.mjs` in **report-only** mode; move `teachers/http` + `scheduling/errors` → `common/http` (removes 309 deep imports); `env.*.ts` → `config/env/`                               | ~25 moved, ~320 import lines | low  | full CI + e2e; codemod run twice = no diff | M    |

### Wave A — api (≈ 1,390 files in 27 crowded folders → 24 PRs)

| PR    | Module group (sub-folders)                                                                                 | Files moved                                      | Risk                                      |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| A1–A3 | whatsapp ① drivers, gate, lines, numbers ② messages, sender ③ templates                                    | ≈ 60 / 50 / 57                                   | med (sender/worker paths)                 |
| A4–A6 | classroom ① join, livekit, student-link ② meetings, internal-meetings ③ assistants, moderation, recordings | ≈ 55 / 45 / 40                                   | med                                       |
| A7–A9 | booking ① core, plan, invoice, makeup ② course-change, instant, teacher ③ sales, trial-date                | ≈ 50 / 45 / 44                                   | med                                       |
| A10   | google-sync (whole)                                                                                        | ≈ 70                                             | low (L)                                   |
| A11   | lessons (whole)                                                                                            | ≈ 76 → split by A11a store/status, A11b the rest | low                                       |
| A12   | subscriptions (whole)                                                                                      | ≈ 65 (L)                                         | low                                       |
| A13   | inbox (whole)                                                                                              | ≈ 69 (L)                                         | low                                       |
| A14   | webhook                                                                                                    | 51                                               | med (inbound path)                        |
| A15   | scheduling + numbers                                                                                       | 87 → 2 PRs                                       | med (most reached-into)                   |
| A16   | reports + report-pdf (snapshots move with tests)                                                           | 83 → 2 PRs                                       | low                                       |
| A17   | sales + sales-money                                                                                        | 71 → 2 PRs                                       | low                                       |
| A18   | users + assistant-pay                                                                                      | 69 → 2 PRs                                       | low                                       |
| A19   | notification-rules + dashboard + feedback                                                                  | 90 → 2 PRs                                       | low                                       |
| A20   | payments + reminders + me + student-recordings + teacher-earnings + common/config-store + common/push      | 6 × ≈ 25 → 3 PRs                                 | low                                       |
| A21   | **Domain grouping** of `modules/` into 7 folders (§3.1). Whole-module moves only                           | ≈ 1,800 renames, 0 content                       | med (big rename) — only if D2 is approved |
| A22   | api `index.ts` barrels + eslint boundaries (api) set to **error**                                          | ~46 new                                          | low                                       |

### Wave B — web (≈ 1,620 files in 36 crowded folders → 27 PRs)

| PR    | Feature group                                                                                  | Files moved            | Risk                                                                  |
| ----- | ---------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------- |
| B1    | components/ui → form, overlay, layout, display                                                 | 69 (L)                 | low (wide import rewrite)                                             |
| B2    | components/shell + components/settings + lib                                                   | 82 → 2 PRs             | low                                                                   |
| B3    | routes/admin nesting + pathless groups (routeTree.gen regenerated)                             | 36 + gen               | **med**: verify that every URL is unchanged (e2e + a route-list diff) |
| B4–B6 | inbox ① composer, messages ② threads, lead, qualification ③ sales, sales-money, lists, testing | ≈ 60 / 60 / 75 → 4 PRs | med (biggest feature)                                                 |
| B7–B8 | booking ① steps, draft ② invoice, trial-date, course-change                                    | ≈ 55 / 50              | med                                                                   |
| B9    | schedule                                                                                       | 87 → 2 PRs             | med                                                                   |
| B10   | classroom (+ board)                                                                            | 110 → 2 PRs            | med                                                                   |
| B11   | sales                                                                                          | 78 → 2 PRs             | low                                                                   |
| B12   | students                                                                                       | 76 → 2 PRs             | low                                                                   |
| B13   | settings/values + settings/pages/communications                                                | 81 → 2 PRs             | low                                                                   |
| B14   | meetings + dashboard                                                                           | 102 → 2 PRs            | low                                                                   |
| B15   | teachers + teacher + teacher-earnings                                                          | ≈ 82 → 2 PRs           | low                                                                   |
| B16   | assistants + users + account                                                                   | 109 → 2 PRs            | low                                                                   |
| B17   | reports + google-sync + numbers + templates                                                    | 167 → 3 PRs            | low                                                                   |
| B18   | payments + subscriptions + pricing + leads + feedback + integrations + notification-rules      | ≈ 170 → 3 PRs          | low                                                                   |
| B19   | **Domain grouping** of `features/` (D2) + web barrels + boundaries **error**                   | renames + ~40 new      | med                                                                   |

### Wave C — mobile (≈ 1,183 files in 31 crowded folders → 20 PRs). JS-only: OTA-safe

| PR    | Feature group                                                                         | Files moved       | Risk                    |
| ----- | ------------------------------------------------------------------------------------- | ----------------- | ----------------------- |
| C1    | ui + lib → `core/`                                                                    | 76 → 2 PRs        | low (wide rewrite)      |
| C2–C3 | inbox ① thread, messages, composer ② threads-list, leads, sales, lists, qualification | ≈ 70 / 88 → 3 PRs | med                     |
| C4    | booking + trial-date                                                                  | 117 → 2 PRs       | med                     |
| C5    | `sales/*` family (sales, sales-course, sales-money, sales-subscribe)                  | 130 → 3 PRs       | low                     |
| C6    | `finance/*` family (finance, money, payments, earnings)                               | 159 → 3 PRs       | low                     |
| C7    | ops (+ values, notif-rules)                                                           | 112 → 2 PRs       | low                     |
| C8    | assistants + users + account                                                          | 114 → 2 PRs       | low                     |
| C9    | more (break up: shared parts → core) + teacher + teacher/report                       | 101 → 2 PRs       | med (most reached-into) |
| C10   | calendar, classroom, meetings, edit-time, today, students, student-file               | ≈ 210 → 4 PRs     | low                     |
| C11   | mobile barrels + boundaries **error**; `app/` route files only import feature indexes | ~39 new           | low                     |

### Wave D — packages and tools (≈ 400 files → 7 PRs)

| PR  | Scope                                                                                                                     | Files       | Risk                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------- |
| D1  | shared root (loose phone, arabic, time-zone, plural… → `format/`, `time-zone/`) — package exports kept through `index.ts` | 37          | low                                     |
| D2  | shared messaging + money + schemas                                                                                        | 128 → 3 PRs | low                                     |
| D3  | shared settings (+ domains) + notifications + lessons + sales                                                             | 134 → 2 PRs | low                                     |
| D4  | tools/scripts → {seed, calendar, ci-checks, env}; tools/migrate/src/{plan, sources}; tools/wa-stub/src                    | 105 → 2 PRs | low (CI scripts: update workflow paths) |

### Wave E — dedup into shared / client-core (behaviour-preserving extractions, not pure moves)

| PR  | Extraction (from §2.3)                                                                                        | ≈ lines removed | Risk    | Verify                                         |
| --- | ------------------------------------------------------------------------------------------------------------- | --------------- | ------- | ---------------------------------------------- |
| E1  | client-core/http + keys: one `apiFetch`, **one query-key convention** (fixes mismatched invalidation)         | 26 + key churn  | **med** | both apps' tests + e2e; key-invalidation tests |
| E2  | client-core/auth: one `usePermissions`. **Owner choice**: the mobile "allow while loading" behaviour vs web's | 25              | med     | unit tests for both states                     |
| E3  | client-core/users + shared/users                                                                              | 161             | low     | moved tests + parity                           |
| E4  | client-core/payments: one pay-with-receipt + idempotency mutation (5 call sites per app)                      | ≈ 175           | med     | idempotency tests, e2e pay journeys            |
| E5  | client-core/reports (entry, autosave) + booking draft/body + assistants terms + shared/sales qualification    | ≈ 220           | med     | report + booking e2e                           |
| E6  | shared/time-zone week and Riyadh-day math; shared/messaging template-param prefill; status styles; error maps | ≈ 165           | low     | unit ≥ 80 %                                    |
| E7  | shared/testing fixtures (tests only)                                                                          | 205             | low     | tests                                          |
| E8  | knip clean-up: 194 unused exports, unused deps; drop `export` from 641 file-local types                       | —               | low     | full CI                                        |

### Wave F — CI guards (last)

| PR  | Guard                                                                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | `folder-cap.mjs` → **error** (empty allow-list) · jscpd gate (≤ the new baseline, cross-app clones = 0 for non-fixtures) · `eslint-plugin-boundaries` error in all apps · knip in CI · a `CLAUDE.md` + `docs/04-architecture.md` update with the new trees and rules |

**Totals:** ≈ 85 PRs, almost all codemod-generated (Waves 0–D ≈ 77, E 8, F 1). Each takes 15–30 min of review, because the diff is renames only. Throughput ≈ 3–5 PRs per day → about 4–5 weeks alongside feature work.

## 6. Risks and mitigations

| Risk                                               | Mitigation                                                                                                                                                                          |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Merge conflicts with feature work                  | **Freeze per module** while its PR is open (hours, not days). The move map is committed, so an open feature branch re-runs `move-module.ts` and its imports are fixed automatically |
| Hidden behaviour change in a "pure move"           | CI check: `git diff -M100%` shows only renames, import, export and barrel lines; any other hunk fails the PR. Full `lint typecheck test e2e`                                        |
| Mobile OTA must stay JS-only                       | Moves change no native config. `tools/scripts/native-changes.mjs` must report "none" on every C-PR; `app.json` and plugins are untouched                                            |
| DB migrations                                      | `packages/db/supabase/**` is **never touched**; SQL clones stay as history                                                                                                          |
| Web route moves change URLs                        | Only pathless groups and `route.tsx` layouts. The generated route-list diff must show the same URL set; e2e journeys run                                                            |
| Barrels create import cycles / bigger bundles      | Barrels export only the public API. `import/no-cycle` is enabled. Vite code-splitting is checked by comparing build size before and after (B-PRs)                                   |
| Test mocks by path (`vi.mock('…')`)                | The codemod rewrites mock specifiers; tests prove it                                                                                                                                |
| CI path filters (`.github/workflows/*` `paths:`)   | Updated in the same PR as the move (D4, C-PRs)                                                                                                                                      |
| Wave E changes behaviour (query keys, permissions) | Kept separate from the moves; each has an explicit test of the old behaviour and an owner decision (E2)                                                                             |
| Coverage thresholds / globs by path                | Vitest/Jest configs are updated by the codemod's path map                                                                                                                           |

## 7. What does NOT change

The stack (no Effect-TS), the DB schema and migrations, the API routes and contracts, URLs, the Arabic UI strings (`ar.json` keys), the rule of 3 params max, the rule of 150 lines max, and how tests are written.

## 8. What the owner approves

| #   | Decision                                                                                                                       | Recommendation                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| D1  | Rules in §1: ≈ 12 code files and ≈ 12 sub-folders per folder, barrels, import only through a feature's index, 3 params (not 4) | ✅ approve                                             |
| D2  | Top-level **domain grouping** (api 46 modules, web 40 features, mobile 39 folders → 7 domains each)                            | ✅ approve. Without it the parent folders stay crowded |
| D3  | New `packages/client-core` shared by web and mobile                                                                            | ✅ approve                                             |
| D4  | Effect-TS rejected; use shared `retry` / `Result` / error helpers instead                                                      | ✅ approve                                             |
| D5  | The PR order in §5 and the per-module freeze while a move PR is open                                                           | ✅ approve                                             |
| D6  | E2: the single `usePermissions` behaviour while `/auth/me` loads: deny (web) or allow (mobile)                                 | deny (safer)                                           |
| D7  | Throughput: ≈ 85 small PRs (≈ 4–5 weeks), or fewer, larger PRs (one per module, up to ~170 files)                              | small PRs                                              |

**Owner decisions, 2026-10-25:** D1–D5 approved as recommended (including the domain grouping, D2). D6: hide actions until `/auth/me` has loaded (deny, as web does today). D7: small PRs (≤ ~60 files each). Phase 1 starts after the feature PRs that are open on 2026-10-25 have merged.
