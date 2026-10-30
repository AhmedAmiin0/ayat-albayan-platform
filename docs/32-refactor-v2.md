# 32 — Refactor v2: rules, numbers, lanes (approved by the owner 2026-10-30, recommended decisions D1–D8)

Status: **draft for owner approval** (§5). Builds on docs/27 (lanes 0 and A–F done, f1 #292) and the guards it left (`refactor/README.md`: `eslint-suppressions.json` per package, `refactor/folder-cap/*.json`, `refactor/guards/{jscpd,knip}.json`).
Measured read-only on `origin/develop` @ `012ffa06` (2026-10-30): a git-archive export plus AST and grep scans. No pnpm, tsc, eslint or tests were run. Since then develop moved to `384a51ac`: #390 (chat PDF preview) merged with +67 files, one more `*.queries.ts` (127), new `inbox/files/pdf/` (api) and `inbox/messages/photo/Pdf*` (mobile). Each table names its counter. Counts from different counters are not compared (docs/27 §2.5 counted 3-param functions another way).

Owner request, 2026-10-30: «review and refactor all the project / key roles files cannot pass 150 line maximum / functions have 3 or 4 params at most / try to make each function/method simple and make small single logic / write a clean dry solid code / make use of turbo repo and take the code that could be shared between frontend backend and mobile in small packages with its test / group the files in more folder structure / dont use queieres use repos / try not to use useeffect as we are using react 19 compiler».

## 0. Request → answer

| Owner ask | Today | Where |
|---|---|---|
| Files ≤ 150 lines | Lint passes (0 linted files over 150), but only because lines run up to 219 chars. Formatted at the repo's own prettier width (100), **385 files** pass 150 | R1, S7, D7 |
| Functions ≤ 3–4 params | Lint passes (0 linted functions with 4+). The only 3 violations sit in the unlinted `tools/scripts`. The cap of 3 pushed 17 Nest classes to property injection and 21 «deps» bag files | R2, D1 |
| Small single-purpose functions | Not enforced: `complexity` is a warning and CI runs `eslint .` without `--max-warnings 0`. No function-length or depth rule. 497 non-test functions > 40 lines, 168 over complexity 10 | R3, lane S |
| Clean, DRY, SOLID | jscpd 162 clones / 1,860 lines / 25 cross-app. 39 hooks copied web↔mobile. 22 of 125 repository classes inject non-DB services. 7 god classes | R4, lanes R, K, S |
| Turborepo + small shared packages with tests | One `@ab/shared` (≈ 306 files, 27 folders, 7 folder cycles) + `@ab/client-core`. No turbo task sets `inputs` | §4, lane K, D4 |
| More folder structure | mobile `src/` has 35 ungrouped top dirs. 8 folders allow-listed over the cap, 57 at exactly 12. `e2e/tests` holds 181 flat specs | R6, lane M |
| Repos, not queries | 127 `*.queries.ts` (api) + 21 `*queries.ts` hook files (mobile) | R8, lane R, D2 |
| No useEffect, React 19 compiler | **The premise does not hold.** Web is on React 18.3.1. The React Compiler is off in both apps (mobile is React 19.2.3). 172 effects: web 85, mobile 87 | R9, R10, lane X, D3 |

## 1. Rules as checks

Every new rule lands with a one-time baseline: `eslint --suppress-rule <rule>` per package writes into the existing `eslint-suppressions.json` (today it holds only `ab/module-boundaries`). Counts may only go down, and a new offender fails CI. No new tool. Flat config replaces a rule's options instead of merging them, so the new `no-restricted-imports` / `no-restricted-syntax` entries are composed with the blocks already in `apps/api/eslint.config.mjs` and `apps/mobile/eslint.config.js`.

| # | Rule | Check | Stays exempt | Baseline → target |
|---|---|---|---|---|
| R1 | ≤ 150 lines per file (blank lines and comments count) | `max-lines 150` (already) **+ `max-len 100`** (`ignoreStrings`, `ignoreTemplateLiterals`, `ignoreUrls`, `ignoreRegExpLiterals`). Then `prettier --check` per package once its long-line count is 0 | `packages/db/src/types.ts` (generated, 5,822 lines), `**/*.gen.ts` (`routeTree.gen.ts`, 1,752), JSON (`ar.json` 7,247 lines) | max-len suppressions → 0 · 385 files over 150 after formatting → 0 |
| R2 | ≤ 3 params per function, ≤ 4 per constructor (Nest DI), **D1** | `@typescript-eslint/max-params 4` + `no-restricted-syntax` `:matches(:function, TSDeclareFunction, TSFunctionType)[params.length>3]:not(MethodDefinition[kind="constructor"] > FunctionExpression)`. More inputs: a typed options object | none (tests included) | 0 → 0 functions · 17 property-injection classes + 21 bag files → 0 |
| R3 | Small single-purpose functions | `complexity` warn → **error 15**, later 10 · `max-lines-per-function 50` (`skipBlankLines`, `skipComments`) · `max-depth 3` | test files for `max-lines-per-function` only (describe/it blocks) | suppressions → 0 |
| R4 | DRY | `guard:dup` jscpd baseline (fails on any change in either direction; lowered with `--write` in the PR that removes clones) | fixtures | 162 / 1,860 / 25 → 0 cross-app outside fixtures |
| R5 | No dead code | `guard:knip` baseline (same both-direction gate) | — | 286 → shrink |
| R6 | ≤ 12 code files and ≤ 12 sub-folders per folder | `folder-cap.mjs --strict` (already) **+ `e2e` in `appRoots`** | the allow-lists (shrink per PR) | 8 allow-listed → 0 |
| R7 | Package and feature boundaries | `ab/module-boundaries` (already) · an acyclic folder/package check in `tools/scripts/ci-checks` · `no-restricted-imports '@ab/shared'` outside `apps/*` (tools and new packages import the specific package) | the `@ab/shared` facade inside apps (D4) | 2,031 suppressions → 0 · 7 cycles → 0 |
| R8 | Data access only in repositories, **D2** | CI line fails on any `*queries.ts` file or `class \w+Queries` · `no-restricted-imports` of `common/db/db.module` outside `*.repo.ts`, `common/db/**` and the adapters · client: no `apiFetch`/`apiSend` import in `*.tsx` | adapters: `*.supabase.ts`, `account.auth.ts`, `common/auth/auth-users.ts`, `common/storage/storage.service.ts`, `web-push.sender`, `expo-deliver`, `numbers.secrets.ts` (Vault), `limit-store.db.ts`; `*.queries.ts` until r16 | 127 + 21 files → 0 · 55 db.module importers → 0 · `.tsx` with http: web 10, mobile 22 → 0 |
| R9 | No raw effects | `no-restricted-imports` `react` `importNames: ['useEffect', 'useLayoutEffect']` + `no-restricted-syntax` for `React.useEffect`. Allowed only in hook files under `packages/client-hooks/src/**`, `apps/web/src/lib/dom/**`, `apps/mobile/src/core/hooks/**` and a feature's own `effects/` folder (LiveKit room, whiteboard canvas, expo-video). After the compiler is on: the same rule for `useMemo`, `useCallback`, `memo` | those folders | 172 effects → ≈ 95, all in hook files, 0 in components · 193 memo sites → measured exceptions only |
| R10 | React Compiler on | web `vite.config.ts` compiler preset · mobile `app.json` `experiments.reactCompiler`. Lint already runs the compiler rules as errors (`react-hooks` 7.1.1 `recommended-latest`, 0 react-hooks suppressions) | — | off / off → on / on |
| R11 | Everything is linted | `tools/scripts` gets an `eslint.config.js` and a `"lint"` script (turbo skips it today) · `docs/design/brand/tools/*.mjs` (5 files) linted | — | 2 unlinted packages → 0 |
| R12 | Absolute imports (owner 2026-10-30, «use the absolute paths for imports»; § Owner amendment) | `ab/no-parent-imports` (packages/config/eslint-parent-imports.js): no `../` module path in api, web and mobile source and tests (imports, re-exports, `import()`, `import('x').T`, require, vi/jest mock paths); `@/…` → `src/…` instead | `./` siblings; a path the alias cannot name (outside `src/`: mobile `app/` routes and `app.json`, web `public/`); packages and tools (§ Owner amendment) | 9,036 (api 5,164 · web 1,960 · mobile 1,912) → 0, then the rule's lint.json key goes |

Out of scope for v2: the extra rule set in probe PR #393 (strict type-aware lint, `no-console`, `eqeqeq`, `switch-exhaustiveness-check`, new tsconfig flags). Its counts are read when its CI finishes (typecheck had failed and lint was still running when this was written). A later doc can size them.

## 2. Numbers today vs target

### 2.1 Size and shape: AST counter (TypeScript 6.0.3 parser, `012ffa06`)

| pkg | code / support / test files | code·test files at 130–150 lines | files > 150 after prettier (code·support·test) | lines > 100 chars | 3-param fns, all (code) | non-test fns > 40 lines (> 60 · > 80) | cx > 10 (> 15 · > 20) | depth ≥ 4 |
|---|---|---|---|---|---|---|---|---|
| api | 1205 / 105 / 1085 | 51·34 | 60·15·130 | 15,765 | 396 (275) | 16 (1·0) | 23 (5·0) | 3 |
| web | 1507 / 42 / 897 | 19·10 | 31·1·31 | 9,950 | 148 (102) | 262 (83·24) | 83 (21·8) | 0 |
| mobile | 1404 / 56 / 895 | 19·24 | 14·0·27 | 7,901 | 168 (96) | 201 (59·13) | 31 (5·2) | 0 |
| shared | 303 / 4 / 266 | 12·2 | 9·0·8 | 2,538 | 98 (47) | 0 | 5 | 0 |
| client-core | 62 / 1 / 38 | 3·1 | 1·0·1 | – | 8 | 2 | 3 | 0 |
| e2e | 71 / 1 / 179 | 5·12 | 8·0·37 | 2,957 | 44 | 0 | 1 | 0 |
| tools/migrate | 109 / 6 / 63 | 8·8 | 0 | – | 18 | 13 | 8 | 0 |
| tools/scripts (unlinted) | 42 / 4 / 33 | 2·3 | 3·0·5 | – | 28 | 2 | 10 (3·2) | 4 |
| tools/wa-stub | 17 / 0 / 14 | 1·0 | 2·0·1 | – | 46 | 0 | 2 | 0 |
| brand tools (unlinted) | 5 | 0 | 1 | – | 6 | 1 | 2 | 2 |
| **total** | | | **129·16·240 = 385** | | | **497** | **168 (34·12)** | **9** |

Params: 0 linted functions with 4+ params, and all 713 api constructors take ≤ 3. 17 Nest classes reach more dependencies through property injection: 12 have 4, 4 have 5, and ThreadReads has 10. 21 files exist only as «deps / ports / reads / lookups» bags or say «(max-params)», and 24 code comments name the limit.

| Rule | Top offenders (value) |
|---|---|
| R1 (formatted length) | `google-sync/sync/google-items.queries.ts` 148 → 261 (lines of 219/160/142 chars) · `inbox/sales-money/use-sales-family-actions.tsx` 141 → 211 · `payments/record/RecordPaymentDialog.tsx` 125 → 203 · `shared/reports/quran/quran-data.ts` 96 → 203 (data) · `inbox/threads/threads.queries.ts` 148 → 200 · `whatsapp/templates/catalog/template.registry.ts` 147 → 200 · `whatsapp/whatsapp.client.ts` 147 → 199 · `reminders/plan/reminders.plan.ts` 148 → 198 · tests: `sales-booking.http.test.ts` 141 → 314, `drive.writers.test.ts` 142 → 304, `reschedule-rule.service.test.ts` 143 → 266 |
| R2 (real violations, unlinted) | `tools/scripts/ci-checks/compose.test.mjs` 168 lines · `e2e-areas/select.mjs:83` `bundleUsers(root, file, base, g)` 4 params · `pure-move-check.mjs:44` replace callback with 5 params |
| R2 (DI workaround) | `inbox/reads/thread-reads.ts` 10 deps · 5 deps: `inbox/delta/thread-delta.service.ts`, `inbox/files/thread-file-send.service.ts`, `webhook/inbound/webhook.inbound.service.ts`, `webhook/webhook.service.ts` · bags: `reminders.deps.ts`, `follow-ups.deps.ts`, `communications.deps.ts` |
| R3 (complexity) | web `threads/pane/ThreadPane.tsx:43` cx38, 107 lines · mobile `messages/components/MessageBubble.tsx:64` cx36 · `booking/steps/review/BookedPanel.tsx:42` cx27 · `settings/values/ValuesBody.tsx:28` cx27 · `useSalesFamilyActions` cx26, 93 lines · `composer/components/ComposerPhone.tsx:82` cx24 · `review/ReviewStep.tsx:38` cx23, 108 lines · mobile `SalesSubscribeForm.tsx:48` cx22 · `threads/list/ThreadRow.tsx:57` cx22 · `TemplateComposer.tsx:36` cx21 · `tools/scripts/.../select.mjs:39` cx29 |
| R3 (length) | mobile `composer/voice/use-voice.ts:25` 124 lines, cx1 · `edit-time/EditTimeForm.tsx:34` 114 · mobile `SurahPickerSheet.tsx:29` 113 · `TextComposer.tsx:45` 105 · mobile `trial/components/ContactStep.tsx:44` 103 · column factories `subscription-columns`, `template-columns`, `teacher-columns` 75–97 |
| R3 (depth 4+) | `student-lifecycle/student-expiry.job.ts:48` · `occurrences/horizon.job.ts:48` · `rules/rule-projection.ts:35` · `e2e-areas/select.mjs:39` and `graph.mjs:63` (depth 5) |

### 2.2 Effects and memo: effect classifier (non-test code)

| Class | Fix | web | mobile | total |
|---|---|---|---|---|
| DER derived state | compute during render | 3 | 1 | 4 |
| RST reset on prop change | `key` reset | 2 | 0 | 2 |
| EVT event-driven logic | handler, mutation `onSuccess`, route `beforeLoad`/`redirect` | 16 | 10 | 26 |
| FET fetch, mark-read, invalidation | TanStack query/mutation; changing value in the `queryKey` | 6 | 9 | 15 |
| REF copy the latest prop into a ref | `useEffectEvent` (React 19.2) | 6 | 9 | 15 |
| CLN cleanup only | shared `useTimeout` / `useObjectUrl` | 7 | 12 | 19 |
| EXT timers, DOM, realtime, native, Animated | keep, inside shared hooks | 45 | 46 | 91 |
| **total** (useLayoutEffect: web 2, mobile 3) | | **85** | **87** | **172** |

- 59 can go without a React change: 47 DER+RST+EVT+FET, plus 12 where a platform feature does the job (7 focus-on-mount → `autoFocus`, TextComposer → CSS `field-sizing: content`, RouteFade → `key={pathname}`, PermissionMatrix and ConflictNotice → ref callbacks, use-screen-focus → `useIsFocused`).
- 18 more need React 19 APIs: the 15 REF rows, `document.title` ×2 → `<title>`, VideoTile → ref-callback cleanup. The 9 web rows wait for x1.
- ≈ 95 are real external-system sync and stay, consolidated into shared hooks. 45 of the 172 sit in hooks duplicated between or inside the apps (9 web/mobile pairs, for example use-call-session 38/52 lines, use-autosave 54/68).
- Memo: `useMemo` 71 (web 46, mobile 25), `useCallback` 87 (41 / 46), `memo()` 32 (3 / 29), `useStableHandler` 3 = **193**. They are deleted only after the compiler runs: today many callbacks are effect dependencies and the `memo()` FlatList rows rely on stable props.

### 2.3 Data layer: repository scan (api, `012ffa06`)

| Metric | Today | Target |
|---|---|---|
| `*.queries.ts` files / classes | 126 (127 on `384a51ac`) / 125, plus `CourseLessonQueries` and `AssistantLessonsQueries` outside `.queries` files and 3 function-style files | 0 |
| mobile `*queries.ts` (TanStack hooks with inline fetchers) | 21 | 0: hooks → `use-*.ts`, fetchers → `*.repo.ts` |
| client fetcher files named `api*.ts` | web 63, mobile 24 | `<feature>.repo.ts` or `client-core/repos/` |
| prod files calling `.from()`/`.rpc()` outside queries | 71 (169 calls; 18 `db: Db` helpers; 1 controller: `students.controller.ts`) | the R8 adapters only |
| prod files importing `common/db/db.module` outside queries | 55 | 0 |
| `if (error) throw dbError(error)` | 433 lines in 115 files (no unwrap helper) | 0 |
| `dbError()` implementations | 2: `common/http/http.ts` and `people/guardians/http.ts` (10 importers; maps 23503 → `conflict`, P0002/PGRST116 → 404 instead of 500) | 1, guardians' cases as explicit checks (behaviour kept) |
| repositories with non-DB dependencies | 22 (settings readers 12, StaffPhotos 3, AuditService 2, NotificationPolicy 2, another Queries/Service 4, LineHealthStore + ClassroomOn 1) | settings readers only |
| repositories throwing HTTP errors | 11 files, 13 sites | 0 |
| repositories with no sibling test | 55 | 0 for every repository a PR touches |
| tables written by 2+ modules | 15 of 64 (messages 8 modules, profiles 7, leads 7, teachers 4, lesson_reports 3) | one writer per table |
| test coupling the rename must carry | `overrideProvider(XQueries)` 140 in 47 files · `as unknown as XQueries` 227 in 158 · `new XQueries(` 357 in 105 | renamed by the codemod |
| fan-in | TeachersQueries 19 consumers (38 cross-module imports) · ThreadsQueries 14 · InternalMeetingsQueries 9 | TeachersQueries in its own PR |

### 2.4 Structure and duplication: folder scan and guard files

| Metric | Today | Target |
|---|---|---|
| `ab/module-boundaries` suppressions | api 452 · web 723 · mobile 733 · shared 123 = 2,031 | 0 |
| folders over the cap (allow-listed) | mobile `src` (35 dirs), shared `src` (27), api `common` (17), web `inbox/saved-replies` (20 files), web `inbox/lists` (17), mobile `inbox/saved-replies` (16), `inbox/lists` (13), `inbox/qualification` (13) | 0 |
| folders at exactly 12 (next file fails CI) | 57: api 16, web 18, mobile 16, packages 5, tools 2 | splits add sub-folders |
| unguarded flat folders | `e2e/tests` 181 specs, `e2e/support` 67 | 7 domain folders |
| one helper written many times | westernDigits 8 · 2-decimal rounding ≈ 20 inline + 3 names · totals per currency 7 · YYYY-MM-DD in a zone 17 · wall-clock → UTC engines 4 · `codeOf` 11 · signed upload 21 files · listener-set stores 15 · wa.me links 5 · lesson-status sets 5 · Arabic search fold 6 | 1 each |
| hooks duplicated web↔mobile | 39 (useReportEntry 67 lines, useRecordPayment 55, useThreadReopen 48, useInboxRealtime 48…) | 0 |
| query keys | web 216 literal `queryKey` arrays + 53 literal invalidations; `pathKey`/`listKey` used by 1 web file vs 76 mobile | 0 literals |
| API paths with a hand-written fetcher in both apps | 50 (shared scan) / 71 (SOLID scan) | 0 |

## 3. Lanes and PR slices

Legend: **M** pure move (pure-move-check) · **C** codemod rename (pure-move-check with the map's `renames` table) · **B** behaviour-preserving extraction (moved or added tests prove the same behaviour) · **L** logic or config change.
Every PR: full CI (`lint typecheck test`, guards, `folder-cap --strict`) + e2e for the affected areas (**full** e2e on every L PR and every `x*`), jscpd/knip `--write` in the same PR, no suppression count goes up. Mobile PRs: `native-changes.mjs` prints «none». Everything runs in GitHub Actions or cloud routines, never on the owner's PC. Size ≤ ≈ 150 touched files; an L-size PR keeps one feature whole and is named. Branch `cloud/refactor-<id>`. Lane order, as asked: G (guards) → M (pure moves) → R (repos codemod) → K (shared packages) → X (effects) → S (SOLID splits). §3.7 says what overlaps.

### 3.1 Lane G: guards and tooling (first; branch names outside the pure-move glob)

| id | Scope | ≈ files | Type | Depends | Verified |
|---|---|---|---|---|---|
| g1 | `move-module.ts`: a `renames` table `{XQueries: XRepo}` applied with ts-morph (class, importers, barrels, module providers/exports; companion test and `__snapshots__` stems), rewrites the package-relative keys in every `eslint-suppressions.json` and the paths in `refactor/guards/knip.json`. `pure-move-check`: accepts listed identifier renames, suppression-key rewrites and counts that only go down; `/eslint-suppressions\.json$/` joins CONFIG. CI glob `cloud/refactor-[abcd][0-9]*` → `cloud/refactor-[abcdkrt][0-9]*`. Mobile boundaries: interim two-level module regex and `app/` route pattern per converted domain. e2e-areas `guard.mjs` recursive; `SPEC_DIR`, `areas.json`, `shard-durations.json` accept folders | ≈ 12 + tests | L (tooling) | — | codemod tests (run twice = no diff, stems, suppression keys) + CI |
| g2 | Lint `tools/scripts` (copy `tools/wa-stub/eslint.config.js`, add `"lint"`) and fix its 3 violations: split `compose.test.mjs` by scenario, `bundleUsers({ root, file, base, graph })`, a named `(_m, ...groups)` callback. Lint `docs/design/brand/tools` | ≈ 10 | B | — | CI |
| g3 | Ratchets R1–R3, R8 (lint half), R9 (effect half): add the rules, then `eslint --suppress-rule` per package. No code change | ≈ 12 configs + 9 suppression files | L (config) | g2 | CI green; the PR body records each new count as the baseline |
| g4 | Turbo `inputs` (§4.2), `packages/db/turbo.json`, and `apps/api/turbo.json` test input `$TURBO_ROOT$/packages/db/supabase/migrations/**` (41 api `*.migration.test.ts` read SQL) | 3 | L (config) | — | `turbo run build test --dry=json` before/after: a shared test-only edit and a migration-only edit change exactly the expected hashes |

### 3.2 Lane M: pure moves (folders)

| id | Scope | ≈ files | Type | Depends |
|---|---|---|---|---|
| a23 | api `common/config/{config-store, custom-config, public-config, integrations}`. The api `no-restricted-imports` regex `common/(settings/settings\|config-store/store/config-store)` and 2 `*.boundaries.test.ts` path strings change in the same PR | 132 | M | g1 |
| a24 | api `common/telemetry/{activity, client-usage}`, `common/infra/{cache, events, i18n}`: common 17 → 11 dirs | 135 | M | a23 |
| b20 | web `inbox/saved-replies` → {components, hooks, lib}, `inbox/lists` → {components, lib} (2 allow-list entries go) | 70 | M | g1 |
| b21 | web `components/` loose files → `components/data-table/` (103) and `components/shell/` (21) | 124 | M | b20 |
| b22 | web `inbox/sales-money` → `features/sales/sales-money` (81), `inbox/calls` → `features/messaging/calls` (37), exported through barrels | 118 | M | b21, #345 |
| b23 | web barrels for the top deep-import targets: subscriptions/format 40, schedule/tz 35, schedule/api 33, leads/format 31 | ≈ 140 | M | b22 |
| c12a | mobile `more/Note` (132 deep imports) → `core/ui` | 139 | M | g1, UX quick wins merged |
| c12b | `more/Section`, `inbox/ErrorLine` → `core/ui` | 142 | M | c12a |
| c12c | `payments/{format, receipt, upload-receipt, ReceiptPicker}` → `core` | 134 | M | c12b |
| c12d | `payments/{FormLabel, payment-errors, PaidDayPicker}`, `more/{sign-out, types}`, `students/list/SectionLabel` | ≈ 105 | M | c12c |
| c12e | barrel paths for `booking/shared/{slots, booking-errors, ConflictNotice}`, `calendar/lib/week`, `today/lib/{timeline, lesson-text}` (c12a–e remove ≈ 340 of the 733 mobile suppressions) | ≈ 130 | M | c12d |
| c12f | `inbox/{saved-replies (52), lists (30), qualification (24)}` → components/ + lib/ (3 allow-list entries go) | 106 | M | c12e |
| c13 | `auth` → `core/auth` (101 importers; core is boundary-exempt) | 132 | M | c12f |
| c14–c16 | `sales/{sales, app←sales-app}` 154 · `sales/subscribe←sales-subscribe` 89 · `sales/{course←sales-course, money←sales-money, registration-check}` 114 | 89–154 | M | c13 |
| c17–c19 | `finance/finance` 99 · `finance/payments` 102 · `finance/{money, teacher-earnings←earnings, subscriptions←subscribe}` 112 | 99–112 | M | c16 |
| c20–c24 | `teaching/booking` 149 · `teaching/{calendar, edit-time, live}` + `teaching/index.ts` → `teaching/reschedule/` 131 · `teaching/{today, trial-date}` 137 · `teaching/{classroom, meetings, feedback}` 126 · `teaching/teacher` 135 | 126–149 | M | c19 |
| c25–c27 | `people/{students, student-file}` 134 · `people/{users, assistants, assistant-app}` 122 · `people/account` + `messaging/notifications` 83 | 83–134 | M | c24 |
| c28–c29 | `platform/ops` 166 (L, one feature) · `platform/more` 114 | 114–166 | M | c27 |
| c30 | `messaging/inbox` (L, **D5**); includes #390's `inbox/messages/photo/Pdf*` | 561 | M | c29 |
| d5 | client-core 12 → 5 dirs: core/{http, keys, errors, auth}, messaging/{inbox, calls, channels}, people/{users, assistants}, teaching/{booking, reports}, finance/{payments} | 100 | M | g1 |
| t1–t7 | e2e `tests/<domain>/` + `support/{core, <domain>}`, one domain per PR with its helpers (**D8**) | 30–60 each | M | g1 |

Mobile target (35 → 8 top dirs): `core/{lib, nav, push, ui, auth, hooks}`, `test/`, `sales/`, `finance/`, `teaching/` (11 features), `people/`, `platform/{ops, more}`, `messaging/{inbox, notifications}`. Route files in `app/` keep their paths, so URLs do not change; only import specifiers do. Verified per PR: pure-move-check + CI + affected e2e (t*: full e2e) + `native-changes` «none» for c*.

### 3.3 Lane R: repositories (api; serial, because every PR edits the api suppressions and `knip.json`)

| id | Scope (classes) | ≈ files | Type | Depends |
|---|---|---|---|---|
| r0 | `teaching/scheduling/read-all.ts` → `common/db/read-all.ts` (23 importers), `common/list-sort.ts` → `common/db/list-sort.ts` (17) | ≈ 45 | M | a24 |
| r1 | common/{activity, config-store, integrations, push, settings}: 5 | ≈ 26 | C | r0 |
| r2 | people/teachers alone (TeachersQueries) | 54 | C | r1 |
| r3 | people/{users, sign-in, portal, me, roles, students, teacher-students}: 12. The 5 ports keep their Symbol token and `Fake*Store`: `XRepo implements XStore` | ≈ 32 | C | r2 |
| r4 | messaging/whatsapp: 6 | 85 | C | r3, #345 |
| r5 | messaging/{inbox (with #390's `pdf-preview.queries.ts`), webhook, calls, push, saved-replies}: 11 | ≈ 75 | C | r4 |
| r6 | messaging/{numbers, reminders, follow-ups, notification-rules, chat-lists}: 5 | ≈ 50 | C | r5 |
| r7 | teaching/classroom: 9 + AssistantLessonsQueries | 69 | C | r6 |
| r8 | teaching/booking: 7 + CourseLessonQueries | 55 | C | r7 |
| r9 | teaching/{lessons, scheduling, course-pause, lesson-rating}: 10 | ≈ 64 | C | r8 |
| r10 | teaching/{feedback, student-recordings, student-channels}: 7 | ≈ 32 | C | r9 |
| r11 | finance/subscriptions: 8 | 48 | C | r10 |
| r12 | finance/{stripe, assistant-pay, teacher-earnings, payouts}: 10 | ≈ 52 | C | r11, #394 |
| r13 | finance/{payments, expenses, invoices, receivables, fx}: 6 | ≈ 40 | C | r12 |
| r14 | sales/*: 12 | ≈ 81 | C | r13 |
| r15 | reporting/* + platform/*: 16 | ≈ 69 | C | r14 |
| r16 | close: the CI line (no `*.queries.ts`, no `class \w+Queries`); drop the `*.queries.ts` transition exemption from R8 | ≈ 3 | L (guard) | r15 |
| rq1 | common + people: `common/db/unwrap.ts` + test; one `dbError` (guardians' 404/409 become explicit checks in its repository); raw DB out of guardians.service (7 calls), students.service (4) + students.controller (drops DB; the students functions become a `StudentsRepo` class), me.service (4), custom-config.service (5), settings.service (2), push.service, guardian-phones, merge; `photo-slots` and `push.sessions` helpers folded in | ≈ 120 | B | r16 |
| rq2 | messaging: threads repo stops injecting PackagesService + BalanceQueries (a ThreadContextService composes them); teacher-threads drops TeacherMe; rules drops LineHealthStore + ClassroomOn; 6 thread helpers folded (threads.list, thread-lessons, thread-quotes, known-number, last-unsupported, thread-people) + reminders.room, delivered, staff-at-send; HTTP throws out; unwrap | ≈ 120 | B | rq1 |
| rq3 | teaching: AuditService out of moderation; overview's StaffPhotos mapping → service mapper; NotificationPolicy out of booking; teacher-calendar.service (3), makeup-candidates (2); unwrap | ≈ 100 | B | rq2 |
| rq4 | finance: AuditService out of student-status; NotificationPolicy out of alerts; `PaymentsRepo.totals` → pure mapper + test; lead-conversion, earnings.lists, commission-bell, student-access; unwrap | ≈ 100 | B | rq3 |
| rq5 | sales + reporting + platform: sales-ownership, sales-lessons, push-device.claim; sales-family's 3 HTTP throws; sales-student drops TrialDate; sales-academy StaffPhotos; unwrap | ≈ 90 | B | rq4 |
| rq6 | one writer for `messages` (8 modules): `messaging/whatsapp/outbox.repo.ts`, replacing `queueMessages`/`approvedTemplates` exported from reminders | ≈ 60 | B | rq5 |
| rq7 | one writer each for profiles (7 modules), leads (7), teachers (4), lesson_reports (3) | ≈ 120 | B | rq6 |

In their batch, the repository-shaped non-queries files become `*.repo.ts` too: `rules.table`, `line-health.store`, `rating.store`, `activity.writer`, `course-change.writer`, `lesson-writer`, `google-sync.source`, `report-pdf.source`, `v2/family-source`, `assistant-pay.rpc`, `reports/submit/report-rpc`. The 3 function-style files are renamed as files only. Kept as they are (filters and zod, not data access): `*.list-query.ts`, `availability.query.ts`, `lesson-queries.schema.ts`. Every rq PR adds tests for each repository it touches (55 have none today). r1–r16 verified by pure-move-check + CI + affected e2e; rq* by CI + full e2e.

### 3.4 Lane K: shared packages (§4)

| id | Scope | ≈ files | Type | Depends |
|---|---|---|---|---|
| k1a–k1e | Regroup `@ab/shared/src` into the target package folders and break the 7 cycles (format↔pricing, money↔pricing, schemas↔{lessons, settings, classroom, users, messaging}) with pure moves. Apps import only the root barrel, so no app file changes. k1a core 74 · k1b catalog 130 · k1c people 73 + schedule 65 · k1d money 79 + messaging ≈ 45 · k1e settings 115. k1a also adds the acyclic-folder check | 65–138 each | M | g1 |
| k2 | Dedup inside shared, with tests: one westernDigits (8 copies), `toCents`/`fromCents`/`round2` + a `twoDecimals` refine (3 names, ≈ 20 inline roundings, 3 refines), `sumByCurrency` (7), `clickToChatLink` (5; mobile `whatsappLink` is byte-identical), `addDays` (4), CANCELLED/INACTIVE lesson-status sets (5), named `WA_ERROR` codes, `matchesQuery` (6). Web inbox `search.ts` switches to the shared `E164_RE` (its regex accepts 7-digit numbers, shared needs 8: flagged in the PR) | ≈ 70 | B | k1e |
| k3a | Cut `@ab/core` and `@ab/i18n` (`ar.json`/`en.json` move; `@ab/shared` re-exports; the `@ab/shared/i18n/*.json` subpath keeps working; CLAUDE.md rule 10 path updated) | ≈ 90 | M | k2 |
| k3b | Cut `@ab/time`: one engine instead of 4 (shared `lessons/series/zoned.ts`, api `teachers/availability/zoned-time.ts`, web `schedule/tz.ts`, `tools/migrate/src/time.ts`). `dayInZone` replaces 17 en-CA formatters and 4 `localDay`s | ≈ 60 | B | k3a; DST tests (occurrences.riyadh, .cairo-dst, .transition-weeks, dst-probe, shared zoned) pass on the merged engine before any engine is deleted |
| k4 | `@ab/catalog` + `@ab/settings` (`./seed` subpath for the api config-seeder and migrate) | ≈ 120 | M | k3b |
| k5 | `@ab/money` + `@ab/schedule`; the api's pure scheduling core (occurrences, conflicts with one overlap function, free-slots, intervals, horizon's addDays) moves in with its tests: 31 deep imports go | ≈ 130 | M (+ the overlap merge, B) | k4, r9 |
| k6a | `@ab/people`, `@ab/messaging`, `@ab/notifications` | ≈ 140 | M | k5 |
| k6b | `@ab/reports`, `@ab/sales`, `@ab/testing` (dev-only, knip entry) | ≈ 90 | M | k6a |
| k7 | `@ab/shared` stays as the apps' facade (D4); migrate and wa-stub import the specific packages; R7's `'@ab/shared'` restriction on; the `packages/shared/src` folder-cap entry goes | ≈ 30 | M | k6b |
| cl1 | client-core: `ApiError.code` + `apiErrorText(map, fallback)`; replaces 11 `codeOf` copies and most of the 48 app error mappers | ≈ 70 | B | k3a, c30, b23 |
| cl2 | `signedUpload({ http, storage }, spec)`: replaces 26 wrappers in 21 files and 4 one-off error classes | ≈ 50 | B | cl1 |
| cl3 | `createStore<T>()` (15 listener-set stores) + a clock-preference store with a storage adapter (web `lib/clock.ts` ↔ mobile `clock-store.ts`) | ≈ 45 | B | cl1 |
| cl4a–b | Finish docs/27 E1: web → `pathKey`/`listKey` (216 literal keys in 98 files, 53 invalidations), split by domain, with key-invalidation tests | ≈ 110 each | L (keys change; fixes mismatched invalidation) | cl1 |
| cl5a–c | `client-core/repos/<domain>.repo.ts` for the paths both apps call (users, reports, account, staff-photo, saved-replies, meetings, assistant statements, public-config, config-entries, i18n overrides). Mobile's 21 `*queries.ts` → `use-*.ts` + repo; web `api*.ts` (63) and mobile `api*.ts` (24) → `<feature>.repo.ts` | ≈ 120 each | B (+ M renames) | cl4 |
| cl6 | New `@ab/client-hooks` (react ^19.2 and @tanstack/react-query as peers; a `ClientPlatform` context with { http, storage, supabase, onForeground }): the 39 duplicated hooks move in, one copy each | ≈ 120 | B | x1, cl5 |

Verified: M rows by pure-move-check + CI; B rows by moved and new tests + CI + affected e2e; cl4 by full e2e.

### 3.5 Lane X: effects and the compiler

| id | Scope | ≈ files | Type | Depends | Verified |
|---|---|---|---|---|---|
| x0 | mobile `app.json` `experiments.reactCompiler: true`. `babel-plugin-react-compiler` 1.0.0 is already installed through babel-preset-expo 57.0.13. OTA-safe: `experiments` is not in `native-changes` NATIVE_KEYS | 1–4 | L | g3 (may land early) | CI + jest-expo; OTA to the preview channel first |
| x1 | web React 18.3.1 → 19.2.x (react, react-dom, @types/react, @types/react-dom) and the compiler in `vite.config.ts` (stable path: `@rolldown/plugin-babel` + `babel-plugin-react-compiler`; `react({ compiler })` is marked experimental), **D3** | ≈ 6 + fixes | L | g3 (may land early) | full CI + full e2e (6 journeys + classroom) + bundle size before/after |
| x2a–b | web: remove 38 effects (EVT 16, FET 6, DER 3, RST 2, 7 `autoFocus`, `field-sizing`, `key={pathname}`, 2 ref callbacks), by domain | ≈ 60 each | B | x1, b23 | full e2e |
| x2c | mobile: remove 21 (EVT 10, FET 9, DER 1, `useIsFocused`) | ≈ 50 | B | x0, c30 | jest-expo + native-changes «none» |
| x3 | React 19 APIs: 15 REF → `useEffectEvent`, `document.title` ×2 → `<title>`, VideoTile → ref-callback cleanup | ≈ 30 | B | x2a–c | CI + e2e |
| x4a–c | ≈ 95 external-sync effects into hooks: `@ab/client-hooks` (useNow ×4, useDebounced ×4, useCountdown ×2, useTimeout ×13, useAutosave ×2, useCallsRealtime, useCallSession, useChannelLive, useRingtone), web `lib/dom` (useBodyScrollLock ×2, useOutsideDismiss ×2, useObjectUrl ×3), mobile `core/hooks` (useAppState ×5, useA11yPref ×2, useA11yFocus ×2, useAnimatedLoop ×3, one `restoreAppearance`), feature `effects/` for LiveKit, whiteboard and expo-video | ≈ 100 each | B | cl6, x3 | R9 effect suppressions → 0 |
| x5a–d | Memo cleanup per feature, after the compiler is verified (DevTools «Memo ✨» or compiler `logDiagnostics`): the memo half of R9 lands with a baseline first; MEMO-TOP files first (`use-room.ts` 5, `use-row-saves.ts` 5, `StudentReportsScreen.tsx` 5, `ReportRows.tsx` 4, `ThreadRow.tsx` 4) | ≈ 60 each | B | x4 | R9 memo suppressions → measured exceptions |

### 3.6 Lane S: SOLID splits (last; per module, after its r*/x* PRs)

| id | Scope | ≈ files | Type |
|---|---|---|---|
| s1 | Jobs: `Ticker` (today inside `messaging/reminders/ticker.ts`, 6 users) → `common/jobs/ticker.ts` with `kick()`. Migrate the 4 hand-written kick loops (message.sender, report-pdf.job, google-sync.job, meeting-invite.sender: a 20-line clone) and the 18 setInterval + onModuleDestroy jobs | ≈ 50 | B |
| s2 | DI (if D1 gives constructors 4): inline the 21 bag files and the 12 four-dependency property-injection classes; split the 4 five-dependency classes and ThreadReads (10) by concern (thread reads · marks · sales mode) | ≈ 60 | B |
| s3a–b | God classes: template.registry (14 methods → TemplateCatalog, TemplateVerifier on the Ticker, TemplateAdmin), threads repo (13 → ThreadsRepo, ThreadMessagesRepo, ThreadReadsRepo), users repo (16), roles.service (→ RoleGrants policy), users.service (→ UserGuards), payments.service (replay/raced → an IdempotentWrite helper shared with payouts and statements), config-store.service (reads / writes) | ≈ 90 each | B |
| s4 | Strategy maps: stripe-webhook dispatch (6 cases), ValueEditor (7), WizardBody + draft.steps (one step registry), shared `settings/validation/schema.ts` (9). Dense api functions → maps and early returns: calendar.writer `write` cx18 in 23 lines, report-pdf.writer cx18, sheet-rows.writer cx17–18, google-sync.processor `runOnce` cx17; the 3 depth-4 jobs. Reducers and state machines keep their exhaustive switches | ≈ 40 | B |
| s5a–b | `ZodBody(schema)` / `ZodQuery(schema)` parameter decorators replace the 222 `parse(schema, …)` calls in controllers | ≈ 120 each | B |
| s6a–c | Splits for the R3 offenders. Web inbox: ThreadPane → `useThreadPaneModel` in `pane/model/` (pane is at 12), ThreadBody, ReadOnlyNotice; ThreadRow; ComposerPhone; TemplateComposer; TextComposer; useSalesFamilyActions → `*.rules.ts`. Web booking/settings/finance: BookedPanel, ReviewStep, ValuesBody, EditTimeForm, RecordPaymentDialog; column factories → `columns/`, one cell per file. Mobile: MessageBubble, SalesSubscribeForm, SurahPickerSheet, ContactStep, useVoice (record / playback / upload) | ≈ 60 each | B |
| s7a–f | Long-line backlog, one PR per package (api, web, mobile, shared, e2e, the rest): split the 129 code + 16 support files that pass 150 lines when formatted, then switch that package to `prettier --check`; the 240 tests after | 30–60 each | B |
| s8a–c | Data out of components: 271 web `.tsx` with inline useQuery/useMutation (116 with 3+ data hooks); `apiFetch` in `.tsx`: web 10, mobile 22 → feature `use-*.ts`. First ExpensesPage, PayoutsPage, ThreadPane, TemplateComposer, TeacherDialog, SendRating, TeacherCalendarOwner, SubscribeScreen | ≈ 60 each | B |
| s9 | UI dedup: one FormDialog (34 of 61 `*Dialog.tsx` run their own mutation and error code; 12 use ConfirmDialog), `usePayWithReceipt` (10 pay hooks, 264 → ≈ 80 lines) + one PayDialog, the payout-columns / MyPayouts clone (42 lines), QuotePreview + SalesQuotePreview, ReviewStep + TrialReviewStep, ThreadHeader + ThreadHeaderPhone | ≈ 60 | B |

Verified: CI + affected e2e (s5, s8: full e2e); each PR removes its rows from the R3/R1 suppressions.

### 3.7 What runs in parallel

| Phase | Runs together | Serial inside | Blocked by | Shared files |
|---|---|---|---|---|
| 1 | g1 → g2 → g3 · g4 any time | g1–g3 | — | every `eslint-suppressions.json` |
| 2 | a23–a24 ∥ b20–b23 ∥ c12a–c30 ∥ d5 ∥ t1–t7 ∥ k1a–e (package-internal) ∥ x0, x1 (single PRs) | each app's own list (its suppressions and folder-cap file) | g1, g3 | `refactor/guards/knip.json` (one file for all lanes) |
| 3 | r0–r16 → rq1–rq7 ∥ k2–k7 ∥ cl1–cl5 | r*, rq* | a24; cl* after c30 and b23; k5 after r9 | api suppressions (r*), shared barrel (k*) |
| 4 | x2–x5 (web after b23, mobile after c30) ∥ cl6 | per app | x0, x1, cl5 | per-app suppressions |
| 5 | s1–s9 | per module | that module's r*/x* | — |

- Per-module freeze while its move PR is open (hours; docs/27 §6). Open feature branches run `move-module.ts --replay`.
- A lane PR that conflicts on a guard JSON file rebases and regenerates it (`eslint --prune-suppressions`, knip `--write`); nobody hand-merges those files.
- Mobile grouping (c*) and mobile effect work (x2c, x4c) touch the same files, so they never overlap.
- About 120 PRs: G 4 · M 38 · R 24 · K 22 · X 13 · S ≈ 20.

## 4. Shared packages

### 4.1 Packages, in layer order

Each package: ≤ ≈ 40 code files, ≤ 12 per folder, tests next to the code, vitest in a node environment (`@ab/client-hooks`: jsdom + @testing-library/react), coverage ≥ 80 % for core, time, schedule and money (CLAUDE.md rule 4). Files per package: `package.json` (`exports` `.` plus declared subpaths), `tsconfig` extending `@ab/config`, `eslint.config.js` (`config` + `boundaries`), an empty `eslint-suppressions.json`, a vitest config. Mobile jest already transforms `@ab/.*`, so no jest change.

| Package | Layer | Contents (today's location) | Depends on | Used by | ≈ code files |
|---|---|---|---|---|---|
| `@ab/core` | L0 | shared `async/`; `schemas/common` + `list-sort` (zod primitives); `text/` (westernDigits, normalizeArabic, arabicNameSimilar, matchesQuery, plural, text-dir, highlight-diff); `money/minor` (toCents, round2, sumByCurrency, twoDecimals); phone (normalizePhone, E164_RE, formatPhone, clickToChatLink); `i18n/locale` | zod | everything, incl. migrate and wa-stub | 24 |
| `@ab/time` | L0 | `time-zone/`, `format/clock*`, running-head, chat-day, `lessons/series/zoned` + the merged api/web/migrate engines: dayInZone, zonedToUtc, utcOffset, addDays, weekStart, weekWindow, dayWindow, monthRange, yearRange, riyadhToday | core | api, web, mobile, client-core, migrate | 16 |
| `@ab/i18n` | L0 | `ar.json` + `en.json` (711 KB), strings, placeholders, localized-name, schemas; `./testing` (arabic-literals scanner) | core | api, web, mobile (128 JSON imports) | 8 + 2 JSON |
| `@ab/catalog` | L1 | enums, permissions, integrations, google, StatusStyle, theme, `WA_ERROR` | core, `@ab/db` (types) | all + wa-stub | 25 |
| `@ab/settings` | L1 | settings (37), custom-config (5); `./seed` | core, catalog | api, web, mobile, migrate | 40 |
| `@ab/money` | L2 | money, pricing (+ pricingCountryOfPhone), assistant (`./assistant`), commission status style | core, time, catalog | api, web, mobile | 40 |
| `@ab/schedule` | L2 | lessons (+ CANCELLED/INACTIVE sets), lessons/series, `schemas/lessons`, classroom + the api's occurrences, conflicts, free-slots, intervals | core, time, catalog, settings | api, web, mobile | 38 |
| `@ab/people` | L3 | students, users, account, `schemas/people` | core, time, catalog, schedule | api, web, mobile | 20 |
| `@ab/messaging` | L3 | `wa.ts`, calls, channel, chat, reactions, replies, numbers | core, time, catalog, people, schedule | api, web, mobile | 36 |
| `@ab/notifications` | L3 | notifications, messaging/templates, messaging/lesson | messaging, settings, catalog | api, web, mobile | 31 |
| `@ab/reports` | L3 | reports (18) | core, catalog, schedule, money | api, web, mobile | 18 |
| `@ab/sales` | L4 | sales (24) | messaging, money, people, schedule, reports | api, web, mobile | 24 |
| `@ab/testing` | dev | shared `testing/`, the docs/27 E7 fixtures, arabic-literals | — | devDependency everywhere; knip entry | ≈ 8 |
| `@ab/client-core` | client | pure TS (no React, DOM or RN): http (+ `ApiError.code`, `apiErrorText`), keys, `repos/<domain>`, stores (`createStore`, clock), `signedUpload`, calls, inbox, channels | core, time, domain types | web, mobile | ≈ 75 |
| `@ab/client-hooks` | client | react ^19.2 + react-query peers; `ClientPlatform` context; query options on the repos; usePermissions, useNow, useCountdown, useDebounced, useTimeout, useAutosave, useReportEntry, the pay mutations, one `useRealtime(channel)` | client-core | web, mobile | ≈ 40 |
| `@ab/shared` | facade | `export *` of the packages above (D4) | all | apps | 1 |

If the owner wants fewer packages: fold `@ab/time` into `@ab/core` (≈ 40 files). Folding notifications into messaging would break the 40-file cap.

### 4.2 Turbo pipeline (g4)

| Task | dependsOn | inputs | outputs |
|---|---|---|---|
| build | `^build` | `$TURBO_DEFAULT$`, `!**/*.test.ts`, `!**/*.test.tsx`, `!**/__snapshots__/**`, `!**/fixtures/**`, `!**/*.md` | `dist/**` |
| typecheck | `^build` | `$TURBO_DEFAULT$`, `!**/*.md` | — |
| lint | `^build` | `$TURBO_DEFAULT$`, `!**/*.md` (eslint config and suppressions stay in) | — |
| test | `^build` | `$TURBO_DEFAULT$`, `!**/*.md`; `apps/api` adds `$TURBO_ROOT$/packages/db/supabase/migrations/**` | — |
| `packages/db/turbo.json` | — | build, typecheck: `src/**`, `package.json`, `tsconfig*.json` (the 207 migrations leave the hash) | — |

Honest limit: api, web and mobile each import 26 or 27 of the 27 shared folders, so app test caches still miss on most domain edits. The gains: a string-only (i18n) or test-only edit no longer rebuilds every dependent or re-runs the 266 shared tests; a migration-only edit stops invalidating web, mobile and shared; migrate (core + settings + i18n) and wa-stub (core + catalog) leave the blast radius; lint and tests cache per package (one 266-test suite becomes 12 suites). Without the `$TURBO_ROOT$` input, a migration edit would leave the 41 api migration tests on a stale cache.

## 5. Owner decisions

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Params | (a) keep 3 everywhere (docs/27 D1) and keep property injection · (b) 3 for functions, 4 for constructors | **(b)**. It matches «3 or 4», removes 21 bag files and 12 classes with hidden dependencies, and functions stay at 3. ThreadReads (10) and the 5-dependency classes are split in either case |
| D2 | Repository name | `x.repo.ts` / `XRepo` · `x.repository.ts` / `XRepository` (Nest convention) | **`x.repo.ts` / `XRepo`**: the owner's word, and 3 characters shorter than `Queries` (586 lines that mention `Queries` are already over 100 columns, and R1 adds `max-len 100`). It is one codemod setting either way. Client fetchers use the same suffix |
| D3 | React | (a) web → React 19.2 + compiler on in both apps · (b) compiler on mobile only · (c) neither | **(a)**, mobile first (x0, OTA-safe), web next (x1, full e2e). Without it the 18 React-19-only effect fixes, the memo cleanup and a shared `@ab/client-hooks` cannot ship |
| D4 | Shared code | (a) 12 layered packages, `@ab/shared` kept as the apps' facade · (b) (a) plus rewriting ≈ 2,450 app imports to the specific packages · (c) 7 bigger packages · (d) regroup inside `@ab/shared` only | **(a)**: per-package tests, caching and enforced layering without touching ≈ 2,450 app files. New non-app code imports the specific package (R7), and the plan can stop after any layer |
| D5 | Mobile inbox (490 files, 561 touched) | (a) one L move (c30) to `messaging/inbox` · (b) leave `src/inbox` (9 top dirs, within the cap) | **(a)**, last in the mobile list: the same shape as api and web, and pure-move-check makes the review a rename review |
| D6 | PR size | (a) ≤ ≈ 150 files (≈ 120 PRs, auto-merge when green) · (b) one PR per app like a21/b19 (mobile ≈ 2,120 files) | **(a)**: docs/27 D7 chose small PRs, and 150 files keeps one review per module |
| D7 | Thresholds | `max-len 100` now or at the split backlog · complexity 15 then 10 · `max-lines-per-function 50` · `max-depth 3` | **all now, baselined**: no code change on day one, new code meets them, and lane S shrinks the backlog (385 + 497 + 168 + 9) |
| D8 | e2e folders | group `e2e/tests` (181 flat) and `e2e/support` (67) by domain (t1–t7) · leave them | **group**: the largest flat folder in the repo; needs the g1 e2e tooling first |

## 6. Risks

| Risk | Mitigation |
|---|---|
| Mobile ships only by OTA (runtime 0.3.0, `runtimeVersion.policy: appVersion`) | Every c*/x*/cl* PR: `native-changes.mjs` prints «none»; no native dependency, config plugin or app.json native key changes. `experiments.reactCompiler` is not in NATIVE_KEYS. x0 goes to the preview channel first |
| The compiler changes when components re-render | Lint already enforces the compiler rules (0 react-hooks suppressions). x0 and x1 ship alone; memo is deleted only after both are verified; rollback is one flag |
| The React 19 upgrade breaks a web library (LiveKit, TanStack, testing-library types) | x1 alone, full e2e including the classroom, bundle size compared, rollback is one PR |
| Staging holds real data | No migration in this refactor: `packages/db/supabase/**` is untouched (only `packages/db/turbo.json` is added), the repository rename contains no SQL, and `seed:demo` never runs on staging |
| A hidden behaviour change inside a move or rename | pure-move-check on M and C (renames table and suppression keys only); B PRs carry moved or new tests; the L PRs are named (g1, g3, g4, x0, x1, cl4, r16) |
| Turbo inputs skip a needed re-run | The api `test` task reads the migrations through `$TURBO_ROOT$`; g4 proves the hashes with `--dry=json` |
| Guard JSON files conflict between lanes | Regenerate after rebase (`eslint --prune-suppressions`, knip `--write`); never hand-merge |
| In-flight PRs | #390 (PDF preview) is merged (`384a51ac`): its `pdf-preview.queries.ts` joins r5 and its mobile `Pdf*` files join c30. #345 (cloud/calls-number, 120 files across messaging api/web/mobile): merge before b22, r4 and r5, or replay the maps. #394 (assistant-pay folders, pure move, 28 files): merge before r12. #393 (strict-rules probe): close after its counts are read |
| UX waves roadmap (docs/reviews/2026-10-29-assistant-mobile-ux-review.md §5: «quick wins this week», «next 2 weeks», mostly mobile) | Mobile moves c12a–c30 start after the quick-win PRs merge. The per-module freeze lasts hours, UX branches run `move-module.ts --replay`, and mobile effect work (x2c, x4c) waits for c30 |
| Splits fill folders that sit at the cap | New files go into sub-folders (`model/`, `parts/`, `rules/`, `columns/`); folder-cap `--strict` runs on every PR (`inbox/threads/pane` is already at 12) |
| Counters disagree | Each lane re-measures its baseline in CI (the suppression files) before its first PR; this doc's numbers come from read-only scans |

## 7. Done when

- Every package passes `prettier --check`; 0 files over 150 lines; R1–R3, R8 and R9 suppressions are 0.
- 0 `*queries.ts` files; only the R8 adapters import `common/db/db.module`; one writer per table.
- The compiler is on in both apps; ≈ 95 effects remain, all inside hook files, none in components.
- `@ab/shared` is split into the §4 packages with no cycles; jscpd shows 0 cross-app clones outside fixtures; boundaries suppressions are 0; the folder-cap allow-lists are empty.
- `pnpm turbo lint typecheck test` and e2e are green in CI; `PHASE_SUMMARY.md` is written; docs/04 and CLAUDE.md (rules 1, 2 and 10) are updated.

## Critic corrections (2026-10-30, applied before the lanes start)

Measured on develop eaa755b8 by an adversarial review of this plan. Lanes must apply every item below; where an item conflicts with a table above, the item wins.

1. BASELINE IS STALE. develop is now eaa755b8, not 384a51ac. #394 merged on 10-29 at 23:27, so the rule «merge #394 before r12» is already met. Re-measured on eaa755b8 from a clean git archive. Confirmed: 127 api *.queries.ts, 21 mobile *queries.ts, effects web 85 / mobile 87, useMemo/useCallback/memo web 46/41/3 and mobile 25/46/29, boundaries suppressions 452/723/733/123, 8 folder-cap allow-list entries, jscpd 162/1860/25. Drifted: compose.test.mjs is 180 lines (not 168), the knip baseline has 285 entries (not 286), 59 folders sit at exactly 12 (not 57), api has 15,965 lines over 100 chars. The doc name is taken twice (docs/31-family-portal-and-channel.md and docs/31-mobile-direction-composer.md), so use docs/32-refactor-v2.md.
2. IN-FLIGHT PRS MISSING. #399 (ci/e2e-speed) edits ci.yml, e2e-areas/plan.mjs(+test), e2e/shard-durations.json, workflows-fast.test.mjs and moves e2e to 8 shards. That collides with g1 (the CI glob, e2e-areas recursion, shard-durations accepting folders), with g2 (linting tools/scripts) and with t1–t7. Merge #399 before g1. #396 (refactor/web-pilot-folders: 29 files, refactor/moves/v2-web-payouts.json, edits apps/web/eslint-suppressions.json) collides with b20–b23 and with s9 (payout-columns / MyPayouts). #345 also touches apps/api/src/common/integrations/{calls-number,numbers-overlay}.ts (the folder a23 moves), packages/client-core/src/calls/* (d5), mobile inbox/thread/calls/* (c30), and numbers.queries.ts + rules.queries.ts (r6). Change the rule to: merge #345 before a23, d5, c30 and r4–r6, not only before b22/r4/r5.
3. THE PURE-MOVE GATE SKIPS THE V2 MOVES. ci.yml only runs pure-move-check for `cloud/refactor-[abcd][0-9]*` heads, so #394 (merged) and #396 (open, both `refactor/...`) got «not a move PR: skipped». Their maps (refactor/moves/v2-assistant-pay.json, v2-web-payouts.json) also use a naming the plan's ids ignore. Trigger the check when the diff adds or changes a refactor/moves/*.json file (or on a label), not on the branch name.
4. THE PROPOSED GLOB `cloud/refactor-[abcdkrt][0-9]*` CATCHES NON-MOVE PRS. It matches k2, k3b and k5, which are B (dedup, the merged time engine, the overlap merge), and r16, which is L (the CI line plus eslint config). pure-move-check fails all four, or pushes people into mixed PRs. Give B and L slices ids outside the pattern, or select by map file as above. Split k5 into a pure move and a separate B overlap-merge PR.
5. PURE-MOVE-CHECK HAS CONFIG HOLES (CI CAN LIE). classify() returns 'config' without looking at content for .github/workflows/*.yml, eslint.config.*, vite/vitest/jest/playwright configs, tsconfig*.json and everything under refactor/. So a «pure move» can raise refactor/guards/{jscpd,knip}.json or add a refactor/folder-cap/*.json entry and pass. That matters with about 60 auto-merged M/C PRs. g1 should: accept only path rewrites in those files, with counts at or below base and no new entries; and fail a move PR whose workflow or eslint config hunks change more than path strings. Do not add /eslint-suppressions\.json$/ to CONFIG. Today the TEXT branch checks it first, so the addition does nothing, and reordering it would leave it unchecked. Use a dedicated check instead: keys rewritten by the map, no new rule keys, every count at or below base.
6. A23 IS BLOCKED AS WRITTEN. apps/api/src/common/config-boundaries.test.ts:63 asserts «the old shared config folder does not come back» (existsSync(common/config) must be false; docs/25 line 66, the #138 segregation). The same test also scans join(COMMON,'custom-config'|'public-config'). On top of that, 3 tests in common/integrations (kapso-secret-keys, secret-keys and wacrm-driver .migration.test.ts) use join(__dirname,'../../../../../packages/db/supabase/migrations'). Going one level deeper breaks them, and pure-move-check cannot accept the fix (CALLS only covers import/require/mock specifiers). Pick another folder name, or get owner sign-off to revisit docs/25. Before any move lane, land one B PR that replaces depth-relative fs paths with a repo-root helper. Scope: 45 api files, e2e/support/{account,api-boot,auto-lists}.ts, mobile inbox/thread/live/mounts.test.tsx, and 7 import.meta.glob users (4 of them packages/shared SQL tests).
7. G4 LEAVES STALE TURBO CACHES (CI CAN LIE). 4 packages/shared tests read SQL through import.meta.glob('../../../db/supabase/migrations/...'): google/settings-keys, settings/config-describe.migration, settings/seed-entries.sql-keys and settings/sql-defaults.migration. Their only path to migration changes is the @ab/db dependency. After g4's packages/db/turbo.json limits inputs to src/** and tsconfig, they replay cached passes; they need the same $TURBO_ROOT$ input as apps/api, and later so do @ab/settings and @ab/catalog. There is also a hole today: @ab/scripts has no workspace dependencies, but its tests read .github/workflows (workflows.test.mjs, which also reads docs/09), deploy/staging (the compose and roll tests) and the migrations (clear-demo.fk.test.mjs). CI keeps turbo caches (TURBO_TOKEN plus actions/cache), so a PR that only changes a workflow, compose or migration file (g1's ci.yml edit among them) replays those tests from cache. g4 should add tools/scripts/turbo.json inputs for $TURBO_ROOT$/.github/workflows/**, deploy/**, docs/09-deployment.md and packages/db/supabase/migrations/**, each proven with --dry=json.
8. LANE K BREAKS DEPLOY, OTA AND APK BUILDS (MISSING AREA). Every package exports dist/, and 4 places hard-code the build list: apps/api/Dockerfile runs `pnpm --filter @ab/shared build` (shared alone, not `@ab/shared...`); deploy-staging.yml:195 builds only db/shared/client-core before the web build; mobile.yml:105 builds the same 3 before `eas update`; apps/mobile's `eas-build-post-install` builds only shared + client-core. So the first package cut (k3a) breaks the api image, the web deploy, every OTA and every APK build. In or before k3a, replace all four with `pnpm turbo build --filter=<app>^...`. Also widen deploy-staging.yml:125's auto-OTA path filter from `apps/mobile packages/shared` to `packages/**`: changes in client-core, and later in the new packages, never trigger an OTA, so mobile drifts behind the web and api on B changes. Finally, add the new packages to e2e-areas graph.mjs ROOTS/ALIAS and select.mjs GRAPHED/PASS; without that, every K or cl PR falls back to the full e2e suite.
9. K3A AND K6B MISREAD THE IMPORTS. A Node `exports` target cannot point outside its own package, so `@ab/shared/i18n/*.json` cannot keep working once the JSON moves to @ab/i18n. That move means rewriting 122 files (129 imports: ar.json 43, en.json 86), the e2e-areas/i18n.mjs BUNDLES regex `^packages/shared/i18n/(ar|en)\.json$`, 2 i18n-literals.allow.json files and CLAUDE.md rule 10. Either size k3a at 130 or more files, or keep the JSON in packages/shared until a codemod PR does it. Separately, `@ab/shared/testing` has 10 importers that k6b must handle. So «apps import only the root barrel» (k1) is false: 139 subpath imports exist.
10. THE JSCPD CROSS-APP COUNT CHANGES MEANING WHEN SHARED SPLITS. jscpd-gate's unitOf treats each `packages/<x>` as one unit. Splitting shared into 12 packages turns clones that sit inside shared today into «cross-app» clones, so crossApp (25) rises on pure k-moves and the gate fails. In k1a, before the split, redefine the unit (all of packages/* as one unit, or count app↔app only), and update the gate's «move the shared code to packages/shared or packages/client-core» hint.
11. X0 IS NOT VERIFIED BY CI AND HAS NO CANARY. jest-expo's babel caller (jest-expo/config/getPlatformPreset.js) never sets supportsReactCompiler, and babel-preset-expo 57.0.13 turns the compiler on only from that caller flag. So jest-expo tests run uncompiled code. Mobile has no e2e, and CI never bundles with Metro (no `expo export` anywhere in .github). «CI + jest-expo» therefore checks nothing for x0, x2c, x4c or x5 on mobile. Add a jest project whose babel-jest caller sets supportsReactCompiler: true, and a CI `npx expo export --platform android` job. That job also catches Metro resolution errors and require-cycle crashes from the c* barrels before an OTA ships. «OTA to the preview channel first» is not a canary: preview is the channel the staff's installed APK listens to (docs/09), and deploy-staging auto-OTAs after every merge that touches apps/mobile. Use an EAS update rollout percentage or a separate channel and build, and turn off auto-OTA for x0. Also, «rollback is one flag» stops being true once x5 deletes memo.
12. THREE X2 REMOVALS REVERSE DOCUMENTED DECISIONS. apps/web/src/components/shell/layout/RouteFade.tsx says it «replays a Web Animation instead of re-keying, so the route below keeps its state, focus and scroll»; `key={pathname}` would remount <Outlet/> on every navigation. TextComposer.tsx:81 says the box «grows with its text… also where `field-sizing` is missing», so the effect IS the fallback, and jsdom cannot test the CSS. Mobile core/ui/connecting/use-screen-focus.ts deliberately avoids expo-router's useIsFocused «so it also works where a test mocks 'expo-router'» and returns true outside a navigator, where useIsFocused throws (6 users). Remove these 3 from the 59. Check the other 9 «platform feature» swaps one by one, and file any that survive as L with a test, not B.
13. R8 / R16 ORDERING AND SCOPE. r16's CI line «fails on any *queries.ts» would also fail on the 21 mobile *queries.ts hook files. cl5 renames those later, in phase 3 after c30. Either scope r16 to apps/api/**, or move the repo-wide line after cl5. On the db.module rule: 50 non-repository production files import the DB token, and 28 more import only `type { Db }` (helpers that take `db: Db`). Decide allowTypeImports explicitly; the plan's «55» counts only the first group.
14. UPDATE CLAUDE.MD FIRST, NOT IN «DONE WHEN». CLAUDE.md rule 1 literally prescribes `x.service.ts / x.queries.ts / x.mapper.ts`, docs/04:174 says the same, and every cloud routine follows CLAUDE.md. During r1–r15, which take weeks, routines will keep creating new *.queries.ts files. In g3, change CLAUDE.md rules 1–2 and docs/04. Also land the «no new *queries.ts» check in g3, as a shrink-only allow-list of today's 127 + 21 files.
15. SUPPRESSION CHURN WILL BREAK EVERY FEATURE PR. ESLint 10.11 exits with code 2 on any unpruned suppression (lib/cli.js: «There are suppressions left that do not occur anymore») unless --pass-on-unpruned-suppressions is passed, and CI runs plain `eslint .`. g3's max-len baseline alone would cover about 4,650 files and 11,200 string-free lines over 100 chars (api 1,566 files, web 1,285, mobile 1,180, shared 289, e2e 188), about 4× today's 1,157 suppressed files. Add the 497 long functions, 168 functions over complexity 10 and 172 effects on top. After that, any routine PR that shortens one baselined line fails lint, and nobody runs eslint locally (owner rule). Add a CI step that runs --prune-suppressions and prints the JSON to commit (or a bot commit), and write it into the routine instructions. Also consider running the M moves before g3, so each move rewrites the 1,157 existing keys rather than about 6,000.
16. RULE GAPS. (a) react-hooks/exhaustive-deps is 'warn' in recommended-latest 7.1.1, and CI has no --max-warnings 0, so it is invisible today. The ≈ 95 kept effects need it as an error, baselined in g3. (b) The §2.2 «watch after g3» bullet does not hold: set-state-in-effect is already an error in recommended-latest, develop's lint is green, and g3 does not touch react-hooks; delete the bullet. (c) No vitest config sets coverage thresholds, and CI runs `vitest run` without --coverage, so CLAUDE.md rule 4 (≥ 80 %) is not enforced anywhere. Add `coverage.thresholds` to the core/time/schedule/money packages instead of only promising them. (d) R11 misses tools/livekit/token-server.mjs, which is unlinted and has 158-char lines. (e) R2's selector, like typescript-eslint max-params (Arrow/FunctionDeclaration/FunctionExpression/TSDeclareFunction/TSFunctionType only), skips TSMethodSignature and TSEmptyBodyFunctionExpression; for example web classroom/board/model/draw.ts:10 `fillRect(x, y, w, h)` has 4 params.
17. FLAT-CONFIG COLLISIONS CAN SILENTLY DROP RULES. R2 puts its param selector in `no-restricted-syntax` in @ab/config, and R9 puts `React.useEffect` in `no-restricted-syntax` in the web and mobile configs. A later block replaces the earlier one for the same files, so R2 vanishes in both apps. Mobile already has two `no-restricted-imports` blocks (AppText for src+app *.tsx, feature-index for app/**). R9 must also cover *.ts hooks, and its exemption folders (core/hooks, effects/) must restate the AppText restriction. Keep every selector in @ab/config, and add a node --test in packages/config that calls ESLint#calculateConfigForFile on sample paths (mobile src/x.tsx, app/x.tsx, src/core/hooks/x.ts, an effects/ file, an api module file, an api *.settings.ts) and asserts each rule and selector is present.
18. SLICES TOO BIG TO REVIEW. 19 behaviour-bearing PRs are 90–120 files each and auto-merge when green: rq1 120, rq2 120, rq3 100, rq4 100, rq5 90, rq7 120, cl4a/b 110 each (L, query keys change), cl5a–c 120 each, cl6 120, x4a–c 100 each, s3a–b 90 each, s5a–b 120 each. Cap B PRs at about 40 files and one module. g1 bundles 5 tooling changes (ts-morph renames, suppression and knip key rewrites, pure-move rules plus the CI glob, mobile boundary regexes, e2e-areas recursion) into the gate that judges the next ~60 PRs; split it into g1a–g1d, each with its own tests. s7's «switch the package to prettier --check» is a whole-package reformat, not 30–60 files. Files with lines over 100 chars today: api 2,187, web 2,156, mobile 1,869, shared 454, e2e 242, about 7,000 in all. Run it in a freeze window with .git-blame-ignore-revs and a prettier-idempotence gate.
19. BEHAVIOUR CHANGES HIDDEN IN B PRS. k3b folds tools/migrate/src/time.ts into @ab/time, but the prod import is still owner-gated. Leave tools/migrate out of k3b until the prod import is done, or require byte-identical `migrate:dry` output on the cached snapshot in a cloud run. k2's switch of web inbox search.ts to the shared E164_RE stops matching 7-digit numbers; make it its own L PR with a test. Minor: the codemod changes 2 Nest Logger contexts (AlertsQueries.name, RulesQueries.name) and 23 describe('XQueries') titles; say so in the r PR bodies.
20. CL6 RISKS A DUPLICATE REACT. @ab/client-hooks would be the first workspace package that imports React (client-core is pure TS). If react and @tanstack/react-query sit as devDependencies inside packages/client-hooks, Metro and Vite resolve them from packages/client-hooks/node_modules. That gives two Reacts and two QueryClient contexts, shipped by OTA as «Invalid hook call» or «No QueryClient set». Before cl6: peers only (no dev copy), or pnpm dependenciesMeta.injected; Vite resolve.dedupe for react, react-dom and @tanstack/react-query; and the CI expo export bundle check above.
21. E2E FOLDER-CAP AND SELECTION DETAILS. folder-cap's TEST regex leaves *.spec.ts out of the count, so adding e2e to appRoots does not cap e2e/tests (2 code files + 179 specs). It also makes --strict fail at once on e2e/support (67 files) unless that folder is allow-listed. So R6 needs a spec-count rule for e2e/tests and a 9th allow-list entry, and «8 → 0» is wrong. In e2e-areas select.mjs, the PASS lookahead `support\/(?!global-setup|durations-reporter)` stops excluding global-setup once it moves to support/core/. A change that reaches global-setup would then pick a subset of specs instead of the full suite. Fix the lookahead in g1, before t1–t7.

## Owner amendment: absolute imports (2026-10-30, R12)

Owner, verbatim: «use the abslote paths for imports». Like the critic corrections, this section wins over any table above.

- **Rule.** No parent-relative module path (`../`) in the source and tests of apps/api, apps/web and apps/mobile: write the workspace alias `@/…` (→ `src/…`). Same-folder `./x` stays. Other workspaces stay `@ab/<pkg>`. Lint: `ab/no-parent-imports` (error, ESLint only: Oxlint has no bulk suppressions, and `guard:lint` fails when Oxlint runs a rule that has suppressed violations). The 9,036 existing paths are its one-time baseline in each app's `eslint-suppressions.json` (`eslint . --suppress-rule ab/no-parent-imports`, accepted by `guard:lint --configs`); `refactor/guards/lint.json` may only shrink. A path outside `src/` that the alias cannot name stays allowed (mobile: 95 into `app/` routes and `app.json`; web: 1 into `public/`).
- **Alias.** web and mobile already had `@/*` (Vite `resolve.alias`, Metro/Expo `paths`, jest `moduleNameMapper`). The api gets `paths: { "@/*": ["./src/*"] }` in its tsconfig.json (tsgo/tsc typecheck, ESLint, knip, and `@swc-node/register`, which reads `paths`, for `pnpm dev`), the same alias in vitest.config.mts (`resolve.alias`, as web), and `tsc-alias` after `tsc` in `build` (tsc does not rewrite paths): the built `dist/` holds relative `require()`s again, so `node dist/main.js`, the Dockerfile and the staging deploy run unchanged. The api `ab/module-boundaries` block gets `alias: { '@/': 'src/' }` so a deep `@/modules/x/y/internal` import is still caught.
- **Packages stay out (for now).** shared and client-core ship `dist/` that Node, Vite and Metro load; db is loaded as source by the api. A `#/…` subpath (`package.json` `imports`) must map to `src` for typecheck and vitest but to `dist` at run time in three resolvers, and lane K is about to split packages/shared into 12 packages (k1–k7), which rewrites those paths anyway. Each package created by lane K may adopt `#/*` → `./src/*` once it ships source-only or a proven dual mapping; until then `ab/no-parent-imports` is not on in packages/* or tools/*.
- **Tooling.** `pnpm imports:absolute -- <workspace|paths…> [--write]` (tools/scripts/imports/absolute-imports.mjs, node:test): deterministic, rewrites only `../` specifiers (static imports, export-from, `import()`, `import('x').T`, require, vi/jest mock paths) into `src/`, keeps `./` and everything else; dry run without `--write`. `move-module.ts` writes `@/` instead of `../` for every path it rewrites in an app with the alias. `pure-move-check` accepts a `../x` → `@/x` hunk that names the same file, and `ab/no-parent-imports` suppressions that shrink or go (never grow, never appear). The e2e-area graph resolves `@/` for the api as well as the web.
- **Every move or refactor PR from now on** writes `@/` imports in every file it creates or edits: after `move-module.ts` (or the edit), run `pnpm imports:absolute -- <the app files the PR touches> --write`, then `pnpm lint:prune` and `pnpm guard:lint -- --write`. Packages and tools keep their style.

### Sweep rows (lane G; one PR per workspace, codemod only)

| id | Scope | ≈ files | Type | Depends | Verified |
|---|---|---|---|---|---|
| abs-imports-1 | the rule, its baseline, the api alias, the codemod, these lane rules | ≈ 30 + 3 suppression files | L (config) | — | this row's PR |
| abs-imports-web | `pnpm imports:absolute -- web --write` (1,960 paths, 910 files), `lint:prune`, `guard:lint -- --write`: web's `ab/no-parent-imports` suppressions 1,960 → 0 | 911 | C | abs-imports-1 | CI + full e2e; second dry run prints 0 |
| abs-imports-mobile | the same for mobile (1,912 paths, 940 files) | 941 | C | abs-imports-1 | CI; `native-changes` «none»; second dry run 0 |
| abs-imports-api | the same for api (5,164 paths, 1,810 files); the last one also drops `ab/no-parent-imports` from `refactor/guards/lint.json` (total 0) | 1,811 | C | abs-imports-1 | CI + full e2e; the built `dist/` require graph equals develop's (file by file, every `require()` resolved to the same file) |

Branch `cloud/review-abs-imports-<ws>`, merged after review. Run a workspace's PR only when no open PR into develop touches that workspace's files (REST `pulls/<n>/files`), and freeze the workspace while it is open. On a conflict never hand-merge: reset the branch to develop and re-run the codemod (it is deterministic). Over the ≈ 150-file PR size on purpose: one mechanical change, checked by the codemod's second run, lint and CI.

