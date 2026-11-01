# 36 — One HTTP client, zod at every boundary, few `if`s (owner 2026-11-01)

Status: **draft for owner approval** (decisions in §1.2). Builds on docs/32 (refactor v2; lanes G/M/R/K/X/S run as cloud routines from `refactor/lanes-v2/*.md`) and on CLAUDE.md rules 11–12 (#513, merged `dc134ffd`).
**Name clash:** `docs/33-presence.md` already exists, and so do docs/34 and docs/35. This file lands as `docs/36-http-zod-ifs.md` (D7).
Measured read-only. The three maps (HTTP, ZOD, IF) ran on `origin/develop` @ `62a37ad7`, using git grep plus TypeScript-AST scans of a git archive; no pnpm, tsc, eslint or tests were run. Recounts on `322cc496` are tagged **@322c**. The critic's recounts on `e2143ba4` (head on 2026-11-01) are tagged **@e214**. The maps arrived truncated: the HTTP map stops inside `backoff.ts classify`, the ZOD map at `cacheEnvelopeSchema` and the IF map at hotspot #29. This doc lists only what they delivered. The lane drivers re-derive the rest: IF #30–40 from the scan's `cx.json`, plus the complexity suppressions.

## 0. Owner request

Verbatim, 2026-11-01: «try not to write a lot of if conditions» · «use zod» · after reading `drivers/crm/crm-http.ts`: «this is very bad sloppy code … **do it for all the code not just crm**».

| Ask | Today | Where |
|---|---|---|
| One clean way to call other services | 28 hand-rolled outbound call sites (+6 in tools): 8 JSON-parse copies, 9 timeout constants, 4 calls with no timeout, 4 unchecked `as` casts, 3 status→error if-chains | H-1…H-3, lane H, §4 |
| zod at every boundary | API bodies are already parsed (3 helper copies, 2 different 400 shapes). Route params, webhooks, DB JSON, tokens and all client responses are hand-checked or cast. web, mobile and client-core have no zod dependency | Z-1…Z-5, lane Z |
| Few `if`s | complexity and max-depth are already errors (10 / 3). 236 complexity and 14 max-depth offenders are baselined @e214 (§2.3). 5 repeated patterns make up most of the weight | F-1…F-4, lane F |
| The CRM code | Not polished: deleted after the Meta-direct cut-over | h9a–c |

## 1. Rules as checks

Every new rule lands with a one-time baseline (`eslint --suppress-rule`), and its counts may only go down, as in docs/32 §1. **Hard constraint (docs/32 critic #17, `eslint-react.js:2-3`):** every new `no-restricted-syntax` selector goes into ONE exported list in `@ab/config`, and `eslint-react.js` composes that list into its `base`. A second block for the same files would silently drop the React selectors. g6 adds a `calculateConfigForFile` test that asserts each selector is present on sample paths. **As built (g6):** the list is `SYNTAX` in `packages/config/eslint-syntax.js`; each group runs as its own `ab/*` rule on ESLint's core no-restricted-syntax (`ab/no-global-fetch`, `ab/no-unchecked-json`, `ab/no-shape-checks`, `ab/no-untyped-api-calls`, `ab/no-if-chains`), so no package's `no-restricted-syntax` block (the React list) can replace it, each group has its own count, and `pnpm guard:lint` grants each new name its one-time baseline (it never would for more selectors on the existing `no-restricted-syntax`). Do not move them into `eslint-react.js`. None of the new rules is in `.oxlintrc.json`, so `buildFromOxlintConfig` does not switch them off (checked @e214). They must stay out of it, because Oxlint has no bulk suppressions.

### 1.1 Rules

| # | Rule | Check | Stays exempt | Baseline → target |
|---|---|---|---|---|
| H-1 | One outbound client per runtime | `no-restricted-globals: fetch` + selector `MemberExpression[object.name='globalThis'][property.name='fetch']`. Type positions use `FetchLike`, not `typeof fetch` (e.g. mobile `probe.ts` ProbeOptions) | `apps/api/src/common/infra/http/**`, client-core `core/http/**`, mobile `core/lib/http/api.ts` (the reach wrapper), mobile `core/lib/connectivity/probe.ts` (or moved onto the client), mobile `inbox/composer/send-file.ts` + `voice/send-voice.ts` (local `file://` reads), tests and fakes, the kept SDKs (§3.2 note), test doubles (wa-stub, google-stub, tools/livekit) | 28 sites → 0; tools 6 → optional (ht) |
| H-2 | No unchecked response body | selector `TSAsExpression > AwaitExpression > CallExpression[callee.property.name='json']`; with D6, typed `@typescript-eslint/no-unsafe-type-assertion` | — | 4 → 0 |
| H-3 | Status → error by table only | Structural: after H-1, only the core reads `Response`. Review checklist: each profile has an `ErrorTable`, and every key has a test | — | 3 if-chains → 0 |
| Z-1 | Every Nest input through a zod decorator | custom rule `ab/zod-inputs` (packages/config, node:test, like `eslint-params.js`): `@Body`/`@Query`/`@Param`/`@Headers` must be `ZodBody(s)`/`ZodQuery(s)`/`ZodParam(name, s)`/`ZodHeaders(s)` | the webhook raw body (the signature is checked on its bytes first), `@Req` | @e214: 180 `@Body`, 262 `@Param` (51 raw `: string`, 145 `ParseUUIDPipe`, the rest other pipes), 84 `@Query`, 9 `@Headers` → 0 |
| Z-2 | No hand shape checks on boundary data | selectors: `BinaryExpression[operator='in']`; `BinaryExpression[left.operator='typeof'][right.value='object']`; `CallExpression[callee.object.name='JSON'][callee.property.name='parse']`; type predicates on `unknown` input only: `:function[params.0.typeAnnotation.typeAnnotation.type='TSUnknownKeyword'][returnType.typeAnnotation.type='TSTypePredicate']` (predicates that narrow internal unions are not boundary checks) | tests and fakes, e2e (test code reads raw bodies; g6), `typeof` string/number/boolean (display narrowing), `jsonOf` (added to shared in z9), mobile `core/lib/query/paging.ts` (cache patching), `X as unknown as Json` RPC writes, `UntypedRpc`, boot-probe casts | §2.2 → 0 for `in`, `typeof object`, `JSON.parse` and isRecord |
| Z-3 | Types come from `z.infer` | checklist: reject a hand-written `interface` that mirrors a schema | generated DB types | ExpoTicket, ExpoReceipt, PayoutLine, TemplateLineSync, QuoteResponse → `z.infer` |
| Z-4 | zod in every client workspace | g5 | — | 2 of 5 workspaces → 5 of 5 |
| Z-5 | Own-API responses parsed | selectors `CallExpression[callee.name=/^api(Fetch\|Send)$/][typeArguments]` and `CallExpression[callee.property.name=/^api(Fetch\|Send)$/][typeArguments]` (the generic overload, bare or `client.`) | — | web 332 + mobile 240 @e214 → 0 (z14 per domain, §3.3) |
| F-1 | No else-if chains of 3+ | selector `IfStatement[alternate.type='IfStatement'][alternate.alternate.type='IfStatement']` | — | 20 functions → 0 |
| F-2 | No nested ternary, lonely `if` or `else` after `return` | `no-nested-ternary`, `no-lonely-if`, `no-else-return` in ESLint (Oxlint has no bulk suppressions) | — | g7 measures |
| F-3 | Depth and complexity | `max-depth` 3 → 2; `complexity` 10 → 8 everywhere, 6 for non-React `**/*.ts` (D4); keep `variant: 'classic'` | — | depth > 2: 43 fns · cx > 8: 557 · cx > 6: 1,237 (@62a3 AST scan, tools/scripts not included) |
| F-4 | A map keyed by a union stays exhaustive | checklist: `satisfies Record<Union, …>` or a mapped type `{ [K in U]: (x: Extract<…, K>) => … }`; never `Record<string, …>` for a union key; external keys are looked up with `Object.hasOwn` | — | — |

Review checklist (each H/Z/F PR body ticks these):
- An outbound call is `http.json({ …, schema })`. The integration has no `fetch`, no `res.ok` and no `JSON.parse`.
- The domain error class keeps its fields and callers (WaError `uncertain`/`credential`, GoogleApiError, LivekitError). The table reproduces today's mapping, and a test per key proves it.
- Boundary data is a schema, and its type comes from `z.infer`. External bodies use `z.looseObject`. Legacy DB rows use `.catch` defaults.
- No if-chain of 3+, no nested `if`, no nested ternary. Union-keyed maps are exhaustive (F-4).
- No URL, header value or request body appears in an error message, `details` or log (the FX URL and Kapso's `download_url` carry secrets).
- Send, money, auth, webhook and Google rows get 2 reviewers, and their existing behaviour tests stay unchanged.
- CLAUDE.md has two rules numbered «11.» (few ifs; imports), and hzf0 renumbers them. Rule 11's text names «`max-depth` 3, `complexity` 10», so g7 updates it.

### 1.2 Owner decisions

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Client shape | (a) one client per runtime: api `common/infra/http`, plus client-core for web and mobile · (b) one package for both | **(a)**: React Native has no `AbortSignal.timeout`/`any`, no `redirect: 'manual'` and no response streams. Mobile `probe.ts` and `i18n-overrides.ts` already work around this with AbortController + setTimeout |
| D2 | Own-API success bodies | (a) zod-parse them per domain right after that domain's cl5 repository PR (z14), with the shared contracts · (b) a separate sweep | **(a)**, as its own z14 rows and not inside cl5: cl5 is B in docs/32, and parsing adds a failure mode (L). Error bodies and public routes are parsed now (h3, z10) |
| D3 | kapso-calls (calls are off: «skip calls») | (a) switch it to the kapso profile with no other change, in h8 · (b) delete it | **(a)**: the owner's rule is «disable ≠ delete», so delete only on the owner's word |
| D4 | Ratchets | depth 2 now · complexity 8 everywhere, 6 for non-React `.ts` · both baselined | **all, baselined**: depth 2 is nearly free in the apps (43 functions; tools/scripts already has 11 depth-4 suppressions). Complexity counts `&&`, `\|\|`, `??`, `?.` and defaults, so `.tsx` keeps 8 |
| D5 | Reducers and state machines | (a) transition tables (mapped types) · (b) keep exhaustive switches (docs/32 s4) | **(a)**: rule 11 names switch chains, and a mapped type keeps both exhaustiveness and narrowing |
| D6 | `no-unsafe-type-assertion` | (a) on, baselined · (b) the H-2 selector only | **(b) now, (a) after lane Z**: (a) also flags every legitimate cast and would flood the baseline |
| D7 | File name | docs/33 (taken) · docs/36 | **docs/36-http-zod-ifs.md** |
| D8 | Lane S hand-over | s4 (minus WizardBody/draft.steps) → lane F, s5a–b → lane Z, lane S drops them | **yes** (§3.5); otherwise two drivers claim the same files |
| D9 | Client-side timeout (client-core) | (a) a default on GETs only; mutations stay unbounded unless a call opts in · (b) one default on every call | **(a)**: today no web or mobile call has a timeout. A POST cut short on the client keeps running on the server (a file or message send), and a user who taps again sends twice |

## 2. Numbers today

### 2.1 Outbound HTTP (HTTP map @62a37ad7)

| Metric | Today | Target |
|---|---|---|
| outbound call sites: api/web/mobile/packages · tools | 28 · 6 (tools: 2 in `tools/scripts` @e214, the rest in migrate/stubs) | 0 outside the 2 clients · tools optional |
| hand-written JSON parse copies | 8: graph.ts `parse`, crm-http `json`, livekit `parseObject`, client-core `readJson`, 4 in web | 1 per client |
| timeout constants · files with `AbortSignal.timeout` | 9 · 10 (@322c and @e214) | 1 per profile, applied in one place |
| calls with no timeout | LiveKit (`livekit-api.ts:54`), Expo receipts (`receipts.transport.ts:23`), `storage.head` (`storage.service.ts:87`), client-core `apiFetch` (so every web and mobile call), tools scripts | 0 on the api; clients per D9 |
| unchecked `as` on `res.json()` | 4: Expo push, Expo receipts, Google userinfo (`google-http.oauth.ts:41-42`), wa-stub | 0 |
| hand shape checks on responses | Kapso history, LiveKit (5 helpers), Google `reasonOf`/`toGoogleError`, both i18n overrides, web feedback, exports | 0 |
| status→error if-chains | crm-http `crmErrorFrom` (`:53-62`), graph.ts `byDriver` (`:74-79`), google `backoff.classify` (`:21-27`) | tables |
| duplicate transports | Expo ×2 (`push.module.ts:31`, `receipts.transport.ts:23`), Kapso auth header ×2 | 1 each |
| Retry-After readers | 1: crm-http `retryAfterMs` (→ WaError `retryAfterMs`, `message.worker.ts:84`); goes with h9b | the core captures the header; a parser lands with its first non-CRM reader |
| `redirect: 'manual'` today | web-push (`web-push.sender.ts:29`), crm-http (`:82`), crm-media (`crm-media.fetch.ts:36`); every other call follows | per profile, today's value (h0) |
| `apiFetch<T>` / `apiSend<T>` generic casts | web 332, mobile 240 @e214 (334 / 240 @322c); 0 zod-parsed | 0 |

### 2.2 Hand validation per package (ZOD map @62a37ad7; non-test; upper bounds, because `typeof` also matches display narrowing)

| pkg | isRecord-style | `typeof === 'object'` | `typeof` str/num/bool | `'k' in x` | `Array.isArray` | `JSON.parse` | `as unknown as` | path get/field |
|---|---|---|---|---|---|---|---|---|
| apps/api | 13 | 52 | 77 | 41 | 42 | 8 | 21 | 40 |
| apps/web | 4 | 34 | 94 | 22 | 28 | 9 | 1 | 12 |
| apps/mobile | 25 | 56 | 68 | 22 | 35 | 4 | 4 | 25 |
| packages/shared | 20 | 17 | 40 | 4 | 8 | 1 | 1 | 7 |
| packages/client-core | 0 | 12 | 5 | 4 | 2 | 1 | 0 | 5 |
| tools/* | 0 | 3 | 41 | 12 | 15 | 6 | 6 | 5 |

| Boundary | Today | Target |
|---|---|---|
| api `@Body()` params (all typed `unknown`) | 180, parsed by 3 helpers: `parseOrThrow` 234 calls in 95 files @e214, guardians `parse` 9, leads `parseOr400` 11 (also used by the public `pricing.controller.ts:19,25`). Two 400 shapes: `{ message: 'validation_failed', issues }` (`common/http/http.ts:12`) and `{ code: 'validation', issues }` (`sales/leads/http.ts:10`) | ZodBody, one envelope |
| `@Param` | 262 @e214: 51 raw `@Param('x') v: string`, 145 `ParseUUIDPipe` (Nest's own 400 body; the repo has no global exception filter), plus 4 per-module `*Param` helpers. `payouts.controller.ts:42` takes `month` as a raw string and validates it inline (`:43` `monthParam.safeParse` → `invalid_month`), not through a decorator | ZodParam |
| `isRecord` copies | 17 `.ts` definitions @e214 (api 4, mobile 7, web 1, shared 5) + 2 in `tools/scripts/ci-checks/pure-move/*.mjs` | 0 |
| client error bodies | 63 files read `ApiError.body` by hand (mobile 35, web 19, client-core 9); 4 `errorCode()` functions; 16 `codeOf`/`errorCode` copies (IF counter) | `ApiError.code` (cl1) |
| web `validateSearch` · mobile `useLocalSearchParams` | 37 uses (@322c, @e214; 18 hand-written parsers, ZOD counter) · 79 @e214, typed by a generic only | zod schemas |
| zod as a direct dependency | apps/api and packages/shared only (`^4.6.5`). The clients have 23 `.safeParse` calls via @ab/shared | 5 workspaces |
| forms · client env | TanStack Form: web 3, mobile 1 @322c (other forms keep hand state) · env reads: web 4 files (`lib/http/env.ts`), mobile 2 (`core/lib/http/env.ts`) | submit and env parsed by one schema |

### 2.3 If-chains (IF map: AST scan @62a37ad7; suppressions @e214)

| pkg | api | web | mobile | shared | client-core | migrate | wa-stub | e2e | google-stub | tools/scripts |
|---|---|---|---|---|---|---|---|---|---|---|
| `complexity` > 10 (suppressed) | 42 | 97 | 49 | 6 | 5 | 10 | 3 | 9 | 1 | 14 |
| `max-depth` > 3 (suppressed) | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 11 |

Totals: complexity 236, max-depth 14.

| Pattern | Count | Row |
|---|---|---|
| Postgres error codes mapped by hand | 36 api files | f8 (with docs/32 rq1's single `dbError`) |
| optional-filter chains `if (f.x) q = q.eq(…)` | 41 query files | f8 (a `FILTERS` table in the repository, after its r-row) |
| API error bodies parsed by hand in clients | 32 files, 16 helper copies | cl1 + z10 |
| hand-written route search parsers | 37 | z11 |
| guard ladders in the google-sync writers | 5 functions at cx 17–19 | f1 |
| else-if chains of 3+ branches | 20 functions (the longest has 5) | F-1 |

## 3. Lanes and PR slices

Legend as in docs/32 §3: **M** pure move · **C** codemod rename · **B** behaviour-preserving (tests prove the same behaviour) · **L** logic, contract or config change. Almost nothing here is a move, so **every row's branch is `cloud/review-<id>`** and merges after review; the tables drop the branch column for that reason. `cloud/refactor-*` applies only where pure-move-check accepts the diff. B PRs stay at ≤ ≈ 40 files and one module (docs/32 critic #18); h9b is a pure delete and may go over. Every PR runs full CI and e2e for the affected areas, includes `pnpm lint:prune`, raises no suppression count and reports mobile `native-changes` «none». **Freeze rule (all lanes):** a row is FROZEN while the docs/32 r-row of its module is open: r1 common/push (h1, h6), r5 messaging webhook/push (h2 receipts, z4), r4 messaging/whatsapp (h4, h8, h8b, z6), r7 classroom (h5, z5), r11–r13 finance (z7, f2), r15 platform (h7, f1).

### 3.1 Lane G additions

| id | Scope | ≈ files | Type | Depends |
|---|---|---|---|---|
| hzf0 | this doc as docs/36 (D7); `refactor/lanes-v2/{H,Z,F}.md`; S.md drops s5a–b and keeps only WizardBody + draft.steps in s4 (D8); G.md lists g5–g8; CLAUDE.md renumbers its two «11.» rules | 7 | L (docs) | owner go |
| g5 | `zod` ^4.6.5 (the api/shared range, one lockfile entry) in web, mobile and client-core. Pure JS, so OTA-safe | 4 + lockfile | L (config) | — |
| g6 | H-1, H-2, Z-2, Z-5 and F-1 in the single `@ab/config` selector list; `no-restricted-globals: fetch`; the `calculateConfigForFile` test; baselines | ≈ 12 + suppressions | L (config) | h0 (the exempt path exists), g5 |
| g7 | F-2 and F-3 (D4); CLAUDE.md rule 11's numbers updated | configs + suppressions | L (config) | g6, D4 |
| g8 | `ab/zod-inputs` rule + tests, baselined | 3 + suppressions | L (config) | z1b (the first decorators exist) |

### 3.2 Lane H: the shared HTTP client, one integration per PR

| id | Scope | ≈ files | Type | Depends | Verified |
|---|---|---|---|---|---|
| h0 | `apps/api/src/common/infra/http/`: `http.ts`, `failure.ts` (FetchLike, HttpFailure, the NEVER_SENT errno set moved unchanged from `graph.ts:82`, `mayHaveReached`), `errors.ts` (ErrorTable, `errorFor`), `bytes.ts` (capped stream reader modelled on `crm-media.fetch.ts:55` `readCapped`) + tests. **Deadline:** the timeout aborts the request's signal AND races the transport, so a fetch that ignores its signal still ends at the deadline (today's guarantee in `kapso-reopener.ts:27-44`). **After the response headers arrive**, a body read that fails or times out is a failure with `reached: true`. **A caller abort** (its own `signal`) rethrows `signal.reason` unchanged and never goes through the table. **`redirect`** is required per profile and set to today's value. **No secrets in failures:** messages carry the profile name, the method and the path without its query, never the URL, headers or body. **`status()`** returns any status and never consults the table (the web-push GONE set reads it). No callers | ≈ 10 | L (new code) | — | unit tests: every failure kind; lookup order; the timeout combined with the caller's signal; a transport that ignores its signal ends at the deadline; a 2xx whose body read fails → `reached: true`; a caller abort is rethrown as is; maxBytes while streaming; a sentinel secret put in the headers, query and body never shows up in `message`, `details` or `JSON.stringify(error)` |
| h1 | `config/role/worker-kick.ts` (`status()`, never throws, as today); web-push sender (`status()`, `redirect: 'manual'`, the `Buffer` body passed as a `Uint8Array`; GONE stays its table); FX (`.transform(b => b.rates ?? b.conversion_rates)` plus a refine replaces the `if`; shape failure → table; peg fallback kept; `FX_API_URL` holds the key, so the URL is never in an error) | ≈ 8 | B | h0 | CI; FX tests per source |
| h2 | Google userinfo (`google-http.oauth.ts:39-42` → `z.looseObject({ email: z.string() })`: today any string is accepted and a non-2xx or a bad shape answers null, and it stays that way; `z.email()` would turn odd strings into null); `storage.service.ts:87` head; Expo receipts (Expo profile, `receiptsSchema`, ExpoReceipt = `z.infer`) | ≈ 8 | B; **L** for the two new timeouts (storage head, Expo receipts) | h0 | CI; a test per new timeout |
| h3 | client-core: `apiFetch(path, { schema, method?, signal?, timeoutMs? })` / `apiSend(method, path, { body?, schema, timeoutMs? })` next to the generic overload (Z-5 baseline; `session-activity.ts:24` passes `method` + `signal` today); a timeout via AbortController + setTimeout, scoped per D9; `publicApi`; `apiBlob`. Also the 4 web parseBody copies (classroom `api.ts`, `meetings-api.ts`, feedback `api.ts`, `internal-api.ts`), the exports blob and both i18n overrides | ≈ 20 | **L** (the D9 timeout) + B (the rest) | g5, D9. h3 does not edit `api-error.ts`: cl1 (lane K) owns `ApiError.code` and the zod error envelope. FROZEN while cl1's PR is open (same `core/http` folder); before cl5 or FROZEN behind it (cl5 moves web `api*.ts`) | CI + affected e2e; `native-changes` «none»; a test that a timed-out GET is not reported as offline by mobile `reach` (`isNetworkError` = TypeError only) |
| h4 | Kapso, read side: `kapso-conversations.ts` (Kapso profile, `errorBody: 'omit'`, because a body may carry a family's number); `kapso-reopener.ts` (one 5 s deadline for both calls via h0; the hand race, timer and wrapper go, and `kapso-reopener.test.ts:34-43` passes unchanged); `kapso-history.ts` (`historyPageSchema`); `lines.check.ts` reads (`Record<provider, extras>`) | ≈ 12 | B | h0. FROZEN while an open r4/r5 PR rewrites these files' bodies | CI + wa-stub e2e; never sends through Kapso |
| h5 | LiveKit: one schema per Twirp method + `twirpErrorSchema` → LivekitError; `call(input, schema)`; `classroom.module.ts:89` LIVEKIT_HTTP becomes the profile's `fetch` | ≈ 10 | B; **L** for the new timeout (none today) | h0; r7 | CI + classroom e2e; mute/end/record on the new staging (#497) or an owner-approved test room |
| h6 | Expo push send moves out of `push.module.ts:23-46` into the Expo profile (h2); `ticketsSchema` discriminated on `status` | ≈ 6 | B | h2 | tests only, no real push (owner) |
| h7 | Google Calendar/Drive/Sheets move off `OAuth2Client.request` (`google-http.ts:46-62`). The profile's `headers` is `() => auth.getRequestHeaders()` (refreshes an expired token) over the global fetch, with `timeoutMs: 30_000` and no retries (today `timeout: 30_000, retry: false`). `AuthClient.fetch` can't be the `FetchLike`: it delegates to gaxios `request`, which rejects non-2xx and returns a GaxiosResponse. Losing `request()`'s single refresh-and-retry on a 401 is accepted: a 401 maps to GoogleApiError(401) as today, and `classify` keeps it `config`. Also `googleErrorSchema`; `backoff.classify` → an ordered rule table; a schema per call in `google-http.calendar/drive/sheets`; `maybe()`'s 404/410 → null as table entries | ≈ 15 | B | h0; r15 | 2 reviewers; google-stub tests incl. an expired-token refresh; deploy only on the owner's go (it writes the owner's real calendars; «staging» is production today) |
| h8 | Send path: `graph.ts` → the meta + kapso profiles (`byDriver` → Kapso's 401/403 entries, keeping its two pass-through guards: Meta's own auth codes, and a Meta code that differs from the status); `whatsapp.client.ts` → `json({ path, method, json, schema })`; the Kapso `download_url` goes through a separate **no-credential profile with the plain table** (`graph.ts:121-122`: a 401 there is never `credential: 'kapso'`, so the line is never held); media → `bytes({ maxBytes: chatFileMaxBytes(mime) })`, capped while streaming, with the overflow still surfacing as 413 `invoice_too_large` (`inbound-media.service.ts:112-114`, whose after-the-fact check goes); `kapso-calls.ts` switched to the kapso profile with no other change (D3). Redirects stay `follow`, as today | ≈ 20 | B | h4; r4 merged or FROZEN | 2 reviewers; wa-stub e2e; `meta-callers.test-util` uncertain/credential tests unchanged; Meta test credentials + allow-list only |
| h8b | **Send-path fixes (behaviour change).** (1) A `POST {phone}/messages` that got a 2xx and then fails its body read or its schema becomes `uncertain: true`. Today a body-read timeout is a raw DOMException and a missing id is WaError(code null, status 200, `whatsapp.client.ts:138-140`); `failurePlan` treats both as retryable (`isRetryableWaError(null)` is true), so Meta may send it twice. (2) The Kapso profiles move to `redirect: 'error'`: undici strips `Authorization` on a cross-origin redirect but keeps `x-api-key`. The no-credential download profile keeps `follow` | ≈ 6 | **L** | h8 | 2 reviewers; send-plan tests for both cases; wa-stub e2e; Meta test credentials + allow-list only |
| h9a | **CRM removal, clients first:** web `lines/LineDriver.tsx`, `line-status.ts`, `templates/create/NewTemplate.tsx`, `templates/lines/TemplateLineBlock.tsx`, `template-columns.tsx`, `integrations/{index,integration-places}.ts`, `SafetyTab.tsx`; mobile `photo/MediaNote.tsx`, `media-problem.ts`: stop offering and rendering `crm`, and drop its i18n strings | ≈ 12 | L (delete) | the notifications line's Meta-direct cut-over is live, no line is set to `crm`, and the owner says «go» | CI + affected e2e |
| h9b | **CRM removal, api + shared, never migrated:** `drivers/crm/*` (5 files + fakes + tests), `lines.check.crm.ts`, `webhook.wacrm{,.controller}.ts`, `webhook.wacrm-signature.ts`, `webhook.{config,module,service}.ts`, `test-app.ts`, `env.crm.ts` + the `crm` entries in `env.ts`/`env.gaps.ts`/`env.whatsapp.ts`/`numbers.env.ts`/`numbers.parity.ts`, `client-factory.ts`, `live-client.ts`, `numbers/{media-client,number-routes}.ts`, `direct/code-send.ts`, `reaction-line.ts`, `activity.route.ts`, `sender/hold/hold-key.ts`, `send-plan.ts` `crmPlan`, `message.worker.ts:84` (the Retry-After wait), `templates/{catalog,check,sync}/*` crm branches, `inbound-media.service.ts`; WaError's `credential: 'crm'` / `crmCode` / `retryAfterMs` / `unsupported: 'crm'` / `template`; shared `catalog/integrations/{keys,driver-keys,checks}.ts`, `messaging/chat/line-views.ts`; wa-stub `providers/crm.ts` + `state.ts`; e2e `support/core/wa-stub.ts`; docs/19 and docs/09 updated. No migration in this row: the `20261025000640_wacrm_driver` Vault keys and settings retire in a separate owner-gated migration (`wacrm-driver.migration.test.ts` stays with it) | ≈ 60 (mostly deletions) | L (delete) | h9a | CI + wa-stub e2e |
| h9c | Old-CRM history media (`messages/crm-history/*`, `messages/crm-copy/*`): deleted once the crm-media-copy job is done. If it stalls, `crm-media.fetch.ts` → `bytes({ maxBytes })` on a `redirect: 'manual'` profile with the table 429/5xx → 502 `crm_unreachable`, anything else → 410 | ≈ 20 | L / B | owner: copy job done | CI |
| ht | `tools/scripts` (`env/deploy-baseline.mjs:48`, `seed/seed-test-account.auth.mjs:17`): optional, last | 2 | B | R11 lint, k3a | CI |

Kept, not wrapped: the Stripe SDK (money path, with its own retries and idempotency; its metadata reads get zod in z7), supabase-js, google-auth-library OAuth calls (consent, exchange, revoke, `getRequestHeaders`), `pdf-client` (a unix socket to our own sandbox, already zod), mobile `send-file` / `send-voice` (local file reads, exempt in H-1).

### 3.3 Lane Z: zod at every boundary

| id | Scope | ≈ files | Type | Depends | Verified |
|---|---|---|---|---|---|
| z1a | One 400 envelope (`validation_failed` + `[{ path, message }]`). The leads and job-applicants `parseOr400` (`code: 'validation'`) switch over, and so do the public pricing catalog/quote routes. Grep @e214 found no web or mobile reader of `code: 'validation'`. Mobile `payment-errors.ts:21-24` reads `validation_failed` and is unaffected | ≈ 15 | **L (contract)** | — | CI + affected e2e; client tests on the new shape |
| z1b–f | `ZodBody(schema)` / `ZodQuery(schema)` (docs/32 s5a–b, moved here, D8) replace ≈ 254 parse calls, one domain per PR. Guardians `parse` and leads `parseOr400` are deleted; one `pageQuerySchema` + `listQuerySchema` stay in `common/http` | ≈ 40 each | B | z1a; that domain's r-row merged or FROZEN | CI + affected e2e |
| z2a | `ZodParam(name, schema, code)` for the 51 raw `@Param` strings: `:phone` → `phoneE164` / `chatListPhone`, `:month` → `monthSchema` (replacing `payouts.controller.ts:43`'s inline check, same `invalid_month`). The 4 `*Param` helpers go | ≈ 30 | B (same error codes, tests per route) | z1b | CI |
| z2b | The 145 `ParseUUIDPipe` params → `ZodParam(name, z.guid())`. `z.guid()` accepts what Nest's loose hex check accepts; `z.uuid()` enforces the RFC version/variant nibbles. The 400 body changes from Nest's `Validation failed (uuid is expected)` to the z1a envelope | ≈ 40 ×2 | **L (contract)** | z1a, z2a | CI + affected e2e |
| z3 | Settings PATCH body → `settingsUpdateSchema`; shared `validate.ts` → `settingZod(def).safeParse`, and its kind table goes | ≈ 8 | B | f5 | CI |
| z4 | `metaWebhookSchema` (shared `messaging/meta-webhook/`): changes discriminated on `field`, `kapsoMessageSchema` extends it, and each item is safeParsed (one bad item never 4xx's Meta). Replaces the path walker in `webhook.parse`, `.calls`, `.echoes`, `external-message`, `inbound-history`, `kapso-history`, `external-catchup.job` | ≈ 20 | B | h4; r5 | 2 reviewers; signature check before parse unchanged; anonymised recorded fixtures; wa-stub e2e |
| z5 | LiveKit webhook: header, claims and event schemas (`livekit-webhook*.ts`); the re-checks in `max-duration.rule.ts` go | ≈ 8 | B | h5 | JWT verified first; classroom e2e |
| z6 | `interactivePayloadSchema` (shared `messaging/payload/`): button reply, unavailable, reactions, rating, markers, echo, `receipt-candidates`, `auth-template` → one safeParse + `Record<type, reader>`. 6 isRecord copies go (shared 5 + `receipt-candidates.ts:19`) | ≈ 15 | B | — | CI |
| z7 | DB JSON columns: `payoutBreakdownSchema` + `statementTotalsSchema` (PayoutLine = `z.infer`), `lineHealthSchema`, `activityMetaSchema`, `templateLineSyncSchema`, `quoteResponseSchema`, the report row → `reportContentSchema`, Stripe Checkout metadata (`link-fulfilment.ts:37`); `.catch` defaults for legacy rows | ≈ 25 | B | — | money: 2 reviewers; legacy-row fixtures; no migration |
| z8 | Shared duplicates: `renewal.ts` (quoteResponseSchema), `qualification-form.ts` (`leadQualificationSchema.partial().catch({})`) | ≈ 4 | B | z7 | CI |
| z9 | `jsonOf(schema)` (new, shared core/schemas); `supabaseClaimsSchema` (api `verify-token.ts` + mobile `role-claim.ts`), `oauthStateSchema`, `cacheEnvelopeSchema` | ≈ 10 | B | g5 | auth: 2 reviewers |
| z10 | Client error bodies: one `errorCode` (shared `core/async/errors.ts`, zod); the 63 hand readers of `ApiError.body` → `ApiError.code` | ≈ 40 each | B | cl1 | CI + affected e2e |
| z11 | Web `validateSearch` ×37 → `(s) => schema.parse(s)`; `.catch` keeps today's defaults, so URLs do not change | ≈ 40 | B | g5 | full e2e |
| z12 | Mobile `useParams(schema)` in `core/hooks` (the folder does not exist yet: the mobile c-row that creates `core/hooks`, or z12 creates it), replacing the 79 `useLocalSearchParams` | ≈ 40 ×2 | B | g5, c30 | jest-expo; `native-changes` «none» |
| z13 | Client env: one schema each (web `lib/http/env.ts`, mobile `core/lib/http/env.ts`). Forms: the submit value is parsed with the shared schema, in the PR that touches the form (lane S s6a–c / s9) | ≈ 10 + rides | B | g5 | CI |
| z14… | Own-API success bodies (D2): per domain, after its cl5 repository PR, the repo's calls take the shared response schema. A mismatch is ApiError `bad_response`, shown as the generic error. Calls cl5 leaves in `use-*.ts` hooks are swept last | ≈ 40 each | **L** | h3, that domain's cl5 | CI + affected e2e |

### 3.4 Lane F: flatten the hotspots (IF map ranks 1–29)

| id | Scope | ≈ files | Type | Depends | Verified |
|---|---|---|---|---|---|
| f1 | google-sync: `report-pdf.writer` write (cx 18), `sheet-rows.writer` attendance (17) + summary (19), `calendar.writer` write (18), `drive-files` ensure → ordered gate tables via `firstGate(gates, input)` in `writers/`, plus `Record<kind, step>`; `google-sync.processor` runOnce (cx 17, depth 3) → STOP / COUNTER / CTX maps | ≈ 15 | B | after h7, or FROZEN; r15 | 2 reviewers; a test per gate; google-stub |
| f2 | Money: `commission.ts` (zod `commissionInputSchema` + COMMISSION map; `commissionAction` table), `earning-sync.ts` (planCounted / planUncounted), `checkout.service.ts` target (`linkClosed` + SESSION map), `stripe-webhook.service.ts` dispatch (mapped-type HANDLERS) | ≈ 12 | B | r12 | 2 reviewers; money tests unchanged; stripe-test flag untouched |
| f3 | Messaging: `thread-send.service.ts` template guards → BLOCKED_TEMPLATES + an ordered guard list; `numbers.service.ts` update (depth 3 → 1); web board `messages.ts` → shared `boardMessageSchema`, `reducer.ts` → APPLY; mobile `voice-machine.ts` → NEXT transition table | ≈ 15 | B | g5, D5 | CI + classroom e2e |
| f4 | People and auth: mobile `verify-role.ts` (zod meSchema + ROLE_APP + `claimFallback`), `users.logic.ts` chooseRole (zod roleRequest) + profilePatch (`sentOnly`), `users.links` candidates (LINK_SOURCES), `staff-photo-admin.ts` (OWNER + `orNotFound`) | ≈ 12 | B | r3 | auth: 2 reviewers |
| f5 | Settings: SETTING_ZOD mapped type (`schema.ts`); one VALUE_TEXT in client-core (web `value-format` + mobile `value-text`); ValueEditor EDITORS; the `rules.legacy` codec table; `rule-text` TIMING_TEXT | ≈ 12 | B | g5 | CI |
| f6 | UI: STATEMENT_ACTIONS in client-core (web StatementActions + mobile `statement-can`), `meeting-mode-notes` JOIN_NOTE, `use-picker-keys` KEYS, ExpensesPage `act` | ≈ 10 | B | — | CI + affected e2e |
| f7 | The 3 api `max-depth` offenders (`student-expiry.job`, `horizon.job`, `rule-projection`) | ≈ 6 | B | — | occurrence and DST tests unchanged |
| f8 | Patterns: Postgres codes → the one `dbError` table (rides docs/32 rq1); optional filters → a FILTERS table per repository (rides each r-row) | rides | B | rq1 / r* | — |
| f9… | IF hotspots #30–40, then the complexity suppressions top-down (api 42, web 97, mobile 49, tools/scripts 14, migrate 10, e2e 9, …); each PR removes its rows | ≤ 40 each | B | g7 | CI |

### 3.5 docs/32 amendments (D8)

- s4 → lane F (f1, the stripe part of f2, the ValueEditor and settingZod parts of f5, f7). **WizardBody + draft.steps (the step registry) is not handed over:** it stays in lane S as a smaller s4. s5a–b → lane Z (z1b–f), and lane S drops that row.
- D5 replaces s4's «reducers and state machines keep their exhaustive switches».
- z10 depends on lane K's cl1: it builds on cl1 and does not redo it. h3 stays out of `api-error.ts` and is FROZEN while cl1 is open. If `safeJson` / `retryAfterMs` end up used on both sides, they move to `@ab/core` (cut by k3a; the package does not exist yet). Until then each runtime keeps one copy.
- cl5 stays B: the success-body parsing it enables is z14 (L), one row per domain after it.

### 3.6 What runs in parallel

| Phase | Runs together | Serial inside | Blocked by |
|---|---|---|---|
| 1 | hzf0, g5, h0 | — | the owner's go on this doc |
| 2 | g6 → g7 ∥ h1–h3 ∥ z1a → z1b–f, z6, z7, z9 ∥ f2, f5, f6, f7 | each lane's own list | g5, h0, D9 (h3), cl1 (h3) |
| 3 | h4 → h5 → h6 → h7 → h8 → h8b ∥ g8, z2a → z2b, z3–z5, z8, z10–z13 ∥ f1, f3, f4, f8 | lane H, one integration per PR | r-row freezes (§3), cl1, c30 |
| 4 | z14… ∥ h9a → h9b, h9c | — | cl5 per domain (z14); the Meta-direct cut-over + the owner's go (h9a–b); the copy job (h9c) |

About 48 PRs: G 5 · H 14 · Z ≈ 19 (plus z14 per domain) · F ≈ 10 (plus f9 and the rows that ride r-rows or s6a–c/s9).

## 4. Shared client API sketch (signatures only)

```ts
// apps/api/src/common/infra/http/failure.ts
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
export type HttpFailure =
  | { kind: 'network'; reached: boolean }   // reached = !NEVER_SENT before headers (today's mayHaveReachedMeta); always true after headers
  | { kind: 'timeout' }                     // the deadline fired (signal + race); a timeout may have reached the peer
  | { kind: 'status'; status: number; body: unknown; text: string; retryAfter: string | null } // text capped at 300, '' when errorBody is 'omit'
  | { kind: 'shape'; status: number; issues: z.core.$ZodIssue[] };
// A caller abort (HttpRequest.signal) is rethrown as signal.reason, never a failure.
// No failure carries the URL, a header value or the request body.

// errors.ts: lookup = exact status → '4xx' | '5xx' → the failure kind → default. No if-chains.
type TableKey = number | '4xx' | '5xx' | 'timeout' | 'network' | 'shape';
export type ErrorTable<E extends Error> = Partial<Record<TableKey, (f: HttpFailure) => E>> & {
  default: (f: HttpFailure) => E;
};
export function errorFor<E extends Error>(table: ErrorTable<E>, failure: HttpFailure): E;
// A Retry-After parser lands with its first non-CRM reader (today only crm-http reads it; h9b deletes it).

// http.ts
export interface HttpProfile<E extends Error> {
  name: string;                  // the only service name in messages and logs
  base: () => string;
  headers: () => Promise<Record<string, string>>; // {} for a no-credential profile (Kapso download_url); Google: getRequestHeaders()
  timeoutMs: number;
  redirect: RequestRedirect;     // required, today's value: 'manual' web-push / old-CRM media; 'follow' the rest; 'error' Kapso after h8b
  errorBody: z.ZodType | 'omit'; // 'omit': never keep the body (Kapso)
  errors: ErrorTable<E>;
  fetch?: FetchLike;             // test seam; LiveKit's LIVEKIT_HTTP
}
export interface HttpRequest {
  path: string;                  // relative to base(), or an absolute URL
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  json?: unknown;
  raw?: Uint8Array<ArrayBuffer>;
  headers?: Record<string, string>; // override or add (the upload's `authorization: OAuth …`, `file_offset`)
  timeoutMs?: number;            // overrides the profile (media bytes: 60 s)
  signal?: AbortSignal;          // combined with the deadline (AbortSignal.any; Node ≥ 24)
}
export type JsonCall<S extends z.ZodType> = HttpRequest & { schema: S };
export type BytesCall = HttpRequest & { maxBytes: number; tooLarge: () => Error }; // tooLarge: e.g. 413 invoice_too_large
export interface Http {
  json<S extends z.ZodType>(call: JsonCall<S>): Promise<z.output<S>>; // throws E from the table
  bytes(call: BytesCall): Promise<{ bytes: Uint8Array; mime: string | null }>;
  status(call: HttpRequest): Promise<number>; // any status; never consults the table
}
export function createHttp<E extends Error>(profile: HttpProfile<E>): Http; // never retries

// One profile's table (h8): today's graph.ts + byDriver, as data. Only credentialed profiles get 401/403 entries;
// the no-credential download profile uses a plain table (graph.ts:121-122).
const kapsoErrors: ErrorTable<WaError> = {
  401: kapsoKeyRefused, // byDriver's rule, incl. its two pass-through guards (Meta's own auth code; a Meta code ≠ status)
  403: kapsoKeyRefused,
  network: (f) => new WaError('WhatsApp request failed', { code: null, status: 0, uncertain: reachedOf(f) }),
  timeout: () => new WaError('WhatsApp request timed out', { code: null, status: 0, uncertain: true }),
  shape: (f) => new WaError('Unexpected WhatsApp response', { code: null, status: 200, details: issuesOf(f) }), // h8b: uncertain on POST /messages
  default: waErrorFromMeta, // metaErrorSchema → { code, status, details }; else details = text
};

// packages/client-core/src/core/http/api-client.ts (h3; ApiError.code comes from cl1)
export interface ApiCall<S extends z.ZodType> { schema: S; method?: 'GET' | SendMethod; signal?: AbortSignal; timeoutMs?: number }
export interface ApiClient {
  apiFetch<S extends z.ZodType>(path: string, call: ApiCall<S>): Promise<z.output<S>>;
  apiSend<S extends z.ZodType>(method: SendMethod, path: string, opts: { body?: unknown; schema: S; timeoutMs?: number }): Promise<z.output<S>>;
  apiBlob(path: string): Promise<Blob>;
}
export interface ApiClientOptions { baseUrl: () => string; accessToken: () => Promise<string | null>; clientTag: () => string; fetch?: FetchLike; getTimeoutMs?: number }
export function createApiClient(opts: ApiClientOptions): ApiClient; // timeout: AbortController + setTimeout (RN-safe), GETs only by default (D9)
export const publicApi: ApiClient; // createApiClient({ …, accessToken: async () => null })
```

No function takes more than 3 parameters. The core has no retries: send paths must never resend an `uncertain` request, and retries stay where they are today (send-plan, google `backoff.ts`, pg-boss).

## 5. Risks

| Risk | Mitigation |
|---|---|
| A send is repeated (duplicate WhatsApp to a family) | The core never retries. `uncertain` maps exactly as today (NEVER_SENT moves unchanged), and the `meta-callers.test-util` tests stay unchanged. The two cases that resend today (a 2xx whose body read fails, a 2xx without a message id) become `uncertain` in h8b, an L row with its own tests. h8/h8b get 2 reviewers, wa-stub e2e and Meta test credentials + allow-list only |
| A client timeout splits a POST (the server sends, the user taps again) | D9: client-core times out GETs only, and mutations opt in per call |
| A table changes which errors hold a line or fail rows | Each profile's table gets a test per key that replays today's cases (byDriver, `parsed()`, classify) before the old code is deleted. `download_url` uses a no-credential profile, so its 401 never holds the line |
| A hard deadline is lost | h0 races the transport against the deadline. `kapso-reopener.test.ts:34-43` (a fetch that ignores its signal) stays unchanged |
| Schemas reject what the code accepted | `z.looseObject` for external bodies; item-level safeParse for webhooks; `.catch` for legacy DB rows; `z.string()` where today only checks `typeof` (userinfo); `z.guid()` where ParseUUIDPipe was; a shape failure goes to the table and never crashes a job |
| Webhook security | Signature and JWT checks on the raw bytes stay first (Meta, Kapso, wacrm until h9b, LiveKit, Stripe `constructEvent`); zod parses only verified payloads |
| Money path (payouts, statements, commission, Stripe) | 2 reviewers; existing money tests unchanged; the Stripe SDK is not wrapped; the stripe-test flag is untouched |
| The owner's real Calendar, Drive and Sheets (h7, f1) | google-stub tests, incl. a token refresh; deploy only on the owner's go; «staging» is production until #497 |
| Real families and push | No real WhatsApp or push in tests (h6); never send through Kapso; no notifications |
| Mobile ships by OTA only | zod is pure JS; `native-changes` «none»; client-core's timeout avoids APIs React Native lacks |
| Secrets or private data in error text | Failures never carry the URL (`FX_API_URL` and Kapso's `download_url` hold secrets), headers or the request body; a sentinel test in h0; Kapso `errorBody: 'omit'`; Google `errorText` redaction kept; Kapso's `x-api-key` never follows a redirect (h8b) |
| Hidden behaviour change | The L rows are named: z1a and z2b (400 bodies), z14 (success parsing), h3 (D9 timeout), the new timeouts in h2 and h5, h8b, h9a–c. Everything else keeps routes, contracts, query keys, i18n keys and DI tokens, with its tests unchanged |
| Lint churn and selector collisions | `pnpm lint:prune` output is committed in the PR; one selector list in `@ab/config` + the `calculateConfigForFile` test; no new rule in `.oxlintrc.json` |
| Two lanes edit one file | The freeze rule in §3 (r-rows per module); s4 and s5 handed over (D8); h3 frozen behind cl1; z14 after cl5 |
| CRM removal breaks the notifications line | h9a–b run only after the cut-over is live, no line is set to `crm`, and the owner says go. The clients drop the option before the api drops support |

## 6. How the lanes run

- hzf0 writes three new routine files, `refactor/lanes-v2/{H,Z,F}.md`, from G.md's template: STATE, one driver per lane, THE LOOP, SAFETY, NEVER, PR body, GIT, REPORT, ABSOLUTE IMPORTS. Each adds its lane block from §3, the §1 checklist, the §3 freeze rule and this doc as required reading; docs/32 and its critic corrections still apply. g5–g8 join lane G's row list.
- One open PR per lane. Rows are `cloud/review-<id>` and merged by the owner's assistant after review. Most rows get one fresh-context reviewer; h7, h8, h8b, z4, z7, z9, f1, f2 and f4 get two. Drivers never merge.
- Lanes run every 3 hours, like lane G. Each session verifies only the affected packages; CI in GitHub Actions is the full gate. Nothing runs on the owner's PC, and lanes never touch servers, `.env`, messages or notifications.
- DONE / BLOCKED / FROZEN as in G.md. External blocks: cl1 (h3, z10), cl5 (z14), the r-rows in §3, c30 (z12), and the Meta-direct cut-over + the owner's go (h9a–b).
- **Done when:** there is no `fetch` outside the two clients and the H-1 exempt list; the H-1, H-2, Z-1, Z-2, Z-5 and F-1…F-3 suppressions are 0; the CRM driver is gone; every boundary type comes from `z.infer`; `pnpm turbo lint typecheck test` and e2e are green in CI.
