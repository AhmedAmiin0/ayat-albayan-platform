# 57 — Code quality rules R1–R16: audit, conventions, enforcement and lanes (owner 2026-11-21)

Owner, 2026-11-21: «set code quality rules and continue the refactor», «follow tdd to make sure the
code has no bugs or issues», «make sure to build a design system components and follow its rules».
This document is an **audit and a plan only**: the PR that adds it changes no code, lint config or
baseline. It measures `develop` at `14501246` (#776) and proposes how each rule is checked and in which
small PRs the gap closes. CLAUDE.md «Hard code rules» gets the new rules 14–21 (short, one line each to
comply), in the same PR. Nothing in §10 starts before the owner reviews this PR.

How it was measured (cloud session, never the owner's PC): `pnpm i --frozen-lockfile`; Node scripts
that count over `git ls-files` (regexes, listed per section; test files, `*.test-kit*`, `testing/` and
`test/` folders excluded unless stated); `vitest run --coverage` (v8, `@vitest/coverage-v8@5.0.3`
installed in the session only, not committed) and `jest --coverage` per package; the per-rule totals of
every `eslint-suppressions.json`; GitHub Actions history of `ci.yml` (60 latest completed runs). Regex
counts are close, not exact: each table says what it matched. «sw» = apps/staff-web, «sm» =
apps/staff-mobile, «fw» = apps/family-web, «fm» = apps/family-mobile, «wk» = packages/web-kit, «mk» =
packages/mobile-kit, «cc» = packages/client-core.

## Contents

0. Summary
1. Gap per rule R1–R16
2. Conventions (example trees, TDD loop per kind)
3. Performance audit (R10)
4. Events audit (R11)
5. Hooks audit (R12)
6. Zustand inventory (R13)
7. Testing audit (R14)
8. Design-system audit and target (R15)
9. Enforcement (checks, CI, baselines, oxlint parity)
10. Lanes, order, quick wins
11. Owner questions

## 0. Summary

- **Size is solved, shape is not.** R6 (≤ 150 lines) holds everywhere (only the two generated
  `routeTree.gen.ts` exceed it). The rest of the old v2 debt is still there: **20,189 suppressed ESLint
  violations** (api 7,142 · sw 4,656 · sm 4,112 · e2e 878 · others 1,401), 64 % of them `max-len`;
  37 `*queries.ts` files.
- **Components (R3/R5) are the biggest new gap:** 1,583 component files in the apps and kits declare
  their props/types inside the `.tsx` (sw 712, sm 506, wk 141, mk 140, fm 59, fw 25); 421 `.tsx` files
  define more than one component; 207 export non-component values.
- **Design system (R15):** one colour source exists (`packages/catalog/src/theme/theme.ts`) but the
  web CSS is a **hand-copied mirror** (`wk/src/styles/tokens.css`, kept honest by a diff test), and the
  **type scale already drifted** web ↔ phone (body 16 vs 15, h1 30 vs 32, sm 15 vs 14). Apps bypass the
  kits: sw has 355 Tailwind arbitrary values in 199 files, 66 raw `<button>`, 55 `<input>`, 13
  `<textarea>`, 46 `<a>`; sm has 88 raw `Pressable`, 10 `TextInput` and 1,243 inline style objects with
  raw numbers in 591 files. No showcase page exists on either platform.
- **Events (R11):** the API has **no domain event bus** (0 `EventEmitter`/`@OnEvent`); two hand-made
  typed listener classes (`LessonEvents`, `PackageEvents`, used by 33 files), 21 in-process `Ticker`
  sweep jobs, and Supabase Realtime only for the inbox, the student channel and calls. Clients poll in
  **36 places** (35 `refetchInterval` + 1 fallback timer; 9 more `setInterval`s are clocks).
- **Hooks (R12):** 232 `useEffect`/`useLayoutEffect` in non-test code (sm 81, sw 61, mk 50, wk 39, fm 1),
  51 `.tsx` files call one directly; `useMemo` 57, `useCallback` 77, `memo()` 31 (sm, sw, wk, mk). About 110 effects can go without React changes (§5).
- **State (R13):** about 50 hand-made `useSyncExternalStore` stores and listener sets, no state library.
- **Tests (R14):** line coverage is high (api 90.8 %, sw 97.2 %, sm 98.2 %, cc 96.3 %, shared 99.2 %)
  but nothing measures it in CI; the holes are api repositories (59.9 % lines / 42.5 % branches, 86 of
  209 under 50 %), web branches (sw 79 %, wk 73 %, fw 68 %) and the family apps (80–88 % lines). 46–82 % of the
  apps' logic files have no test beside them. No `.only`; 127 conditional `test.skip` in e2e, all with
  a reason string. Nothing enforces red-first; no coverage gate, no mutation testing.
- **Performance (R10):** the worst paths are N+1 reads on hot lists (sales renewals: one balance query
  per student; payout list: one ledger query per payout; inbox delta: per-message view rendering), 80
  `select('*')`, 59 `count: 'exact'`, unvirtualised web chat log and thread list re-rendered by a
  ticking clock, staff-web's `QueryClient` with `staleTime: 0`, 320 inline query-key literals (`threads`
  alone in 31 files) and `/auth/me` fetched from 7 places in sm.
- **Plan (§10):** foundations first (G: guards in warn-mode with baselines; DS: tokens generator +
  showcase + missing kit components, test-first), then mechanical codemods (props files, `max-len`),
  then behaviour lanes (events, stores, effects, N+1) in PRs of ≤ 150 files for moves and ≤ ~20 files
  for behaviour, **at most 2–3 PRs open at once**. Ten quick wins in §10.4.

## 1. Gap per rule R1–R16

Counts are non-test code. «Mixed file» = a `.ts` file that declares types *and* functions/classes.

| Rule | What was measured | api | sw | sm | fw | fm | wk | mk | cc + domain pkgs |
|---|---|---|---|---|---|---|---|---|---|
| R1 types apart | `.ts` logic files that also declare types (declarations) | 1,128 (2,733) | 276 (715) | 280 (611) | 10 (20) | 12 (21) | 82 (175) | 88 (171) | cc 172 (574), shared 123 (474), money 28, schedule 28 |
| R1 | dedicated `*.types.ts` / `types.ts` files | 9 | 3 | 3 | 0 | 0 | 1 | 2 | shared 3 |
| R2 small modules | `max-lines-per-function` suppressed | 1 | 133 | 90 | 0 | 0 | 8 | 4 | 0 |
| R2 | `complexity` suppressed | 387 | 220 | 178 | 0 | 0 | 21 | 12 | cc 22, shared 30 |
| R3 component only | `.tsx` files with > 1 component | — | 176 | 137 | 15 | 21 | 45 | 27 | — |
| R3 | `.tsx` files exporting non-component values | — | 125 | 47 | 1 | 1 | 22 | 11 | — |
| R4 UI in kits | component `.tsx` files in the app | — | 1,189 | 871 (+app/ routes) | 73 | 103 | 205 | 193 | — |
| R4 | generic UI kept in the app (`sw/src/components`, `sm/src/core/ui`) | — | 38 | 21 (6 are 2-line re-export shims of mk) | — | — | — | — | — |
| R5 props file | `.tsx` declaring a type/interface (props) | — | 712 | 506 | 25 | 59 | 141 | 140 | — |
| R6 ≤ 150 lines | files over 150 (excl. generated) | 0 | 0 (routeTree.gen 2,014) | 0 | 0 (routeTree.gen 362) | 0 | 0 | 0 | 0 |
| R7 zod | `ab/zod-inputs` + `ab/no-shape-checks` suppressed | 414 + 101 | 0 + 63 | 0 + 84 | 0 | 0 | 0 + 23 | 0 + 11 | cc 18, shared 8 |
| R7 | `typeof x === '…'` checks / `'k' in x` | 94 / 40 | 76 / 17 | 78 / 24 | 0 | 0 | 18 / 9 | 16 / 1 | cc 15 / 4 |
| R7 | inline `z.uuid()`/`z.string().uuid()` in apps (no shared id schema) | 79 across apps | | | | | | | `core/schemas/common.ts` has `phoneE164`, `timeZone`, `timeOfDay`, `requiredText` |
| R8 builders | `*.builder.ts` files | 0 (1 test) | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| R8 | test fakes/fixtures/test-kits (hand-written rows) | 257 files repo-wide; 387 literal `id: '…'` row lines in 325 test files | | | | | | | |
| R8 adapters | `*.adapter.ts` / ports | 2 adapters, 7 ports | — | — | — | — | `RoomClient` (dup) | `RoomClient` (dup) | `ApiClient`, `LiveClient` |
| R9 scale | in-process timers (`Ticker`), single instance by design | 21 jobs | — | — | — | — | — | — | — |
| R10 optimise | see §3 | N+1 ≥ 14 paths; `select('*')` 80; `count:'exact'` 59 | 302 `useQuery`, 0 virtualised lists | 160 `useQuery`, 36 FlatList vs 5 FlashList users | | | | | |
| R11 events | `EventEmitter`/`@OnEvent` | 0 | — | — | — | — | — | — | — |
| R11 | data polls (`refetchInterval` with an interval) + `setInterval` | 21 `Ticker` jobs | 12 + 2 | 12 + 1 | 0 | 0 | 4 + 3 | 3 + 3 | cc 4 + 1 |
| R12 compiler | `useMemo` / `useCallback` / `memo` | — | 34 / 19 / 2 | 21 / 39 / 27 | 0 | 0 | 2 / 17 / 1 | 0 / 2 / 1 | 0 |
| R12 | `useEffect` + `useLayoutEffect` | — | 57 + 4 | 79 + 2 | 0 | 1 | 38 + 1 | 48 + 2 | 0 |
| R13 zustand | hand-made external stores / listener sets (files) | — | 13 | 19 | 1 | 4 | 12 | 14 | cc 9 |
| R14 TDD | logic `.ts` without a sibling test (%) | 827 / 1,788 (46 %) | 291 / 546 (53 %) | 272 / 565 (48 %) | 18 / 22 | 37 / 46 | 77 / 149 | 100 / 183 | cc 19 %, money 26 %, schedule 33 %, settings 61 % |
| R15 design system | see §8 | | 355 arbitrary values, 66 `<button>`, 55 `<input>` | 1,243 raw-number style objects, 88 `Pressable` | 7 arbitrary, 3 `<button>` | 155 raw-number styles, 11 `Pressable` | 102 arbitrary | 260 raw-number styles | catalog theme |
| R16 server time | `Date.now()` / `new Date()` in non-test `.tsx` of the four apps (decisions and display mixed; to triage) | — | 55 across sw, sm, fw, fm | | | | | | `packages/time` formatters; booking «وقت آخر» (#781) already uses `server_now` |

Notes per rule (what is already there and what is missing):

- **R1.** docs/52 moved 152 shared declarations into packages; 231 more are listed there for a later
  slice (docs/52 §4) — that list is lane T1 below. Exception kept by this plan: a `z.infer` type stays
  beside its schema (`x.schemas.ts`), and file-private types of fewer than ~3 lines may stay. Top mixed
  files: `api/…/sign-in/sign-in.ports.ts` (18 declarations), `cc/teaching/lessons/teacher-lesson-plan.ts`
  (16), `cc/teaching/reports/v2-lines.ts` (16), `shared/schemas/feedback.ts` (16), `settings/defs.ts`
  (15), `cc/people/portal/portal-api.ts` (13).
- **R2.** Function size is enforced (≤ 50 lines; 236 suppressed). Reuse is not: the same screens exist
  per app (§8.2), duplicated adapters (`RoomClient` in wk and mk), 9 duplicated hook pairs noted by
  docs/32 §2.2 (e.g. `use-call-session` in sw and sm).
- **R3/R5.** Top multi-component files: `sm/src/inbox/shared/chat-icons.tsx` (14 components),
  `mk/src/ui/call/call-icons.tsx` (11), `sw/…/settings/hub/HubStatus.tsx` (8), `sm/…/values/sheet/ValueEditor.tsx`
  (6), `sw/…/templates/template-cells.tsx` (6). Icon sets are a deliberate exception candidate (Q2).
- **R4.** Generic UI still in apps: `sw/src/components/{data-table,table-toolbar,settings,shell}` (38
  files) and `sm/src/core/ui` (21: `SearchField`, `NativePicker`, `DatePickerField`, `TimePickerField`,
  `PickerRow`, `MonthHeader`, `PaidDayPicker`, `ReceiptPicker`, `LazyList`, `SectionLabel`,
  `LessonStatusChip`, `PhoneText`, …).
- **R6.** Enforced (`max-lines` 0 suppressed). Nothing to do.
- **R7.** Rule 12 is enforced by `ab/zod-inputs` and `ab/no-shape-checks` (515 + 208 suppressed). The
  gap is reuse: 79 inline uuid schemas in apps, 217 `z.object` in 111 app files; shared helpers exist
  only in `packages/core/src/schemas/common.ts` (5 helpers).
- **R8.** There is no builder anywhere; tests build rows by hand (fakes in 257 files). Adapters exist
  for Google (`google-client.port.ts`), WhatsApp (`WhatsappClient` in `whatsapp.types.ts`), LiveKit
  (`RoomClient` ×2), sign-in codes (2 `*.adapter.ts`), settings rules (`settings-rules.port.ts`); Stripe
  (7 files import `stripe` directly) and S3/MinIO (5 files import `@aws-sdk` directly) are not wrapped.
- **R9.** The `Ticker` comment says it: «one API instance … Move to pg_cron / pg-boss when the API
  scales out». Module-level stores and in-memory caches (`memory-cache.store.ts`) assume one process;
  a Redis cache exists (`common/infra/cache/redis-*.ts`). §4 and §10 make events the scale path.

## 2. Conventions

File naming (all kinds): kebab-case for non-component files, PascalCase for a component and its props
file; the suffix says the role. One role per file.

| Suffix | Holds | Where |
|---|---|---|
| `Name.tsx` | one React component, nothing else | kit or app feature folder |
| `Name.types.ts` | that component's props and its local types | beside `Name.tsx` |
| `x.types.ts` | types and interfaces of a module (no runtime code) | module folder, or a package |
| `x.schemas.ts` | zod schemas + their `z.infer` types | `packages/shared/src/<domain>/` (contracts), module (private) |
| `x.service.ts` / `x.repo.ts` / `x.mapper.ts` / `x.controller.ts` | api layers (rule 1) | `apps/api/src/modules/<domain>/<module>/` |
| `x.port.ts` | an interface around an outside service or a platform difference | package (`client-core`, `shared`) or api `common/` |
| `x.<impl>.adapter.ts` | one implementation of a port | beside the port, or in the app that owns the platform |
| `x.registry.ts` | picks the adapter (by env, provider, platform) | beside the port |
| `x.builder.ts` | test-data builder (`aLesson().held().build()`) | `testing/` folder of the package that owns the type |
| `x.store.ts` | a zustand vanilla store | `packages/client-core/src/<domain>/` |
| `use-x.ts` | a hook (selector hook, query hook, effect hook) | beside what it serves |
| `x.keys.ts` | a TanStack Query key factory | `packages/client-core/src/<domain>/` |
| `x.events.ts` | a domain event catalogue (names + zod payloads) | `packages/shared/src/<domain>/` |
| `x.listener.ts` | an api listener of domain events | api module that reacts |
| `Name.showcase.tsx` | the showcase entry of a kit component | beside the component in the kit |
| `x.test.ts(x)` | its test, split by scenario (`x.empty.test.ts`) | beside the file |

### 2.1 Web component (kit)

```
packages/web-kit/src/components/ui/form/button/
  Button.tsx             // export function Button(props: ButtonProps) — nothing else
  Button.types.ts        // export interface ButtonProps; export type ButtonVariant = …
  button.variants.ts     // cva() table (logic, testable on its own)
  Button.test.tsx        // red first: variants, disabled, loading, focus, RTL, 44 px
  Button.showcase.tsx    // every variant × size × state, light/dark, ar/en
  index.ts               // export { Button } from './Button'; export type * from './Button.types'
```

Before (today, `wk/src/components/ui/form/button.tsx`): `buttonVariants`, `ButtonProps` and the
`forwardRef` component in one file. After: the three files above; `ref` becomes a prop (React 19).

### 2.2 Mobile component (kit)

```
packages/mobile-kit/src/ui/form/search-field/
  SearchField.tsx            // TextInput wrapped once, tokens only, logical start/end
  SearchField.types.ts
  search-field.style.ts      // StyleSheet built from theme tokens (no raw numbers)
  SearchField.test.tsx       // jest-expo + @testing-library/react-native
  SearchField.showcase.tsx
  index.ts
```

### 2.3 API module

```
apps/api/src/modules/finance/payouts/
  payouts.controller.ts      // routes; parses with shared schemas; no logic
  payouts.service.ts         // use cases; emits domain events
  payouts.repo.ts            // class PayoutsRepo: the only file that injects DB
  payouts.mapper.ts          // row → view (pure)
  payouts.types.ts           // module-private types
  payouts.listener.ts        // reacts to other modules' events
  payouts.module.ts
  index.ts
  *.test.ts                  // beside each file; repo tests use the table builders
packages/shared/src/money/payouts.schemas.ts   // request/response contract + z.infer types
packages/shared/src/money/payouts.events.ts    // payout.generated, payout.paid …
```

### 2.4 client-core feature

```
packages/client-core/src/finance/payouts/
  payouts.api.ts         // typed calls (ApiClient port), parse with shared schemas
  payouts.keys.ts        // payoutKeys.all / list(filters) / detail(id): the only key source
  payouts.query-options.ts // queryOptions() per endpoint, one per endpoint (not `*.queries.ts`, rule 1)
  payouts.events.ts      // event → keys to invalidate (map, not if-chains)
  index.ts
apps/staff-web/src/features/finance/payouts/use-payouts.ts  // thin hook: useQuery(payoutsList(f))
```


### 2.5 Shared contract + zod module

```
packages/core/src/schemas/          // primitives: id(), phoneE164, timeZone, isoUtc, money(), page()
packages/shared/src/<domain>/
  x.schemas.ts     // export const payoutView = z.object({ id: id(), … }); export type PayoutView = z.infer<…>
  x.schemas.test.ts// accepts/rejects (red first: the bad payload)
  index.ts
```

Helpers to add in `packages/core/src/schemas`: `id()` (uuid), `isoUtc()`, `dateOnly()`, `money()`,
`studentCode()` (`AB-nnnn`), `pageOf(schema)`, `listQuery(keys)`, `parseOr(schema, value, fallback)`.

### 2.6 Adapter

```
packages/client-core/src/teaching/room/
  room.port.ts                 // interface RoomClient (today duplicated in wk and mk)
packages/web-kit/src/classroom/room/livekit/room.livekit-web.adapter.ts
packages/mobile-kit/src/room/native/room.livekit-native.adapter.ts
packages/client-core/src/teaching/room/testing/room.fake.adapter.ts
apps/api/src/common/payments/
  payments.port.ts             // PaymentsGateway: createLink, verifyWebhook, refund
  payments.stripe.adapter.ts   // the only file importing 'stripe'
  payments.registry.ts         // provider by env (zod-parsed)
  payments.fake.adapter.ts     // tests and e2e
```

### 2.7 Builder (test data)

```
packages/shared/src/testing/builders/
  lesson.builder.ts      // aLesson().forStudent(s).at('2026-11-21T16:00Z').held().build()
  student.builder.ts     // aStudent().code('AB-0001').tz('Asia/Riyadh').build()
  builder.ts             // tiny base: defaults + with() + build(); ids from a seeded counter
  index.ts
apps/api/src/common/testing/builders/
  db-rows.builder.ts     // DB row shapes from @ab/db types, for repo tests
```

Before: 387 hand-written `id: '…'` row lines across 325 test files. After: one default per type; a test
states only what it is about (`aSubscription().expired().build()`).

### 2.8 Zustand store

```
packages/client-core/src/messaging/composer/
  draft.store.ts        // createStore<DraftState>()(persist(…, { storage: draftStorage }))
  draft.store.test.ts   // vanilla: store.getState().set('…'), no React
  draft.types.ts
  index.ts
packages/client-core/src/core/storage/
  persist.port.ts       // StateStorage
apps/staff-web/src/lib/storage/persist.session.adapter.ts   // sessionStorage
packages/mobile-kit/src/lib/storage/persist.async.adapter.ts// AsyncStorage
apps/*/…/use-draft.ts   // const text = useStore(draftStore, (s) => s.byChat[phone] ?? '')
```

Server data never enters a store; socket events either invalidate a query key or update client-only
state (connectivity, presence of the call screen, seen markers).

### 2.9 Domain event

```
packages/shared/src/events/
  catalogue.ts          // EVENTS = { 'lesson.held': lessonHeld, 'payment.recorded': … } (zod payloads)
  event.types.ts        // DomainEvent<K> = { name: K; payload: z.infer<EVENTS[K]>; at; id }
packages/shared/src/teaching/lesson.events.ts
apps/api/src/common/events/
  event-bus.port.ts     // publish(event), on(name, listener)
  event-bus.in-process.adapter.ts   // today (one instance); outbox + pg-boss adapter when scaled out
  events.outbox.repo.ts // insert in the same transaction; dedup key = event id (rule 8)
apps/api/src/modules/finance/subscriptions/alerts/alerts.listener.ts // on('lesson.held')
packages/db migration: realtime.send(topic 'events:staff', event name, ids) from the outbox
packages/client-core/src/core/events/
  event-invalidate.ts   // Record<EventName, (payload) => QueryKey[]>
  live-events.ts        // one Realtime channel → zod parse → invalidate / store update
```

### 2.10 Design-system component

`tokens (catalog/theme) → generated tokens.css + mobile theme → Name.types.ts → Name.test.tsx (red)
→ Name.tsx (green) → Name.showcase.tsx → design review (heuristic-evaluation, design-qa-checklist,
critique-brand-consistency on the showcase) → app migration PRs`.

### 2.11 The TDD loop per kind

| Kind | Test helper | Where the test lives | First red test |
|---|---|---|---|
| pure function (money, schedule, phone) | vitest + builders | `x.test.ts` beside it | the edge: empty, boundary, invalid |
| zod schema | vitest `safeParse` | `x.schemas.test.ts` | the rejected payload |
| api repo | builders + a fake `Db` (`common/db/*.test-util`) or the CI Supabase e2e | beside the repo | the query shape (filter, range, order) |
| api service / listener | Nest testing module + fake ports | beside it | the failure path (port throws, conflict) |
| api controller | `openapi.test.ts` + supertest-like inject | beside it | 400 on a bad body |
| client hook | `@testing-library/react` `renderHook` + `QueryClient` per test | beside it | error state, then data |
| zustand store | vanilla `store.getState()` | `x.store.test.ts` | the transition that must not happen |
| web component | vitest + RTL + axe | `Name.test.tsx` | disabled/loading/focus/RTL |
| mobile component | jest-expo + RNTL | `Name.test.tsx` | `accessibilityState`, 44 pt |
| event | catalogue parse + listener test + client invalidate map test | beside each | a malformed payload is dropped |
| journey | Playwright (CI only) | `e2e/tests/<area>/` | the six journeys of docs/03 §5 |

## 3. Performance audit (R10)

### 3.1 The 15 most expensive DB paths (api)

The data layer is supabase-js (PostgREST) over 193 `*.repo.ts` + 16 `*.queries.ts`, 1,044 `.from()`
calls, 90 RPCs. Found by a loop scan (an `await` on a repo/DB inside `for`/`.map(async)`, 70 hits, the
hot request paths kept), the `readAll` callers (22 files that page through a whole window into memory),
`select('*')` (80) and `count: 'exact'` (59). Ranked by how often the path runs × rows it touches.

| # | Path | Problem | Fix (test-first: assert the number of DB calls with a counting fake `Db`) |
|---|---|---|---|
| 1 | `sales/sales-money/reads/sales-renewals.ts:23` (every sales list) | one `packages.studentBalance()` per student = 2+ queries × page size | one `v_subscription_balance` read `.in('student_id', ids)` (readChunked), map in memory |
| 2 | `finance/payouts/payouts.ledger.ts:41` `annotate()` (payout month list) | one `paidOnLessons()` per unpaid payout | one read for every lesson id of the page, grouped by payout |
| 3 | `messaging/inbox/delta/sync-views.ts:38`, `thread-delta.service.ts:83`, `sales-threads.service.ts:67` (every inbox poll and sync) | `MessageViews.view()` per message: relay template lookup per row, a signed document URL per template row, CRM text per row | batch: collect template names/keys first, one lookup; sign URLs in one storage call; cache signed URLs until near expiry |
| 4 | `reporting/dashboard/dashboard.queries.ts:32,41,91`, `finance/finance.queries.ts:17,34`, `work/work.queries.ts` (dashboard) | `readAll` pulls every lead/lesson/payment/payable lesson of the window into Node to count and sum | SQL aggregate views or one RPC per card (`count`, `sum` … `group by`), cache 60 s per window |
| 5 | `finance/subscriptions/alerts/alerts.service.ts:56` `evaluateStudents()` (after every lesson change) | per student: recompute + raise + closeTasks + renewal = 4+ round trips each | batch recompute by ids; emit `subscription.balance-changed` once per student and let listeners run off the request (§4) |
| 6 | `teaching/scheduling/occurrences/horizon.job.ts:65` (daily) | per active rule a generate + insert | set-based RPC `generate_occurrences(rule_ids[])` with `unique(rule_id, starts_at)` (rule 8 already holds) |
| 7 | `finance/payouts/payouts.generate.ts:31` (month close) | per teacher reads + writes in sequence | one projection read for all teachers; one upsert batch |
| 8 | `messaging/numbers/config/numbers.config.ts:119,129` | a Vault secret read per line on every config read | one secrets read for all ids; the config is already cached — cache the overlay too |
| 9 | `teaching/classroom/recordings/recording-list.service.ts:33`, `finance/payments/attachments/payment-attachments.service.ts:70` | a signed URL per row | one `createSignedUrls(paths)` call; sign lazily on open |
| 10 | `teaching/lessons/lessons.repo.ts:45,115` (`readAll` on lesson lists) | the calendar and lists page through **every** lesson in range | keyset pagination (`starts_at, id`) + the UI asks for a week/page; `readAll` only in jobs |
| 11 | `sales/sales/assign/sales-assign.service.ts:54`, `teaching/booking/extend/course-extend.service.ts:53`, `course-pause.lessons-back.ts:54` | one update per lead / rule | one `.in('id', ids)` update or an RPC |
| 12 | `messaging/push/*` callers: `family-push.service.ts:41`, `lesson-live.push.ts:43`, `schedule-notices.service.ts:74`, `teacher-alert.service.ts:78`, `reminders.job.ts:146` | `notifyProfiles()` awaited per target, in the request | enqueue one push job per batch (outbox), send off the request |
| 13 | `select('*')` (80; 36 on tables with wide rows, e.g. `message_templates` ×5, `expenses` ×3) | reads every column, defeats index-only scans, larger payloads | explicit column lists (one `X_SELECT` const beside the row type, like `LESSON_SELECT`) |
| 14 | `count: 'exact'` (59; `v_student_list` ×2, `students` ×2, `messages` ×2, `v_threads`) | exact count = full scan of the filtered set on every page | `count: 'estimated'` for list headers, exact only on small sets; or «more» paging without totals |
| 15 | filters on columns with no index leading on them (scan of migrations vs `.eq/.in/.order` in repos): `lessons.status` 22 uses, `lesson_reports.status` 13, `profiles.role` 13, `subscriptions.starts_on` 10, `students.status` 10, `lessons.ends_at` 10, `teachers.status` 9, `subscriptions.created_at` 9 | likely seq-scans or filter-after-index | EXPLAIN each in CI (e2e job's Supabase) first; partial indexes such as `lessons (teacher_id, starts_at) where status = 'scheduled'`; most of these may already be second columns of a composite index — check, do not add blindly (load `supabase-postgres-best-practices`) |

### 3.2 Duplicated client requests

- **Query keys are hand-written:** 320 inline `queryKey: [` literals; the root `threads` is spelled in
  31 files, `sales` in 20, `leads` in 12, `lessons` in 6. One typo = a stale screen after a write.
  Target: a key factory per domain in client-core (`x.keys.ts`, §2.4) and `queryOptions()` per
  endpoint; a lint rule bans a literal `queryKey` outside `*.keys.ts`.
- **Same endpoint, several hooks:** 48 of 107 endpoints are fetched from more than one file. `/auth/me`
  from 7 files in sm (`use-needs-setup.ts`, `use-may-invite-phones.ts`, `use-toggle-rule.ts`, …),
  `/students/:id` 6, `/me/profile` 3 (sw, cc, mk each with its own), `/settings` 3, `/sales/schedule` 3,
  `/lessons` 3, `/invoices/:id` 3, `/students/teacher-options` 3. Different keys for the same URL mean
  two requests and two caches. Target: one `queryOptions` per endpoint in cc, `select` for slices.
- **No default freshness on staff-web:** `apps/staff-web/src/boot.tsx:10` `new QueryClient()` →
  `staleTime: 0`: every mount and every window focus refetches every query on screen; 36 call sites
  patch it one by one. family-web uses 30 s; the phone apps rely on focus manager + persistence.

### 3.3 Caching opportunities

1. staff-web `QueryClient` default `staleTime: 30_000` (as family-web) — per-query overrides already
   exist where freshness matters (inbox, calls).
2. API read-through cache (the Redis `shared-cache.ts` exists, used by 8 modules) for: settings reads
   (`*Settings.read()` is awaited at the top of many services, e.g. alerts, sales renewals), template
   catalogue (already), `/auth/me` zone and role (`me-zone.repo.ts` runs 3 queries each call), teacher
   options, dashboard cards (60 s), public config. Invalidate from events (§4), never by timer alone.
3. HTTP: `Cache-Control: private, max-age` + `ETag` on read-mostly GETs (settings, catalogue, teacher
   options); TanStack keeps the data, the server answers 304.
4. Signed storage URLs: cache per path until 80 % of their life (item 9 above).

### 3.4 Heavy renders

- **Web chat log not virtualised:** `sw/…/inbox/messages/components/MessageLog.tsx:125` maps every
  loaded message (with nested ternaries) into the DOM; the list grows with «load older». Thread list
  `sw/…/inbox/threads/list/ThreadResults.tsx:33` renders every thread and re-renders all rows on each
  `useNow()` tick. No `@tanstack/react-virtual` anywhere in the web apps. Target: virtualise both
  (TanStack Virtual, already in the TanStack family of the stack), move the clock into the row's time
  cell only.
- **Phone lists:** 36 `FlatList`/`SectionList` in sm vs FlashList used through `LazyList` (5 files);
  the chat `MessageList.tsx` is a FlatList with 27 hand `memo()` rows relying on stable callbacks
  (blocks R12, §5). Target: `LazyList` (FlashList v2) everywhere a list can exceed ~50 rows.
- **Wide contexts:** 18 `createContext` in sw, 13 in sm; `ChatActionsContext`, `ReplyActionsContext`,
  `ChatSearchContext`, `InboxModeContext`, `ChatAnchorContext` wrap the whole thread, so any value change
  re-renders every bubble. With the compiler, a context value that is a fresh object each render defeats
  memoisation. Target: move changing client state to zustand selectors (§6); keep contexts for stable
  values only.

## 4. Events audit (R11)

### 4.1 What exists

| Piece | Where | Used for |
|---|---|---|
| In-process typed listener classes | `apps/api/src/common/infra/events/lesson-events.ts`, `package-events.ts`, `schedule-change.ts` (33 importing files) | lessons changed → balance alerts; package paid; schedule change → notices. Listeners are awaited in the writer's request; a failing one is logged |
| `Ticker` (in-process interval, single flight) | `apps/api/src/common/jobs/ticker.ts`, 21 jobs | reminders, follow-ups, alerts, auto-held, horizon, rating, push receipts, retention, catch-ups, sender lanes (`SENDER_POLL_MS`), crm confirm, family push, short-link expiry, max meeting duration, course pause, student expiry |
| Supabase Realtime **broadcast** from DB triggers | migrations `…000860_inbox_realtime.sql`, `…000500_inbox_live_rows.sql` (`realtime.send(…, 'thread_changed', 'inbox:staff')`) | inbox: thread changed → clients re-read |
| Supabase Realtime **postgres_changes** | `cc/messaging/channels/channel-live.ts` (`channel_messages`), `cc/messaging/calls/calls-realtime.ts` | student channel, calls |
| Realtime presence | `cc/messaging/channels/presence-live.ts`, `presence-watch.ts` | who is online in a channel |
| Webhooks in | `messaging/webhook/*` (Meta, Evolution, Kapso), Stripe, LiveKit | outside events into the API |
| No pg-boss / pg_cron jobs from the API, no socket gateway, no `EventEmitter` | — | — |

### 4.2 Polling sites (clients)

36 data polls (35 `refetchInterval` + the sm sync-engine fallback timer); 9 other `setInterval`s are
clocks/animations (ringtone, elapsed timers, `use-now`, recorder, board frames) and stay.

| Area | Files (interval) | Event that replaces it |
|---|---|---|
| Inbox list/thread/unread/badge | sw `inbox/api/api.ts`, `thread-delta.ts`, `thread-query.ts`, `unread/unread-count.ts`; sm `thread-poll.ts` ×2, `use-thread-list.ts`, `use-inbox-badge.ts`, `sync-engine.ts` | already live (broadcast); keep the poll as a slow fallback only (it is: `liveInterval`) |
| Sales boards | sw `sales/sales/academy-api.ts` ×2; sm `sales/sales/lib/sales-api.ts` ×2 (`LIVE_REFRESH_MS`) | `lead.*`, `lesson.booked`, `payment.recorded` |
| Teacher «اليوم» | sw `teaching/teacher/api.ts`, `reporting/reports/api.ts` (`TEACHER_REFRESH_MS`); sm `teacher/lib/queries.ts` ×2 | `lesson.*`, `report.submitted` |
| Presence | sw `platform/presence/api.ts` (1 min); sm `users/presence/use-staff-presence.ts`; mk `channel/use-channel-presence.ts` | Realtime presence (exists for channels) |
| Student channel + seats | sw `student-channel/seat/use-channel-seat.ts`; sm `student-file/channel/*` ×2; wk `components/channel/api.ts` ×2; mk `channel/channel-api.ts` | already live (postgres_changes); poll = fallback |
| Calls | cc `messaging/calls/calls-api.ts` ×2 (10 s) | already live; poll = fallback |
| Family portal | cc `people/portal/portal-api.ts` ×2 (`PORTAL_REFRESH_MS`) | `lesson.*`, `report.published`, `channel.message` for the guardian topic |
| Notifications bell | wk `push/notifications-api.ts` (30 s); mk `notifications/use-notifications.ts` | `notification.created` (topic per profile) |
| Meetings, recordings, links | sw `meetings/internal/internal-api.ts` (30 s), `classroom/student-link/StudentLinkPage.tsx`; wk `classroom/recordings/RecordingsPanel.tsx` (30 s) | `meeting.*`, `recording.ready` |
| Payment link wait | sm `sales-subscribe/payment-link/link-api.ts` (2 s while open) | `payment.link-paid` (Stripe webhook) — keep the poll as fallback while the sheet is open |

Server side: of the 21 tickers, **catch-ups and sweeps stay** (they are the safety net and what detects
a missed webhook or a server that was down: `inbound-catchup`, `external-catchup`, `crm-confirm`,
`push-receipts`, retention ×3, `horizon`). Tickers that only find «what changed since last tick»
become listeners: `subscription-alerts` (after `lesson.*`/`payment.*`), `family-push`, `lesson-rating`
(after `lesson.held`), `lessons-auto-held` stays time-based (a clock event), `reminders` stays
time-based but reads a due-queue instead of scanning.

### 4.3 Coupling after writes that events remove

- Writers call other modules directly after a write: `packages.service.ts:63` → `events.paid` →
  alerts; `course-change.notices.ts:40` → notices; `schedule-notices.service.ts:74` → push per target;
  `teacher-alert.service.ts:78` → push; `alerts.service.ts` → renewal + tasks + messages. Each adds
  latency to the request and a failure mode to the write.
- Client mutations invalidate by hand: `invalidateQueries` in 235 files (sw 149, sm 75); the same write
  invalidates different keys in web and phone. With a server event per write, the invalidation map
  lives once in cc (`event-invalidate.ts`) and other people's screens update too.

### 4.4 The first events to add (in order)

1. **Infrastructure:** `packages/shared/src/events/catalogue.ts` (names + zod payloads, ids only — no
   personal data in the payload), api `event-bus.port.ts` + in-process adapter + outbox table
   (`domain_events`, id = dedup key, rule 8) written in the same transaction as the change; one DB
   trigger `realtime.send` per outbox row to a role topic (`events:staff`, `events:guardian:<id>`) with
   RLS on `realtime.messages` (pattern of migration 000860).
2. `lesson.changed` (replaces `LessonEvents.changed`; booked, moved, cancelled, held, attendance) →
   alerts listener, teacher «اليوم», calendar, family portal.
3. `payment.recorded` / `subscription.balance-changed` → sales boards, student file, renewal alerts.
4. `report.submitted` / `report.published` → teacher reports list, family reports «جديد».
5. `lead.changed` → sales boards (removes `LIVE_REFRESH_MS` polling).
6. `notification.created` → bell (removes 30 s polls on wk and mk).
7. Later: `meeting.*`, `recording.ready`, `presence.*` via Realtime presence.

Client side: `cc/core/events/live-events.ts` joins one channel per signed-in role (reuse
`live-connect.ts`'s rejoin/backoff), parses with the catalogue, and runs `Record<EventName, Handler>`
— invalidate keys from the key factory or write client state into a zustand store. Polls drop to the
fallback interval while the socket is live (the inbox pattern `liveInterval(live, ms)`).

## 5. Hooks audit (R12)

The React Compiler builds all four apps and both kits (web `packages/config/vite.js` `reactCompilerPreset`;
phones `app.json` `experiments.reactCompiler`). Lint already bans `useMemo`/`useCallback`/`memo` and raw
effects outside hook files (`packages/config/eslint-react.js`); today's uses sit in the suppression
baselines (`no-restricted-syntax`: sm 113, sw 68, wk 18, mk 15).

### 5.1 Memo

| | useMemo | useCallback | memo() | top files |
|---|---|---|---|---|
| sw | 34 (27 files) | 19 (12) | 2 | `finance/teacher-earnings/SessionsPanel.tsx` (3), `finance/expenses/ExpensesPage.tsx`, `finance/payouts/list/PayoutsPage.tsx`, `messaging/notification-rules/rule-drafts.ts`, `platform/settings/values/hooks/use-row-saves.ts` (5 cb), `use-value-drafts.ts` (3 cb) |
| sm | 21 (18) | 39 (31) | 27 (24) | `inbox/thread/calls/state/use-call-session.ts`, `inbox/thread/components/ChatActionsProvider.tsx`, `inbox/threads-list/use-thread-list.ts`, `ThreadRow.tsx` (3 cb), `sales/…/AttendanceLogScreen.tsx` (3 cb); `memo()` rows: `core/ui/lists/ReportRows.tsx` (4), `MessageRow.tsx`, `MessageBubble.tsx`, `LeadRow.tsx`, `InvoiceRow.tsx`, `SessionItem.tsx`, `PaymentItem.tsx`, `FeedbackRow.tsx` |
| wk | 2 | 17 (9) | 1 | `classroom/room/livekit/use-room.ts` (5 cb), `classroom/board/use-pen.ts` (4 cb) |
| mk | 0 | 2 | 1 | — |

How to delete safely (per file, one PR per feature folder):

1. **Prove the compiler compiles it.** Run the build with the compiler logger
   (`babel-plugin-react-compiler` `logger.logEvent`, `panicThreshold: 'none'`) in a small script
   `tools/scripts/compiler/compiled-report.mjs` that prints, per file, `CompileSuccess` /
   `CompileError` / `CompileSkip` with the reason. A file is eligible only on `CompileSuccess` for every
   component and hook in it. The same report runs in CI (§9) so a file that stops compiling is seen.
   Add `eslint-plugin-react-hooks` v7's compiler rules (`react-hooks/purity`, `refs`,
   `set-state-in-render`, `immutability`, … — the package is already a dependency) so the reasons a
   file bails out are lint errors.
2. **Test first:** a render-count test where identity matters (FlatList rows: `MessageRow` must not
   re-render when a sibling changes; `use-room` callbacks stable across renders) — written against
   today's code, green, then the memo is deleted and it must stay green.
3. Delete `useMemo`/`useCallback`/`memo`, prune the suppression in the same PR.

### 5.2 Effects (232 non-test; 51 `.tsx` files call one directly)

Classified by reading the effect body (script: classify by the first matching pattern, then read the
«other» bucket by hand; docs/32 §2.2 had 172 on an older tree with the same classes).

| Class | sw | sm | wk | mk | fm | total | Fix |
|---|---|---|---|---|---|---|---|
| Outside subscription (AppState, NetInfo, listeners, realtime, store.follow/watch, push) | 11 | 18 | 10 | 10 | 1 | 50 | keep, but inside one named shared hook each (`useAppState`, `useNetInfo`, `useRealtime`, `useStoreSubscription`); socket → zustand (§6) |
| DOM / imperative ref (focus, scroll, play/pause, Animated) | 14 | 4 | 6 | 9 | 0 | 33 | many → ref callback with cleanup (React 19), `autoFocus`, CSS `field-sizing: content`; rest stays in `use-*` hooks |
| Event-driven («if X then act») | 10 | 18 | 3 | 4 | 0 | 35 | move into the handler / mutation `onSuccess` / route `beforeLoad` |
| Cleanup only (`() => () => clearTimeout(…)`) | 8 | 13 | 3 | 6 | 0 | 30 | shared `useTimeout`, `useObjectUrl`, `useUnmount` in cc/kits |
| Timer / poll | 5 | 9 | 6 | 8 | 0 | 28 | shared `useInterval`/`useNow`; data polls → events (§4) |
| Latest prop into a ref | 1 | 7 | 5 | 0 | 0 | 13 | `useEffectEvent` (React 19.2) |
| Fetch / mutate / invalidate | 6 | 4 | 0 | 1 | 0 | 11 | TanStack query/mutation; the changing value goes into the `queryKey` |
| Derived / reset state | 0 | 0 | 0 | 1 | 0 | 1 | compute during render / `key` reset |
| Other (read case by case) | 6 | 8 | 6 | 11 | 0 | 31 | mostly store wiring in call/room state (`use-call-session.ts` ×4, `use-room-lifecycle.ts` ×3) → zustand + one subscription hook |

So **≈ 110 effects can go** (event-driven 35, cleanup 30 → shared hooks, latest-ref 13, fetch 11,
derived 1, about half of DOM 33 → ref callbacks), **≈ 120 stay** in named shared hooks (subscriptions,
timers, imperative media). Top files: `sm/inbox/composer/voice/use-voice-guards.ts` (4),
`sm/inbox/thread/calls/state/use-call-session.ts` (4), `sm/core/push/useNotificationHandling.ts` (3),
`sm/inbox/messages/media/VoicePlayback.tsx` (3), `sm/inbox/thread/local/use-stored.ts` (3),
`sw/messaging/calls/state/use-call-session.ts` (3), `mk/room/state/use-room-lifecycle.ts` (3),
`wk/classroom/board/use-board-share.ts` (3). The 51 `.tsx` files with a direct effect start with
`sm/app/_layout.tsx`, `sm/core/ui/form/SearchField.tsx`, `sm/inbox/composer/voice/MicHold.tsx`,
`sm/inbox/lists/components/ChatListChips.tsx`, `sm/inbox/messages/components/MessageList.tsx`,
`sm/inbox/messages/days/DayCell.tsx`, `sm/inbox/messages/media/VideoModal.tsx`, `VoicePlayback.tsx`.

## 6. Zustand inventory (R13)

No state library today; each store is a module-level value + a `Set` of listeners + a
`useSyncExternalStore` hook, often with hand-written AsyncStorage/localStorage effects. Target: zustand
v5 `createStore` (vanilla) in cc, a selector hook per platform, `persist` with a storage adapter
(§2.8). Server data stays in TanStack Query (several of today's stores mirror API data and become
queries, marked «→ query»).

| Today (path) | Holds | Target store (cc) | Persist |
|---|---|---|---|
| sm `inbox/composer/draft-store.ts`, sw `inbox/composer/lib/draft-store.ts`, sw `composer/free-text/use-carry-text.ts` | unsent text per chat | `messaging/composer/draft.store.ts` (one for both apps) | sm: AsyncStorage; sw: sessionStorage |
| sw `saved-replies/lib/staged-store.ts` | staged attachment per chat | same composer store (slice `staged`) | session |
| sm `inbox/thread/anchor/own-send.ts`, sw `composer/lib/own-send.ts`, cc `chat-send/pin-store.ts`, sm `thread/send/pinned-send.ts` | this device's sends / pinned request ids | `messaging/chat-send/send.store.ts` | no |
| sm `inbox/messages/hooks/seen-rows.ts` | rows shown at least once | `messaging/thread/seen-rows.store.ts` | no |
| sm `inbox/thread/anchor/use-search-request.ts`, `anchor/listeners.ts` | anchor / jump request | `messaging/thread/anchor.store.ts` | no |
| sm `inbox/thread/live/inbox-live.ts`, sw `inbox/api/live.ts`, cc `messaging/inbox/live-store.ts` | socket live/dropped | `core/live/live.store.ts` (written by socket events) | no |
| sm `inbox/thread/local/{store-reader,use-stored,watches}.ts`, `thread/store/message-store.ts` | the phone's local message DB (docs/43) | stays a DB-backed store (it *is* the offline cache); expose through a zustand slice for «rows of chat X» | SQLite (as today) |
| sm `inbox/thread/calls/state/use-call-session.ts`, sw `calls/state/use-call-session.ts`, cc `messaging/calls/call-store.ts`, `calls-ui.ts` | call session (ringing, live, muted, notice) | `messaging/calls/call-session.store.ts` (shared; platform media through a port) | no |
| sw `inbox/lists/lib/{member-queue,use-membership}.ts` | optimistic list membership | → TanStack mutation + `onMutate` optimistic update (server data) | — |
| fm `nav/switch-store.ts`, fm `portal/use-pick.ts`, fw `shell/use-family-pick.ts`, cc `people/portal/app/pick-store.ts` | picked child | `people/portal/picked-child.store.ts` | fm AsyncStorage, fw localStorage |
| fm `portal/use-seen.ts`, wk `portal/use-seen-reports.ts`, cc `people/portal/app/seen-store.ts` | «جديد» seen report ids | `people/portal/seen.store.ts` | both |
| cc `teaching/audio-player/{now-playing,resume-store}.ts`, wk `lesson-files/{use-now-playing,use-resume}.ts`, mk `ui/form/player/use-resume.ts` | one player at a time; resume positions | `teaching/audio-player/player.store.ts` | resume: both |
| mk `lib/clock/clock-store.ts`, wk `lib/clock.ts`, fm `portal/use-family-clock.ts` | 12/24 h preference | `core/prefs/prefs.store.ts` (slice `clock`) | both |
| sm `teacher/alerts/home-prefs.ts`, sw `teaching/teacher/alerts/home-prefs.ts` | teacher «تخصيص» of «اليوم» | `core/prefs/prefs.store.ts` (slice `teacherHome`) | both |
| sm `core/lib/clock/viewer-tz.ts`, cc `core/auth/viewer-tz.ts`, wk `lib/viewer-tz.ts`, mk `auth/use-me-zone.ts` | viewer zone from `/auth/me` | → query (`meQueryOptions` + `select: tz`) + device fallback | — |
| mk `lib/connectivity/{connectivity-store,use-connectivity}.ts`, wk `components/channel/head/use-connection.ts` | online / API reachable | `core/connectivity/connectivity.store.ts` (the poll that detects a down server stays: R11 exception) | no |
| mk `biometric/core/{bio-lock,lock-store}.ts`, `auth/gate-retry.ts`, `auth/login-notice.ts` | lock state, gate retry, disabled-account notice | `core/auth/session-ui.store.ts` (mk-local: phone only) | no |
| mk `room/native/native-store.ts`, `room/state/use-room-session.ts`, wk `classroom/room/livekit/livekit-*.ts` | live room grid | `teaching/room/room.store.ts` fed by the `RoomClient` port | no |
| mk `ui/connecting/bar-slot.ts`, wk `ui/layout/use-narrow.ts`, `classroom/panel/use-wide-room.ts`, `ui/layout/tabs.tsx`, sw `presence/use-presence-self.ts` | UI layout/presence flags | stay as tiny hooks over `matchMedia` (not state) or `ui.store.ts` | no |
| wk `lib/session/session-end.ts` | forget tab memories on sign-out | `resetAllStores()` helper over the registry of stores | — |

Migration order: (1) add zustand to cc + `persist.port.ts` + the two storage adapters + a
`createAppStore()` helper that registers stores for sign-out reset (test-first: persist round-trip,
reset); (2) prefs (clock, teacher home) — small, both platforms; (3) picked child + seen (family
apps); (4) composer draft + staged + sends (inbox, the biggest web/phone duplication); (5) live +
connectivity (written by the socket events of §4); (6) call session (after its effects are classified,
§5); (7) room. Each step deletes the hand-made store and its storage effects in the same PR.

## 7. Testing audit (R14)

### 7.1 Coverage today (first measurement; no repo script or CI job reports it)

`vitest run --coverage.enabled --coverage.provider=v8 --coverage.include='src/**'` and
`jest --coverage --collectCoverageFrom='src/**' --collectCoverageFrom='app/**'` per package, on
`14501246`, in a cloud session. Every suite passed (api 9,652 tests + 1 conditional skip, sw 4,301, sm
4,263, mk 819, fm 133, …). Files no test imports count as 0 %.

| Package | Lines % | Branches % | Functions % | Lines covered | Logic files at 0 % | Lowest logic files (≥ 20 lines) |
|---|---|---|---|---|---|---|
| apps/api | 90.8 | 80.9 | 88.9 | 27,401 / 30,170 | 8 | `scripts/storage-move.ts` 0, `classroom/assistants/assistants.repo.ts` 4, `webhook/external/external.repo.ts` 5, `calls/store/calls.repo.ts` 6 |
| apps/staff-web | 97.2 | 79.0 | 90.3 | 28,506 / 29,336 | 0 | `shell/layout/use-rail-box.ts` 71, `saved-replies/lib/api.ts` 73, `reporting/reports/api.ts` 76, `teacher-earnings/api.ts` 79 |
| apps/staff-mobile | 98.2 | 90.2 | 91.3 | 15,312 / 15,594 | 1 | `composer/voice/use-voice-recorder.ts` 91, `course-actions/course-actions-api.ts` 91 |
| apps/family-web | 88.4 | 68.3 | 79.2 | 850 / 961 | 2 | `sign-in/use-student-sign-in.ts` 65, `schedule/strip/use-jump-to-day.ts` 76 |
| apps/family-mobile | 80.5 | 65.9 | 71.0 | 948 / 1,177 | 1 | — |
| packages/web-kit | 90.2 | 73.1 | 84.6 | 4,758 / 5,276 | 6 | `classroom/api/api.ts` 31, `auth/me.ts` 60, `classroom/room/livekit/livekit-room.ts` 71 |
| packages/mobile-kit | 92.0 | 83.5 | 86.9 | 3,285 / 3,570 | 11 | `auth/use-permissions.ts` 18, `chat-ui/photo/use-zoom.ts` 30 |
| packages/client-core | 96.3 | 92.6 | 93.9 | 2,834 / 2,943 | 1 | `messaging/calls/call-actions.ts` 69, `calls/call-store.ts` 75 |
| packages/shared | 99.2 | 96.6 | 98.1 | 2,407 / 2,427 | 0 | — |
| packages/money | 96.3 | 90.8 | 94.9 | 422 / 438 | 2 | — |
| packages/schedule | 92.6 | 82.7 | 89.6 | 376 / 406 | 3 | `schemas/booking-extras.ts` 50 |
| packages/settings | 99.1 | 81.8 | 100 | 221 / 223 | 0 | — |
| packages/core | 91.9 | 95.9 | 96.7 | 158 / 172 | 1 | — |
| packages/time | 83.4 | 82.0 | 83.8 | 136 / 163 | 1 | `format/format.ts` 82, `zone/calendar.ts` 82 |
| packages/i18n | 93.7 | 95.8 | 100 | 59 / 63 | 1 | — |
| packages/catalog | 83.7 | 77.8 | 63.4 | 211 / 252 | 8 | `permissions/catalog.ts` 0 |

Where the holes are: **api repositories** — 209 `*.repo.ts`/`*.queries.ts` average **59.9 % lines /
42.5 % branches**, 86 of them under 50 % (services 97.8 / 88.4, jobs 95.0 / 85.8, mappers 98.5 / 88.3,
controllers 89.3 / 82.7). Repos are mocked in service tests and their own query shapes are tested only
by e2e. **Branches** on the web side (sw 79 %, wk 73 %, fw 68 %) and the family apps overall. The money
package is at 90.8 % branches, api `modules/finance` at 87.4 / 72.9.

### 7.2 Other findings

- **Logic files with no test beside them** (§1 R14 row): api 827 of 1,788 (46 %), sw 291/546, sm
  272/565, mk 100/183, wk 77/149; many are covered through a neighbour's test (api lines 90.8 %), which
  hides which file owns which behaviour. Critical ones without a sibling test: `money/ledger/views.ts`,
  `money/assistant/views.ts`, `schedule/lessons/views.ts`, `schedule/classroom/meeting-invites.ts`,
  `shared/sales/money-views.ts`, `mk/room/state/use-room-{session,join,lifecycle}.ts`,
  `sm/inbox/thread/calls/state/use-call-session.ts`, `sw/sales/sales-money/payment-link/use-link-pay.ts`.
- **`.only`: 0. Bare `.skip`/`xit`: 0** in unit tests (one `it.skipIf(!out)` smoke in
  `report-pdf/render/pdf-renderer.smoke.test.ts`). **e2e: 127 conditional `test.skip(cond, 'reason')`**
  (project-specific runs: «database only: one run», `E2E_LINES=single`) — all carry a reason.
- **Flaky tests:** of the 60 latest completed `ci.yml` runs, 3 passed only on a re-run; the one
  inspected (run 44482650589, «test others») failed on a runner shutdown (exit 143), not a test. No
  test-level flake is visible in that window; the coverage job (§7.4) should also upload the JUnit
  report so flakes become countable.
- **Nothing enforces red-first.** Rule 4 asks for tests next to code; no check looks at changed files,
  coverage, or whether a test failed before the fix.

### 7.3 What TDD changes in practice

Every behaviour PR: (1) commit the failing test(s) first — the PR's first commit is red in a cloud
session (`vitest run <file>` shows the failure, pasted in the PR body); (2) the fix; (3) refactor.
The PR body table «behaviour → test file:line», with at least one failure-path row. Tests are never
weakened: a changed assertion in an existing test needs a line in the PR body saying which behaviour
changed and who decided it.

### 7.4 How CI enforces TDD outcomes

1. **Changed-files coverage gate** (new `coverage` job, matrix like `verify`): runs the affected
   packages with coverage (`--coverage.reporter=json`), maps the PR's changed lines
   (`git diff -U0 origin/develop...HEAD`) onto the report, and fails when a changed **logic** file is
   below **90 % lines / 80 % branches** or a changed line is uncovered without a `// coverage: <reason>`
   (e.g. a native-only branch). Week 1: report-only (comment in the job summary, never a PR comment);
   then a gate. No stored baseline needed: it judges only changed files. The package totals of §7.1 are
   recorded per develop push and may not drop by more than 0.2 pt (shrinking-baseline file
   `refactor/guards/coverage.json`, written by the ci `baselines` job like the other lists).
2. **No focused or silent skips:** `vitest/no-focused-tests`, `jest/no-focused-tests`, and a rule that
   allows `skip` only as `test.skip(condition, 'reason')`/`it.skipIf(cond)` (error, no baseline needed:
   0 today).
3. **Test beside new logic:** `guard:test-beside` fails when the PR adds a logic file (`.ts`, or a
   `.tsx` component in a kit) without `x.test.ts(x)` or `x.<scenario>.test.ts(x)`; today's ~1,790
   untested files sit in `refactor/guards/untested.json` and may only shrink.
4. **Mutation testing:** Stryker (`@stryker-mutator/core` + vitest runner) on `packages/money`,
   `packages/schedule`, `packages/core/src/{phone,text}`, `packages/time`, cc reminder/status logic and
   the api state machines (`*-transitions.ts`). First a weekly scheduled workflow uploading the HTML
   report (no secrets, `contents: read`); after two reports, a gate on PRs touching those folders
   (`--incremental`, mutation score ≥ 80 % on changed files, the package score may not drop).
5. **Repo tests:** the repo gap (§7.1) closes with a counting fake `Db` that records the PostgREST
   chain (`from/select/eq/in/range/order`) so each repo method gets a shape test (columns, filters,
   bounds), and the important ones also run against the CI Supabase in the e2e job. The counting
   fake `Db` already exists: `apps/api/src/common/db/testing/fake-db.ts` (`calls`, `trips`).

## 8. Design-system audit and target (R15)

### 8.1 Inventory today

**Tokens**

| Token | Source | Web | Phone | Gap |
|---|---|---|---|---|
| Colour (46 roles × light/dark, «Emerald Mint») | `packages/catalog/src/theme/theme.ts` `palette` (contrast-tested: `theme.contrast.test.ts`) | `wk/src/styles/tokens.css`: the **same hex typed again by hand** (3 blocks: light, dark media fallback, dark attribute); `tokens.test.ts` diffs them; names differ (`ok` ↔ `--verdigris`, `act` ↔ `--saffron`, `bad` ↔ `--cinnabar`) | `mk/src/theme.ts` `useTheme().color` reads `palette` directly | generate `tokens.css` from `theme.ts`; one naming |
| Type scale | `theme.ts` `type.size` (phone) and `wk/src/index.css` `--text-*` (web): **two sources** | 2xs 12 · xs 13 · sm 15 · body 16 · lg 18 · h4 19 · h3 22 · h2 26 · h1 30 · display 40 · hero 56 | 2xs 12 · xs 13 · sm 14 · body 15 · base 16 · lg 18 · h4 20 · h3 23 · h2 28 · h1 32 | **drifted** (sm, body, h4–h1); decide one scale (Q4) |
| Line height | web per step (1.3–1.65); phone `1.6` UI / `1.5` titles | | | align |
| Spacing | phone `space = [0,4,8,12,16,24,32,48]` | Tailwind default 4 px scale (any step) | `space[n]` but 338 raw numbers in sm styles | web: restrict to the same steps (Tailwind `--spacing` + lint) |
| Radius | xs 2 · sm 6 · md 8 · lg 12 (both), pill 999 phone | `--radius-*` | `shape.radius` | match; web lacks `pill` name |
| Control size | phone `shape.control` dense 32 · default 40 · comfort 48 · touch 44 | in `button.tsx` classes (`min-h-11/12`, `sm:min-h-8/10`) | `shape.control` | make a token on web |
| Elevation / shadow | `theme.ts` `elevation`, `glass` | `--elev-page/pop/toast` (hand-copied) | `elevation`, `glass` | generate |
| Motion | web `motion.css`: `--ease-ink`, press 120 · quick 160 · enter 200 · move 240 · flash 700, 5 named animations; reduced-motion handled in CSS | phone `motion = { fast: 120, base: 200 }`, no curve | phone lacks 3 durations and the curve |
| Z-index layers | none on either | 5 `z-[…]` arbitrary in sw, Tailwind `z-10/20/50` ad hoc | RN `zIndex` ad hoc | define `layer` tokens: base, sticky, header, sheet, dialog, toast, call |

**Components** (kit files, non-test)

| Area | web-kit `components/ui` (49) | mobile-kit `ui` (69) | In an app only |
|---|---|---|---|
| Actions | `Button` (primary, secondary, ghost, danger, danger-quiet × sm/md/lg), `IconButton`, `ButtonRow`, `HeadActions`, `MoreMenu` | `Button` (primary, secondary, danger; `busy`), `IconButton`, `PillButton`, `SquareButton`, `RoundButton` (call), `RetryButton`, `ButtonRow` | sm `PillButton` (47-line fork of mk's), `action-icons.tsx` |
| Form | `Field`, `Label`, `Input`, `SearchInput`, `Select`, `TimeZoneSelect`, `RadioChips`, `SegmentedControl`, `FormAlert`, `PhonePreview` | `Field`, `FormLabel`, `SwitchRow`, `FilterPills`, `PeriodSwitcher`, `PasswordToggle`, `SlotPicker`/`SlotButton`/`WeekSlots`, `LanguageRow`, `AppearancePicker`, `ProgressBar`, `AudioPlayer`/`PlayerControls` | sm `SearchField`, `NativePicker`, `PickerRow`, `DatePickerField`, `TimePickerField`, `PaidDayPicker`, `ReceiptPicker`, `DiscountField`; sw `components/settings/fields/CheckField.tsx`, `table-toolbar/fields.tsx` |
| Display | `Avatar`, `StatusChip`, `StatusMark`, `EmptyState`, `Skeleton`, `Icon`, `Mark`, `Ltr`, `LinkedBody`, `HighlightDiff`, `Cartouche`, `Rosette`, `NuqtaGlyph` | `AppText`, `ContentText`, `Avatar`, `StatusChip`, `EmptyState`, `ErrorState`, `ErrorLine`, `Notice`, `Note`, `SkeletonCard`, `PresenceLabel`, `Mark`, `Ltr`, `Wordmark`, `Chevron`, `NuqtaGlyph` | sm `LessonStatusChip`, `PhoneText`, `SectionLabel`, `MonthHeader` |
| Layout / surface | `Page`, `RunningHead`, `Tabs`, `Pager`, `ScrollX`, `Card`, `Pill`, `SectionHeader`, `ThemeToggle`, `ClockToggle` | `Screen`, `ScreenHeader`, `KeyboardFrame`, `ListRow`, `ListRowTitle`, `Section`, `inset`, `BackButton`, tabs (`GlassTabBar`, `TabPill`, `TabBadge`, …) | sw `components/data-table/*` (DataTable, TableBox, filters), `table-toolbar`, `shell`; sm `LazyList`, `ReportRows`, `use-inset-rows` |
| Overlay / feedback | `Dialog`, `DialogHeader`, `Drawer`, `ConfirmSwitchDialog`, `Toast` | `MenuSheet`, `InlineConfirm`, connecting bars (5), startup (6), `StepStage` | — |

Gaps web ↔ phone: phone has no `Select`/`Input`/`SearchInput`/`DatePicker` in the kit (they live in
sm), no `Toast`, no `Card`, no `SegmentedControl` of the same contract (`PeriodSwitcher` and
`FilterPills` are close); web has no `SwitchRow`/`Switch`, `ListRow`, `ErrorState`, `Notice`,
`ProgressBar`, `PresenceLabel`; web `DataTable` and phone `LazyList` are kit-worthy but in apps. Button
variants differ (web 5, phone 3; web has sizes, phone has `busy`). No component has a written contract
or a showcase; contracts live in comments («docs/07 §6 الأزرار»).

### 8.2 Drift in the apps (non-test)

| Check | sw | fw | sm | fm | Top files |
|---|---|---|---|---|---|
| Hard-coded hex / rgb | 2 (QR) | 0 | 2 (QR) | 0 | `sw/…/short-links/detail/QrCard.tsx`, `sm/short-links/detail/QrCard.tsx` (QR black/white: allowed exception) |
| Tailwind arbitrary values `x-[…]` | 355 in 199 files (mostly `max-w-[…]` 73, `grid-cols-[…]` 53, `w-[…]` 35, `min-w`, `size`, `rounded` 16, `text-[Npx]` 14, `z-[…]` 5) | 7 in 6 | — | — | `people/auth/BindingCover.tsx` (31), `people/teachers/availability/DayTrack.tsx` (11), `AvailabilityWeek.tsx` (8), `platform/settings/values/ValuesTable.tsx` (7), `reporting/dashboard/today/TodayLessons.tsx` (6), `messaging/calls/screen/CallScreen.tsx` (5) |
| `dark:` variants | 0 | 0 | — | — | dark mode is token-driven already |
| Physical left/right (`ml-`, `pr-`, `text-left`, `left:`) | 2 | 2 | 3 + 4 `textAlign` | 2 + 1 | logical start/end is the norm already |
| Raw `<button>` / `<input>` / `<select>` / `<textarea>` / `<a>` | 66 / 55 / 0 / 13 / 46 | 3 / 0 / 0 / 0 / 1 | — | — | `messaging/inbox/messages/components/BubbleMenu.tsx` (4 buttons), `teaching/meetings/NewMeetingMenu.tsx` (3), `people/roles/PermissionMatrix.tsx` (2 inputs), `teaching/booking/steps/who/StudentStep.tsx`, `teaching/lesson-files/upload/UploadBox.tsx`, `messaging/inbox/messages/components/MessageMedia.tsx` (3 links) |
| Raw `Pressable`/`Touchable*` / `TextInput` | — | — | 88 in 85 files / 10 | 11 / 3 | `inbox/messages/photo/PhotoPreview.tsx`, `inbox/messages/reactions/ReactionBar.tsx`, `inbox/thread/calls/screen/PermissionDialog.tsx`; fm `lessons/JoinButton.tsx`, `OptionsRow.tsx`, `PrepareCard.tsx`, `nav/AlertRow.tsx` |
| Inline `style={{…}}` with raw numbers | 3 | 0 | 1,243 in 591 files | 155 in 63 | `finance/pricing/QuoteCard.tsx` (9), `sales/sales/components/SalesLessonRow.tsx` (9), `earnings/components/SessionItem.tsx` (8), fm `package/PackageCard.tsx` (7), `inbox/composer/voice/RecordingBar.tsx` (7) |
| Raw `fontSize` / `borderRadius` / padding-margin numbers | — | — | 18 / 21 / 338 | 3 / 18 / 45 | (mk itself: 13 / 12 / 90) |

Components duplicated across apps (same name, both apps, each its own code): staff-web ↔ family-web:
`AlertRow` (84 / 66 lines), `LoginPage` (65 / 31), `AccountPage` (77 / 31), `StudentReportsPage`
(31 / 58). staff-mobile ↔ family-mobile: `AlertRow` (80 / 45), `LoadState` (33 / 31), `PhoneStep`
(53 / 50), `RecordingRow` (40 / 44), `RecordingsList` (28 / 55), `UpcomingList` (55 / 62),
`VoiceNote` (42 / 14), `AccountScreen` (70 / 46), `RecordingsScreen`, `StudentReportsScreen`. 213
component names exist on both a web app and a phone app (expected: same screens, different platforms —
their *logic* belongs in cc, their pieces in the kits).

### 8.3 Target

1. **One token source → two outputs.** `packages/catalog/src/theme/` becomes the full token set
   (colour, type scale, line height, spacing, radius, control size, elevation, motion durations +
   curve, z-index layers, breakpoints). A generator `tools/scripts/tokens/build-tokens.mjs` writes
   `wk/src/styles/tokens.gen.css` (`:root`, dark media, `[data-theme]` blocks + `@theme inline`
   mapping) and `mk` reads the same objects. `tokens.test.ts` turns into «generated file is up to date»
   (CI fails on a hand edit), plus the existing contrast test. One naming: semantic roles (`ok`, `act`,
   `bad`, `ink2`) on both platforms; the CSS keeps aliases for the old names until the sweep ends.
2. **Component catalogue with a contract per component** — `Name.types.ts` documents, and the test
   proves: variants; sizes; states (default, hover web, pressed, focus-visible, disabled, loading/busy,
   error); RTL and LTR (logical start/end, mirrored icons); dark mode; reduced motion; 44 px / 44 pt
   tap target; accessibility role, label and state; long Arabic text and the English locale. A usage
   rule per component in one line («one primary Button per section», «Toast for background results,
   FormAlert for the form's own error»).
3. **Living showcase.** Web: route `/_design` in staff-web, admin-only, that renders every
   `*.showcase.tsx` from wk (Vite `import.meta.glob`); family-web links the same kit page. Phone: a
   «Design» screen in sm under «المزيد» → «للمطورين» (admin role, also in preview builds) rendering every
   mk showcase. Playwright screenshots of `/_design` (light/dark × ar/en, phone and desktop projects)
   are the input of the three design-review skills; a jest-expo snapshot per showcase on the phone.
4. **Missing kit components (build first, test-first):** web `Switch`, `ListRow`, `ErrorState`,
   `Notice`, `DataTable` (from sw), `DatePicker`/`TimePicker`, `ProgressBar`; phone `Select`
   (from `NativePicker`), `TextField`/`SearchField`, `DatePickerField`/`TimePickerField`, `Toast`,
   `Card`, `SegmentedControl`, `LazyList` (from sm), `LoadState`; both: `Link` (web `<a>` wrapper with
   external-link handling), `Pressable` row wrapper (`ListRow` with press feedback), `Checkbox`,
   `Textarea` (auto-grow), `Menu`, `LayerProvider` (z-index).

### 8.4 Enforcement (details in §9)

- Lint in **apps only** (kits exempt, they are where raw elements live): ban hex/rgb colour literals;
  ban Tailwind arbitrary values except a short allow-list (`grid-cols-[minmax(0,1fr)]`-style layout
  helpers become named utilities in `components.css`); ban `dark:` variants; ban JSX `button`, `input`,
  `select`, `textarea`, `a` in sw/fw (use kit `Button`, `Input`, `Select`, `Textarea`, `Link`); ban
  `Pressable`/`Touchable*`/`TextInput` imports in sm/fm; ban numeric literals in RN `style` objects
  except `0`, `1` and `flex` values (`StyleSheet` from tokens).
- Token parity test web ↔ phone (generated file fresh; same role names; same scale steps).
- A new kit component PR must add a showcase entry (guard: every exported component of a kit has a
  `*.showcase.tsx` sibling, shrinking baseline for today's) and carry the design-review output.

## 9. Enforcement

All checks follow the repo's pattern: a rule or guard that fails only on **new** violations, with a
baseline that may only shrink (`eslint-suppressions.json` per package for lint rules, oxlint parity in
`oxlint-suppressions.json`, or a JSON list under `refactor/guards/` pruned by ci `baselines`).

| Rule | Check | Where it runs | Baseline | Oxlint parity | False positives / exceptions |
|---|---|---|---|---|---|
| R1 | `ab/types-in-types-file`: in `.ts` files with runtime code, no exported `interface`/`type` except `z.infer` of a schema in the same file; in `.tsx` no type declarations at all | lint (verify job) | eslint-suppressions (≈ 1,900 files) | custom JS plugin rule in `packages/config/oxlint/ab-plugin.js` | `z.infer` types; non-exported one-liners (allowed); Nest provider tokens |
| R1 | `guard:types-dup`: an exported type name declared in two workspaces | guards job | `refactor/guards/types-dup.json` | n/a | same name, different meaning (allow-list) |
| R2 | existing `max-lines-per-function`, `complexity`, jscpd (`guard:dup`), knip | as today | as today | as today | — |
| R3 | `ab/one-component-per-file`: one PascalCase component per `.tsx`, no other runtime export | lint | suppressions (421 + 207 files) | plugin rule | icon sets (Q2), `*.showcase.tsx`, test fixtures |
| R4 | `ab/ui-in-kit`: an app may not define a component under `components/ui`, `core/ui`, `components/` generic folders; new generic components fail | guards (path list) | `refactor/guards/app-ui.json` (59 files) | n/a | app-specific composites stay in features |
| R5 | covered by R1's `.tsx` part + `ab/props-from-types-file` (a component's props type must be imported from `./Name.types`) | lint | suppressions | plugin rule | components with no props |
| R6 | existing `max-lines` | as today | 0 | as today | generated files ignored |
| R7 | existing `ab/zod-inputs`, `ab/no-shape-checks`; new `ab/shared-primitives`: ban `z.string().uuid()`, `z.uuid()`, phone/date regexes in apps (use `@ab/core/schemas`) | lint | suppressions (79) | plugin rule | — |
| R8 | `ab/no-sdk-outside-adapter`: imports of `stripe`, `@aws-sdk/*`, `livekit-*`, `@supabase/supabase-js` (outside repos/realtime adapters), `expo-*` native modules only in `*.adapter.ts` / allow-listed files | lint (`no-restricted-imports` per package) | suppressions | native `no-restricted-imports` | repos are the DB adapter (rule 1) |
| R8 | builders: `guard:test-rows` counts literal row objects in tests (`id: '…'` plus ≥ 3 DB columns) | guards | `refactor/guards/test-rows.json` (count per package, shrink only) | n/a | small inline values |
| R9/R10 | `ab/no-await-in-loop` on api `src` (ESLint core `no-await-in-loop`, plus `.map(async` returning a repo call inside `Promise.all`); `ab/no-select-star` (`select('*')`, `select()`); `ab/no-exact-count` warn | lint (api) | suppressions (≈ 70 / 80 / 59) | `no-await-in-loop` native; others plugin | jobs that batch on purpose (`for … i += CHUNK`) |
| R10 | `ab/query-key-factory`: `queryKey:` literal only in `*.keys.ts`; `ab/one-endpoint-one-hook`: an API path string in one cc file only | lint (sw, sm, fw, fm, wk, mk, cc) | suppressions (320 / 48) | plugin rule | tests |
| R10 | `staleTime` default asserted by a unit test of each app's `QueryClient` | test | — | — | — |
| R11 | `ab/no-polling`: `refetchInterval` / `setInterval` need a `// poll: <reason>` comment naming the event fallback or why no event exists | lint | suppressions (≈ 50) | plugin rule | clocks and animations (`use-now`, elapsed) — named hooks exempt |
| R11 | event catalogue test: every `emit(name)` name is in the catalogue, every catalogue name has an emitter and a client handler (`Record` exhaustiveness via TypeScript) | test (shared, api, cc) | — | — | — |
| R12 | existing no-memo + effects-in-hooks rules; add `react-hooks` v7 compiler rules; `guard:compiler`: the compiler report lists 0 `CompileError` in files outside a shrinking list | lint + guards | suppressions + `refactor/guards/compiler.json` | `react-hooks` rules exist in oxlint (check per rule, docs/31b) | files that must opt out (`"use no memo"`) listed with a reason |
| R13 | `ab/no-hand-store`: ban `useSyncExternalStore` outside cc's store helpers and the kits' platform adapters; ban `localStorage`/`AsyncStorage` access outside `persist.*.adapter.ts` | lint | suppressions (≈ 50 files) | `no-restricted-syntax` / imports native | `matchMedia` hooks (allow-list) |
| R14 | **changed-lines coverage gate** (§7.4), `vitest/no-focused-tests` + `jest/no-focused-tests` (error), `no-disabled-tests` with a required reason (`test.skip(cond, 'reason')` allowed, bare `.skip`/`xit` banned), `guard:test-beside`: a new logic file without `x.test.ts(x)` fails | lint + new `coverage` job + guards | changed files only (no baseline needed); `refactor/guards/untested.json` for today's untested logic files | `vitest/*` and `jest/*` rules exist in oxlint | declarative files (`*.types.ts`, `index.ts`, `*.schemas.ts` tested through their package test) |
| R14 | mutation testing (Stryker) on `packages/money`, `packages/schedule`, `packages/core/{phone,text}`, `packages/time`, cc reminders/status machines | weekly scheduled workflow first (report artifact), then a gate on changed files of those packages (mutation score ≥ 80 %) | score per package, may not drop | n/a | equivalent mutants (Stryker `// Stryker disable` with reason) |
| R15 | §8.4 lint rules; `tokens.gen.css` freshness test; showcase-sibling guard; design-review output in the PR | lint, test, guards, review | suppressions + `refactor/guards/showcase.json` | `no-restricted-syntax` native for JSX elements; colour/arbitrary regex as plugin | QR colours, third-party widgets (LiveKit, Stripe Elements), the PDF report page |
| R16 | `ab/no-client-now`: `Date.now()`/`new Date()` with no argument banned in app and kit code except in `*.timer.ts`/animation hooks; endpoints deciding by time return `server_now` (contract test) | lint + api tests | eslint-suppressions | `no-restricted-syntax` | countdown/animation timers, telemetry timestamps |

New ESLint rules live in `packages/config/eslint-*.js` with their rule tests (pattern of
`eslint-zod-inputs.test.js`); each lands **in one PR with its baseline** generated in a cloud session
(`eslint . --suppress-all` for that rule only) and its oxlint twin, so CI stays green and only new code
is held to it. Total new suppressions are reported in the PR; `guard:lint` keeps every total shrinking.

## 10. Lanes

### 10.1 How lanes run

- **At most 2–3 PRs open at once** (owner: earlier lanes stalled with too many open). One lane driver at
  a time per lane; a lane picks its next row only when its PR merged.
- **Pure moves ≤ ~150 files**, done by `move-module.ts` maps and proven by `pure-move-check.mjs`
  (existing tooling). **Codemods** separate from hand edits. **Behaviour PRs ≤ ~20 files.**
- **Test-first in every PR:** the PR body lists «behaviour → test» rows; for a move or codemod the row
  is «no behaviour change → existing tests unchanged and green». Each new rule's PR brings its rule test.
- **Verified in CI only** (lint + parity, typecheck + bundles, sharded tests, e2e where the diff asks
  for it, guards, the new coverage job). A cloud session may run lint/typecheck/unit tests first.
- **Paused v2 rows fold in:** lane G of docs/32 (guards/tooling) is done; lanes M (pure moves), R
  (repositories: 37 `*queries.ts` → `*Repo`), K (shared packages), X (effects/compiler), S (SOLID
  splits) resume as the rows below that name them; their row files in `refactor/lanes-v2/` stay the
  driver instructions, re-targeted by this doc when the owner un-pauses.

### 10.2 Order and dependencies

| # | Lane / row | What | Size | Depends on |
|---|---|---|---|---|
| 1 | **G1** guards foundation | coverage job (changed-lines gate, report only for 1 week, then gate), focused/disabled-test lint, `guard:test-beside`, compiler report script | 1 PR, ~15 files | — |
| 2 | **DS1** tokens generator | full token set in catalog theme, generator, `tokens.gen.css`, freshness + parity tests; resolve the type-scale drift (Q4) | 1 PR | Q4 |
| 3 | **DS2** showcases | `/_design` route (sw), «Design» screen (sm), showcase sibling guard + baseline, showcases for today's kit components (batches of ~15 components) | 3–4 PRs | DS1 |
| 4 | **DS3** missing kit components | §8.3 item 4, each test-first with showcase; web then phone, ~3 components per PR | ~8 PRs | DS2 |
| 5 | **G2** R1/R3/R5 rules + codemod | lint rules with baselines; codemod `tools/scripts/codemods/props-file.mjs` (move props/types out of `.tsx` into `Name.types.ts`, update `index.ts`) | 1 rule PR + codemod PRs per package (≤ 150 files) | G1 |
| 6 | **DS4** app migration to kit components | per feature folder: raw elements → kit, arbitrary values → tokens, inline RN numbers → tokens; screenshots before/after in the PR | many small PRs (≤ 20 files) | DS3, G3 |
| 7 | **G3** R15 + R13 + R10 + R11 lint rules | rules with baselines (no code change) | 1–2 PRs | G1 |
| 8 | **E1** events infrastructure | catalogue, bus port, in-process adapter, outbox migration (load `supabase-postgres-best-practices`), realtime topic + RLS, cc `live-events.ts` | 3 PRs | — |
| 9 | **E2** first events | `lesson.changed`, `payment.recorded`, `report.*`, `lead.changed`, `notification.created`; replace the matching polls with fallback intervals | 1 PR per event | E1 |
| 10 | **Z1–Z7** zustand | §6 order | 7 PRs | G3 (rule), E1 for Z5 |
| 11 | **X** effects/memo (v2 lane X) | §5 classes, per feature folder, render-count tests first | ~15 PRs | G1 compiler report, Z for store-wiring effects |
| 12 | **P** performance | §3.1 rows 1–15, each with a call-count test; indexes after EXPLAIN in CI | 1 PR per row | — |
| 13 | **B** builders | `packages/shared/src/testing/builders` + api row builders, then migrate test files per module (codemod where shapes are regular) | 2 + many | — |
| 14 | **A** adapters | Stripe and S3 ports in api; `RoomClient` port into cc | 3 PRs | — |
| 15 | **T1** types (docs/52 §4, 231 declarations) + R (v2 lane R, 37 `*queries.ts`) + M/K/S rows | as docs/32 and docs/52 | per those docs | G2 |
| 16 | ~~**L** `max-len` sweep (12,987 of the 20,189 suppressions)~~ | replaced by `prettier --check` on added files | — | — |
| 17 | **MT** mutation testing | weekly workflow, then gate | 2 PRs | G1 |

### 10.3 Lane rows, smallest first in each lane

- **G1-a** coverage job (report-only), **G1-b** focused/disabled-test rules, **G1-c** test-beside guard,
  **G1-d** compiler report.
- **DS1-a** token objects + generator + freshness test; **DS1-b** switch wk to the generated CSS (no
  visual change: snapshot of computed colours on the showcase).
- **DS2-a** showcase infra web + 10 components, **DS2-b** phone infra + 10, **DS2-c/d** the rest.
- **DS3** web: `Switch`, `ListRow`, `Notice`/`ErrorState`, `DataTable` (move from sw), `Textarea`,
  `Link`; phone: `Select`, `TextField`/`SearchField`, `DatePickerField`/`TimePickerField` (move from sm),
  `Toast`, `Card`, `SegmentedControl`, `LazyList` (move from sm), `LoadState`.
- **DS4** first: family apps (small, 7 + 155 violations) to prove the path, then sw inbox, sw people,
  sm inbox, sm sales/finance.

### 10.4 Ten quick wins (biggest user-visible speed for the least risk)

| # | Change | Where | Why it is fast and safe |
|---|---|---|---|
| 1 | Default `staleTime: 30_000` in staff-web's `QueryClient` | `apps/staff-web/src/boot.tsx:10` | stops refetch-on-every-mount/focus; inbox/calls keep their own short settings |
| 2 | ~~Batch the sales renewals balance reads~~ | `sales-money.reads.ts:32-36` | ~~one query instead of N per sales list page~~: already one read per family; nothing to do |
| 3 | Batch the payout ledger annotation | `payouts.ledger.ts` `annotate` | one ledger read for the page's lessons instead of N, grouped per payout (lane L29) |
| 4 | ~~Batch template/name lookups and signed URLs in message views~~ | `template-names.ts:7` | ~~every inbox sync gets cheaper~~: the template catalog is already read once a minute and shared |
| 5 | Virtualise the web chat log and thread list; clock only in the time cell | `MessageLog.tsx`, `ThreadResults.tsx` | long chats scroll smoothly; no full re-render each minute |
| 6 | Dashboard cards from SQL aggregates (RPC) + 60 s cache | `dashboard.queries.ts`, `finance.queries.ts`, `work.queries.ts` | stops paging whole windows into Node |
| 7 | One `meQueryOptions` for `/auth/me` in cc, used by the 7 sm callers (and `me/profile` ×3) | sm, cc | one source of options and typing; requests are already shared, as the cache holds one entry per `pathKey` |
| 8 | Replace `select('*')` on `message_templates`, `expenses` and the widest reads | 80 sites, top tables first | smaller payloads, no schema change |
| 9 | `count: 'estimated'` (or no count) on big list headers | `v_student_list`, `v_threads`, `messages` | removes full scans per page |
| 10 | Move push sends off the request (enqueue) | `family-push`, `lesson-live.push`, `schedule-notices`, `teacher-alert` | saves feel instant; failures retried by the job |

Each is one small behaviour PR with a test written first (call-count fake `Db`, a `QueryClient`
default test, a render-count test for #5).

## 11. Owner questions

1. **Order of the first PRs:** proposed G1 (coverage/TDD guards) + DS1 (tokens) in parallel, then DS2.
   Or quick wins (§10.4) first while the foundations run as the second open PR?
2. **R3 exceptions:** may a set of tiny icons (`chat-icons.tsx`, 14 components; `call-icons.tsx`, 11)
   stay as one file, or one file per icon?
3. **R5 naming:** `Name.types.ts` for props (proposed) or `Name.props.ts`?
4. **Type scale:** web and phone drifted (body 16 vs 15, h1 30 vs 32, sm 15 vs 14, h4 19 vs 20). Keep
   each platform's (phones read bigger) as two named scales from one source, or one scale?
5. **Showcase access:** `/_design` and the phone «Design» screen visible to admins in production, or
   only in preview/staging builds?
6. **Coverage gate number:** ≥ 90 % lines and ≥ 80 % branches on changed logic files (proposed), report-only
   for the first week?
7. **Events transport:** outbox table + Supabase Realtime broadcast (proposed, uses what exists), or add
   pg-boss now for the API-side listeners as well?
8. **Zustand persistence on the web:** drafts in `sessionStorage` (today: tab life) or `localStorage`
   (survive a closed tab)?
