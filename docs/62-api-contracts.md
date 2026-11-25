# 62 · Shared API contracts, one pagination path, a DRY data layer

Plan for: «move the request and response zod schemas to packages so they are used in both the frontend and the backend», «a reusable pagination logic», «the back end dry and really reliable», «dont type enum objects», «write a function to reuse the zod schema» (owner, 2026-11-25). Paths and line numbers were read on develop `4eef53603`, before the Nest module split; every PR looks them up again on current develop.

## Decisions (owner, 2026-11-25)

- **PRs.** Five PRs to develop, in this order: A, B, E, C1, C2 (§5 of part 1). Part 2's two PRs fold in: the enum tables, `ab/no-typed-value-table` and `guard:mappers` go into **B**; the portal-history pilot (`portal-outcome.ts`, `asResponse`, `toHistoryRow`) goes into **C1**.
- **E's wire changes:** approved as one set, exactly the rows marked E in part 1 §6 «Intended wire changes». Any other wire change needs a new go.
- **Class C:** two PRs, C1 and C2.
- **Response mismatches: strict.** `asResponse` answers 500 `response_invalid` (paths logged, never values) for a row that does not fit its schema. Client-core parses responses with the shared schemas and throws `bad_response` on a mismatch (docs/36 z14). The `@Returns` interceptor still runs only in tests and e2e.
- **Read-only data counts** (part 2 §6 Q1): yes on a staging database, with a read-only key the owner adds. Any count on the database with real users' data needs the owner's go each time.
- **Reviews.** The hourly conductor reviews each PR once, when every check on its head is green, and adds `reviewed` + `auto-merge`. E is labelled only if its diff changes nothing outside the approved table.
- **Prerequisites.** `nest/all-modules` and #937 (oxlint only) merged. The api comment sweep and the remaining api unit folds are not prerequisites; they pause while B, E, C1 or C2 is open.

# Part 1 · Contracts, pagination, DRY and reliability

I read everything below from `origin/develop` at `4eef53603` (2026-11-24 23:01Z). Every api path and line number is from before the Nest batch.
- `nest/all-modules` is at `6b1b46c97`: 730 files changed, 595 of them renames, and no PR is open yet. Every PR that touches `apps/api` starts after that branch merges and looks its paths up again then.
- #937 (oxlint only) has been OPEN and CONFLICTING at `771a389a` since #932 merged. Anything that waits for #937 also waits for its rebase.

This plan replaces one line in docs/36 row z1b–f: «one `pageQuerySchema` + `listQuerySchema` stay in `common/http`». It builds:
- docs/36 h3 (`apiFetch(path, { schema })`);
- docs/36 z2b (`ZodParam` instead of `ParseUUIDPipe`);
- the first z14 step;
- the docs/57 §2.5 helpers `id()` and `pageOf(schema)`.

PR A updates docs/36 and docs/57 §2.5 to match.

Changes from the draft:
- Wire changes move out of the refactor PRs into one PR (E). E waits for the owner's go and is merged by hand.
- Ledger, my payments, chat search and report history keep their response shapes.
- `bookingRequestSchema` stays in `@ab/shared`.
- DB errors keep Nest's exception classes.
- The per-file `guard:contracts` gate is gone.
- These are dropped: `table.ts`, `byIds`, `insertOnce`, the cursor envelope helpers, the four per-copy Tickers and the coverage claim.

### 1. Contracts

#### Where they live

A schema goes in the lowest package that already owns everything it imports, so no new package edge is needed. `refactor/guards/packages.json` already allows:
- schedule and money to import core, time and catalog;
- shared to import those four plus settings;
- client-core and the apps to import every package below them.

The facade gate (`packages-facade.mjs`) requires each name to be imported from the package that owns it. `@ab/core` exports only `"."`.

| Contract | Home | Why there |
|---|---|---|
| `id()`, `clientRequestId` (16 copies), `pageQuery`, `pageOf`. `id()` is `z.guid()`, which is as loose as `ParseUUIDPipe`'s default regex. | `packages/core/src/schemas/{id,page}/` | Every domain uses them, and core already depends on zod. |
| `createdIdSchema` (`{ id }`, 5 inline returns), `apiErrorSchema` | core, added by the first PR that uses each (C1 and E) | Not built before something uses them. |
| Payments, subscriptions, pricing (`catalogQuery`, `quoteQuery`), assistant commissions, earnings | `packages/money/src/<area>/<feature>.schemas.ts` | Their imports stay within core, time and catalog. `ledger/schemas.ts:50,83,102` already live here. |
| `slotsQuerySchema`, `outsideSlotsQuerySchema` and `teacherOptionsQuerySchema` (booking.dto.ts), `outsideSlotsResponseSchema`, `conflictsSchema` (4 inline `{ conflicts }` returns) | `packages/schedule/src/booking/booking.schemas.ts` | Their imports stay within catalog, core and schedule. |
| `bookingRequestSchema` and its `z.preprocess(withPackageSize, …)` wrapper | `packages/shared/src/schemas/booking-request.ts`, unchanged. The wrapper moves next to it. | It imports `guardianCreateSchema` and `studentCreateSchema` from shared (`booking-request.ts:2-3`), and schedule may not import shared. |
| Invoices (`INVOICE_SORT_KEYS` from money, `InvoiceView` from schedule) | `packages/shared/src/finance/invoices.schemas.ts` | Only shared may import both. |
| Payment attachment routes | Keep using `signedUploadSchema` and `signedDownloadSchema` from `@ab/shared` (`reports/page-access.ts:43`). | No money schema builds on them, and the api imports shared directly. |
| Threads, leads, job applicants, students, guardians, teachers, push and web push | `packages/shared/src/{messaging,sales,people,notifications}/<feature>.schemas.ts` | Their column shapes already live at `people/schemas/people-sort.ts:19-58`. |

- A feature with 3 or more files gets its own folder with an `index.ts` (rule 13).
- Each `x.schemas.ts` has an `x.schemas.test.ts` beside it, written red first with the bad payload.
- `guard:packages` runs on every PR, so CI fails any schema whose imports would need a new edge.

#### Naming

Names follow `<feature><Role>Schema`. Role is one of `ListQuery`, `Query`, `CreateBody`, `UpdateBody`, `Body`, `Params`, `Row`, `View` or `Page`. The repo already uses the `Schema` suffix (`guardianCreateSchema`, `shortLinkListQuerySchema`).
- **Types.** A type is its schema's name without `Schema`, for example `type LeadListQuery = z.infer<typeof leadListQuerySchema>`. Where defaults make the input differ, clients use `z.input<…>` (`LeadListQueryInput`).
- **Response type names stay.** For example, `NotificationsPage` (`shared/notifications/views.ts:18`) becomes `z.infer<typeof notificationsPageSchema>`. None of its importers change, and typecheck shows that the schema matches the old interface.
- **Response schemas describe only what goes over the wire.**
  - They have no `transform`, `default`, `coerce` or `preprocess`, so `z.input` equals `z.output`.
  - They use `z.object`, never `strictObject`. Unknown keys are stripped, so an old client accepts extra keys from a newer server.
  - Instants use core `instant`.

#### How the api uses them

**Input** uses the decorators that already exist in `apps/api/src/common/http/zod-inputs/zod-inputs.ts`: `@ZodBody`, `@ZodQuery`, `@ZodParam` and `@ZodParams`. Pipe order does not change.
- **Raw bodies and queries.** 89 raw `@Body()` and 61 raw `@Query()` (126 `parseOrThrow(` calls in 51 controllers) switch to the decorators.
- **Services.** The 17 controllers that pass `unknown` to a service parse in the controller instead, and their services take typed input.
- **Id params.** At least 145 `@Param(…, ParseUUIDPipe)` params (single-line matches) become `@ZodParam('id', id())`. The 81 other plain `@Param` strings get a schema.
- **Public token routes keep their order and their codes.**
  - `student-link.service.ts:128-129` checks the rate limit (429) before the token shape (404 `link_invalid`). Clients map that code to «هذا الرابط غير صحيح».
  - The param therefore becomes `@ZodParam('token', tokenText, () => notFound('link_invalid'))`, where `tokenText` checks length only.
  - `looksLikeLinkToken` and the rate limit stay in the service.
  - Feedback's public routes keep 404 `feedback_not_found`, and `pay.controller.ts` keeps its HTML 404 page.
  - Each public route gets one test that pins status and code.
- **Wrappers.** Thin wrappers move into the package next to the schema they wrap: `blanksToNull(guardianCreateSchema)`, `jobApplicantCreateSchema.omit(...)` and `withPackageSize`.

**Responses** get one decorator and one interceptor in `apps/api/src/common/http/returns/`. Both land in C1, the first PR that uses them.

```ts
// returns.ts: the handler's return type must match the schema at compile time
export function Returns<S extends z.ZodType>(schema: S): ReturnsDecorator<z.input<S>>;
// returns.types.ts
export type ReturnsDecorator<T> = <F extends (...a: never[]) => T | Promise<T>>(
  target: object, key: string | symbol, d: TypedPropertyDescriptor<F>) => void;
```

- **How the check works.** `ResponseCheckInterceptor` is global and runs only when `API_CHECK_RESPONSES=1`. The api vitest setup and the e2e job's API env set that flag.
  - It computes `wire = JSON.parse(JSON.stringify(body))` and `parsed = schema.parse(wire)`.
  - It fails with 500 `response_contract` unless `isDeepStrictEqual(parsed, wire)` (`node:util`).
  - Response schemas have no transforms, so the two values differ only when a key was stripped.
  - That catches missing fields, wrongly typed fields, and undeclared columns that a `select('*')` leaks. Client-side schemas do not need to be strict for this.
  - The check never replaces the body. Production parses nothing.
- **Handlers without `@Returns` are skipped.** These need none:
  - `@HttpCode(204)` (54 handlers);
  - `@Redirect`, `@Res()` without passthrough, and `StreamableFile` returns (about 10 controllers: exports, finance-exports, short-links, pay, google-callback, report-public, ready and others).
- **Where the check runs.** Only where a test boots the Nest app: e2e plus about 91 api test files. Each route that C1 or C2 moves gets a route test that boots its controller with the check on.
- **`select('*')`.** There are 81 calls in 35 api files, and rule 19 wants explicit column lists. C1 and C2 replace each one on a served route with a column list built from its row schema's keys. C2 also replaces the rest, and `ab/no-select-star` turns on there once the count is zero.

#### How clients use them

- **client-core h3 (A).**
  - `apiFetch(path, { schema })` and `apiSend(method, path, { body, schema })` return `z.output<S>`.
  - They sit next to the generic overload in `packages/client-core/src/core/http/api-client/api-client.ts`. That overload stays only for blobs and 204 responses.
  - Parsing goes through one `parseResponse(schema, body, path)`. In dev and test, a mismatch throws `ApiError('bad_response')` (docs/36 z14). Production behaviour is question 3.
- **Per endpoint (C1, C2).**
  - Files go in `packages/client-core/src/<domain>/<feature>/{x.api.ts,x.keys.ts,x.query-options.ts}`.
  - They return plain `{ queryKey, queryFn, … }` objects like `shortLinkQueries` (`short-links-api.ts:79-85`), because client-core has no TanStack dependency.
  - Apps keep thin hooks such as `useQuery(leadQueries(api).list(filters))`.
- **Request params** are typed `z.input<typeof xListQuerySchema>`. The hand-written duplicate types go: `RecordPaymentBody`, `PaymentPatch`, `CreateSubscriptionBody`, `SlotsParams`, `OutsideParams`, `PaymentFilters`, `SalesQuoteBody`, and the device-key and web-push bodies.

#### What stays in the api

- Env and config (`config/env/**` and the other 22 files).
- WhatsApp driver, google-sync, LiveKit, s3, expo-push and Drive payloads.
- DB-row and RPC parsing in repos and mappers, `relay.schema.ts`, lanes and events-transport.
- **Webhook controllers.**
  - Each keeps its payload schema in a sibling api file and parses after the signature check.
  - Nothing is renamed: renaming into an exempt glob is «not a fix» (docs/59 §5).
  - The contract rule in §4 looks only at decorator arguments and `z.` calls inside `*.controller.ts`, so these files pass without any exemption.
  - If one still declares `z.` inline, C2 moves that schema to a sibling file.
- **The two keyset cursor codecs.** `~` in `shared/messaging/sync-cursor.ts` and `_` in `shared/messaging/message-actions/chat-search.ts` are separate wire formats that shipped clients send back, and their output types differ. Both stay where they are.

#### Mobile bundle

- Both mobile apps already depend on zod `^4.6.5` and import the `@ab/shared` barrel. Metro does not tree-shake, so the request schemas already ship.
- Response schemas add JS, plus some object construction at start-up.
- The CI «bundle mobile» job runs `expo export` (ci.yml:206) and prints no size today. A adds a step that prints `du -sb dist/bundle` for both apps, and each contracts PR body compares its size with develop's last run.
- I give no size estimate.

### 2. Pagination: one design

#### Shared schemas: `packages/core/src/schemas/page/` (A)

```ts
// page.types.ts
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number } // unchanged
export interface PageSize { size: number; max?: number }

// page.schemas.ts (spread into z.object, composes with listSortShape)
export const pageQuery = ({ size, max = 100 }: PageSize) => ({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(max).default(size),
});
export const pageOf = <T extends z.ZodType>(item: T) => z.object({
  items: z.array(item), total: z.number().int(), page: z.number().int(), pageSize: z.number().int() });
```

- A list query looks like `z.object({ ...pageQuery({ size: 25 }), ...listSortShape(LEAD_SORT_KEYS), status })`. That makes docs/57's `listQuery(keys)` unnecessary.
- Each endpoint passes today's default (10, 20, 25 or 50) and today's max (100; notifications 50).
- A replaces the 8 package copies with spreads that keep the same defaults and maxima. The copies are i18n `schemas.ts:19`, money `earnings-schemas.ts:29`, schedule `student-recordings.ts:46`, and five in shared.
- Six of those copies have no page cap today, so A does not add `MAX_PAGE = 10_000`. E adds it in one place.
- **No cursor query schema.** The four keyset endpoints read their cursor in three different ways, and shipped clients send each form:
  - `before` (threads, channel);
  - `cursor` as a bare ISO time (portal history);
  - `cursor` as `<iso>_<uuid>` (chat and message search).

  One shared shape would change the wire without any reuse. Add `cursorQuery` to core when a new keyset endpoint appears.

#### Api helper: `apps/api/src/common/db/page/` (E)

`common/db` is inside the `DB_CLIENT` lint globs. The builder types are structural, like `Orderable<T>` in `list-sort.ts`.

```ts
// offset.ts
export function readPage<Row, K extends string>(
  query: () => Pageable<Row>,           // db.from(v).select(COLS, { count: 'exact' }) + filters
  input: PageInput & ListSort<K>,
  sort: SortSpec<K>,
): Promise<PageRows<Row>>;             // { rows, total }: the route keeps its own envelope
export function toPage<T>(items: T[], total: number, input: PageInput): Page<T>; // RPC, in-memory
export function pageWindow(input: PageInput): { from: number; to: number };     // RPC lim/off
// keyset.ts
export function afterCursor<Q extends Keyset<Q>>(query: Q, spec: KeysetSpec, at?: AtId): Q;
// page.types.ts: Pageable<Row>, PageRows<Row> { rows: Row[]; total: number }, Keyset<Q>,
//                AtId { at: string; id: string },
//                KeysetSpec { column: string; key?: string; ascending: boolean }
```

**`readPage`** works at repo level.
- It applies the sort, then `.range(from, to)`, then `rows()` (§3), then `count ?? 0`.
- It returns `{ rows, total }`, the shape most repos already return.
- Each route keeps its wire envelope. Routes that already answer `Page<T>` use `toPage(items, total, input)`. Managed short links already answer `{ rows, total }` and keep it (frozen in §6).
- E pins the envelope of each of the 24 routes with a route test before it switches the repo.

**Past the end of a list**, PostgREST answers `PGRST103`.
- `readPage` then reads the total once with `query().range(0, 0)` and returns `{ rows: [], total }`.
- `users.repo.ts:55` (`totalBeyond`) already does this.
- This changes the wire, so it is in E (question 1).

**Stable order**, fixed in `applySort`:
- `SortSpec` gets `key?: string`, a unique column that defaults to `'id'`.
- `applySort` (`common/db/list-sort/list-sort.ts:27`) always ends with `.order(key)`.
- `v_threads` and `v_list_threads` have no `id` column (migration `20261106001100`), so `THREAD_SORT` sets `key: 'phone_e164'`. Every other `SortSpec` relation has `id`.
- `SortSpec.fallback` becomes a list of `{ column, ascending, nullsFirst? }`. Leads' default order today is `last_inbound_at desc nulls last, created_at desc` (`leads.repo.ts:112`), which the single `fallback` (`list-sort.ts:16`) cannot express. E first adds a test that pins that order.

**`afterCursor`** writes the keyset in the index-friendly form used at `sync.repo.ts:42`.
- The key column always sorts in the same direction as the main column, and tests cover both directions:
  - ascending: `.gte(col, at).or(`${col}.gt."${at}",${key}.gt.${id}`)`, then `.order(col).order(key)`;
  - descending: `.lte(col, at).or(`${col}.lt."${at}",${key}.lt.${id}`)`, then both ordered descending.
- It replaces the 4 hand-written keyset predicates: `sync.repo.ts:42`, `thread-messages.repo.ts:26`, `thread-around.repo.ts:44-45` and `subscription-cancel.repo.ts:53`.
- Callers keep their envelopes and their `more = rows.length > limit` line.
- Cursor instants stay Postgres text and never pass through `Date`, as `sync-cursor.ts` requires.

**What does not change:**
- `readAll`, `readChunked` and `readChunkedAll` keep their signatures (`common/db/read-all.ts`), and their roughly 46 `(from, to) => q.range(from, to)` callbacks stay.
- Rule 19 limits `readAll` to jobs. This plan adds no new `readAll` on a request path, and the request-path reads that already exist stay as they are.

**Folder cap.** `common/db` holds 8 counted code files. The new helpers go in unit folders (`common/db/page/`, `common/db/errors/`, `common/db/or-filter/`), not flat files (`folder-cap.mjs --strict`, rule 13).

#### Controller side

There is no new decorator. A list route is `@ZodQuery(leadListQuerySchema) q` plus `@Returns(leadPageSchema)`, with `leadPageSchema = pageOf(leadRowSchema)`. `pageOf` applies only to routes that already answer `Page<T>`. Short links keep `{ rows, total }` (`shared/schemas/short-link-views.ts:31`).

#### Client-core helper: `packages/client-core/src/core/paging/` (A; app changes in C1 and C2)

```ts
export function pageOptions<S extends z.ZodType>(client: ApiClient, list: ListEndpoint<S>, params: ListParams);
export function infinitePageOptions<S extends z.ZodType>(client: ApiClient, list: ListEndpoint<S>, params: ListParams);
// paging.types.ts: ListEndpoint<S> = { path: string; page: S }
```

- Both build the key with `listKey(path, params)` (`core/keys/query-keys.ts`) and parse through `apiFetch(path, { schema })`. `getNextPageParam` is `nextPageParam`.
- **In A:**
  - `nextPageParam` and `flattenPages` move out of `apps/staff-mobile/src/core/lib/query/paging.ts` with their tests, and staff-mobile imports them from client-core. `patchCached` stays where it is.
  - `parseResponse`, the `apiFetch` schema overload and `pageOptions` get client-core unit tests.
  - That is A's whole client change, and the moved staff-mobile paging tests prove it.
- **In C1 and C2** (merged by hand, after the staff-web unit folds):
  - `usePagedList` becomes a thin wrapper with no `useMemo` (rule 21).
  - The two re-implementations go: `use-thread-list.ts:44-64` (C2) and `recordings-queries.ts:20-33` (C1).
  - One `pageSearchSchema`, built from `pageQuery`, replaces the three web URL page parsers: `apps/staff-web/src/lib/list/server-list-search.ts:26-66`, `inbox/shared/search.ts:48` and `short-links/shared/link-routes.ts:21`.
  - Once a response arrives, it clamps the page to `ceil(total / pageSize)`. Clamping is new client behaviour, so each parser's current cases get a test first.
  - `USERS_PAGE_SIZE` and the notifications query move to client-core once.
- **Skipped: cursor envelope helpers** (`cursorPage`, `cursorPageOf`, `infiniteCursorOptions`). Only message search returns `{ items, next_cursor }`, and it already has its own client-core code (`message-search.ts`). Add them when a second endpoint uses that envelope.

#### Endpoint migration (E unless noted)

| Group | Endpoints | Change |
|---|---|---|
| Offset `.range` + count: 24 reads in 21 files | notifications, activity, my commissions, invoices, payments, admin tasks, subscriptions, earnings ×2, threads, guardians, students, teachers, managed short links, sales academy, sales roster ×2, feedback, lessons, teacher reports, recordings, job applicants, leads | `readPage`. The query becomes `pageQuery({ size: <today's default>, max: <today's max> })` + `listSortShape`. Deleted: `common/http/http.ts:38` `pageQuerySchema`, `leads/http.ts:15-38`, `guardians/http.ts:24-41`, `bounds`, `rangeOf`, the inline `(page - 1) * pageSize` math and the hand-built page objects. `guardians.service.ts:31` and `students.controller.ts` move their DB reads into repos. |
| RPC and in-memory | users (`admin_list_users`), i18n keys, student report history | `pageWindow` + `toPage`. Report history keeps its one full read per student, because `series` is every submitted report, oldest first, ordered by the lesson's `starts_at` (`shared/reports/views.ts:115-121`, `report-history.mapper.ts:44-55`), and `GradeChart` draws all of it. Only the page slice uses `toPage`. |
| Keyset | sync, thread messages, thread around, subscription cancel | `afterCursor`. Envelopes unchanged. |
| Keyset, unchanged | channel ×4, portal history, chat search, message search | Chat search keeps its scan and `total`. Shipped clients parse `total` (client-core `chat-search.ts:19`) and step with it, and the Node matcher's exclusions (`looksCrmHistory`) have no SQL equivalent. The upgrade is the repo's own note, `search_messages(p_phones=[phone])` plus a count with a parity test, as a separate change. |
| Bare arrays, frozen | assistant ledger (`LEDGER_LIMIT` 500), my payments (`MY_PAYMENTS_LIMIT` 500) | No change. Shipped clients read arrays: `staff-mobile/src/sales-money/lib/my-api.ts:9,27` maps a non-array to `[]`, and the ledger reads in web and mobile have no guard. A test pins each array shape. |
| `.limit` above `max_rows` | expenses `.limit(5000)` (`expenses.repo.ts:42`) | PostgREST cuts it at 1000 anyway. E sets `.limit(MAX_ROWS)` so the code states the real cap. Paging waits until one year passes 1000 rows. |
| `.in()` past `IN_CHUNK` | invoices student filter (500), `studentIdsMatching` (200), sales subscriptions, attendance (500) | `readChunked` |

### 3. Backend DRY and reliability

Each item here repeats in the code today (counts below and in §8). Everything is in B and keeps the wire byte-identical, except where E is named.

#### 1. `common/db/errors/`

A unit folder with `unwrap.ts`, `pg-error.ts`, `errors.types.ts` and tests.

```ts
export function rows<T>(res: DbResult<T[]>, map?: PgErrorMap): T[];
export function one<T>(res: DbResult<T | null>, map?: PgErrorMap): T;      // null → NotFoundException
export function maybe<T>(res: DbResult<T | null>, map?: PgErrorMap): T | null;
export function done(res: DbStatus, map?: PgErrorMap): void;
export function pgError(error: PostgrestError, map?: PgErrorMap): Error;
export function uniqueViolationOn(error: PostgrestError, constraint: string): boolean;
// errors.types.ts
type ToError = (e: PostgrestError) => Error;
export type PgErrorMap = {
  codes?: Partial<Record<SqlState, ToError>>;  // by SQLSTATE
  constraints?: Record<string, ToError>;        // by constraint name
  raised?: Record<string, ToError>;             // P0001 messages
  otherwise?: ToError;                          // replaces the default's last branch
};
```

**The default map is exactly today's `dbError` at `common/http/http.ts:30`:**
- 23505 → `ConflictException({ message: 'duplicate', detail })`;
- 23503 → `ConflictException({ message: 'fk_violation', detail })`;
- `PGRST103` → 400 `page_out_of_range`;
- anything else → a plain `Error`, which Nest answers as 500.

It returns Nest's exception classes, so `instanceof ConflictException` keeps working at `family-move.service.ts:86`, `people-edit.service.ts:19` and `leads.service.ts:61`.

**The guardians copy** (`guardians/http.ts:46-60`) answers differently, and B keeps the difference:
- 23505/23503 → `ConflictException(<code>)`;
- P0002/PGRST116 → 404;
- 22023/23514 → `BadRequestException(error.message)`;
- anything else, including PGRST103 → `InternalServerErrorException(error.message)`.

B reproduces it as one preset, `peopleErrors(code)`, built with `otherwise`. Its 6 caller files use the preset: the guardians service and phones, the students repo and service, `lead-link.ts` and `merge.service.ts`. E moves them to the default map plus explicit codes (listed in §6).

**Other local maps keep their codes.** `people-edit.repo.ts:22` maps `'23505'` to `phone_taken`, and leads keep `{ code: 'duplicate_phone' }`.

**What it replaces:**
- the 2 `dbError` copies (`common/http/http.ts:30`, `guardians/http.ts:46`);
- the local `check` helpers: 12 with 73 calls per the DRY audit, while 19 declarations are named `check`;
- 653 `throw dbError(` lines, out of 846 `if (error) throw` lines of any kind in 259 files;
- about 14 P0001 mappers, through `raised`: `scheduling/rpc.ts:22`, `course-pause.repo.ts:22`, `report-rpc.ts:13`, `assistant-pay.errors.ts:25` and others.

**Unique violations.** `uniqueViolationOn` replaces the 39 `'23505'` compares. The 4 idempotent inserts keep their own strategies:
- return null at `payments.repo.ts:79` and `subscriptions.repo.ts:76`;
- call the RPC again at `booking.repo.ts:118` and `instant.repo.ts:18`.

**The codemod** is `tools/scripts/codemods/db-unwrap.mjs`, committed with fixture tests so it can run again after a rebase.
- It rewrites only the patterns its fixtures prove equal.
- It keeps each call's explicit code.
- It stops and lists any site it cannot map.

**`throw new Error(… error.message)`** appears 183 times in `apps/api/src`: 128 in repo and query files, 55 elsewhere.
- All of them wait for E, because the default map would turn some of their 500s into 409 or 400.
- E rewrites the 128 and checks the 55 one by one. Storage, auth and fetch errors among them are not `PostgrestError` and stay as they are.

#### 2. The error envelope (E)

- `apiErrorSchema` in core is `{ code, message?, issues? }`.
- One `httpError(status, code, details?)` in `common/http/errors.ts` replaces `domainError` (59 uses) and `waHttpError` (116 uses).
- A global filter beside `DbTimeoutFilter` adds `code` to Nest's default bodies and to the 33 `{ message: '<code>' }` bodies, and keeps `message`.
- The default map drops `detail`. `details` and `message` go to the log with the request id.

#### 3. `clientRequestId`

It comes from core, replacing 16 copies.

#### 4. DB calls made in a loop

They are fixed with plural reads that already exist. There is no new `byIds`.
- `thread-people.ts:31` uses `BalanceRepo.forStudents` (`balance.repo.ts:53`), which `thread-people.ts:45` already uses.
- `sales-renewals.ts:19` calls `PackagesService.studentBalance` once per student inside `Promise.all`, and `PackagesService` has no plural read.
  - B adds `studentBalances(ids)` on the existing plural reads (`SubscriptionsRepo.forStudents`, `subscriptions.repo.ts:60`), but only if a test shows the same result per student.
  - Otherwise the site stays for the R9 lane.
- `sales-money.reads.ts:39` and `report-lesson.queries.ts:25,69` use `readChunked`.
- `StorageService.signMany(paths)` replaces the three signed-URL loops.

#### 5. Hand-written read-all loops

The 4 loops become `readAll`, with the same result: `earnings.repo.ts:40-55`, `sales-roster.repo.ts:100-109`, `archive-objects.repo.ts:29-35` and `report-history.queries.ts:61-72`.

#### 6. Silent catches and error text

- `common/infra/errors/fallback.ts` adds `orFallback(promise, fallback, what)`, which logs one warning. It replaces the 7 silent `.catch(() => null)`, starting with `webhook.inbound.store.ts:120` and `storage.service.ts:108`.
- The 11 `messageOf` and 4 `errorText` copies (for example `common/jobs/ticker/ticker.ts:22`) switch to `errorMessage` and `errorTextOf`, which core already exports (`packages/core/src/async/errors.ts:4,9`). No new helper is needed.

#### 7. Crypto

`common/crypto/{safe-equal,hmac}/` replaces the 9 constant-time compares and the 3 HMAC-SHA256 checks.

#### 8. Ticker ×5

- `Ticker`/`TickerJob` (`common/jobs`) replaces the `setInterval` in the 5 `@BackgroundJob` files: `expenses.job.ts:33`, `report-pdf.job.ts:62-80`, `crm-media-copy.job.ts:53`, `calls.sweeper.ts:71` and `google-sync.job.ts:46`.
- `google-sync.job.ts:47-51` keeps its daily `setTimeout` reconcile, which `TickerTiming` cannot express.
- The per-copy timers stay. `roles.boot.test.ts:9-17` (`PER_COPY`) asserts that an api copy starts no Ticker. These timers refresh or flush that copy's own state: `translations.service.ts`, `numbers.config.ts`, `integration-config.service.ts` and `last-seen.service.ts`.
- `integration-config.service.ts:46` already listens on the shared bus, so its interval only gets a `// poll: <reason>` comment (rule 20).

#### 9. `createHttp`

`createHttp` (deadline + zod parse) gets a CRM profile used by `crm-http.ts:43,92` and `crm-media.fetch.ts:35,55`.
- The profile takes each call's existing deadline (`conn.timeoutMs` at `crm-http.ts:92`, `CRM_FETCH_TIMEOUT_MS` at `crm-media.fetch.ts:35`), so failure timing does not change.
- `webhook/external/kapso-history.ts` moves behind it. That prunes the api's only `ab/no-global-fetch` suppression entry.
- One `readCapped` (`common/infra/http/bytes.ts:22`) and one `FetchLike` remain.
- Stripe keeps its SDK (docs/36 §3.2). `stripe-clients.ts:16` sets no timeout today, so the SDK default applies. An explicit `timeout` changes failure timing, so it goes to E.

#### 10. Role predicates

- Named predicates in `common/auth/roles.ts` replace the 5 copies of `isAssistant = (user) => user.role === 'sales'` and the inline `user.role ===` checks, with the same logic.
- I do not swap in `can(user, permission)`.
  - Permissions are DB-backed (`PERMISSION_RESOLVER`, `permissions.ts:11-16`), so a swap would change who passes once a role's permissions are edited.
  - `can()`'s own comment keeps scope checks on role.
  - Each such swap is a per-route behaviour change, left for later.

#### 11. Search text

- `ilikeContains` plus one `orFilterTerm` in `common/db/or-filter/` replace the identical copies at `leads/http.ts:32`, `guardians/http.ts:40` and `users.links.repo.ts:12`.
- The weaker copy at `google-map.queries.ts:56` would change behaviour, so it moves in E.

#### Skipped

- `table.ts`. Only two repos would use it, and their `select('*')` methods differ by `Omit<…, 'status'>`. After `one`/`maybe`/`done`, each method is about 3 lines.
- `insertOnce` and `byIds`.
- Test builders (rule 18 has its own lane).
- A Stripe port (docs/36 keeps the SDK).
- A `settingsSlice` factory (43 classes, low risk).
- The payments totals RPC (`payments.service.ts:29`), which belongs to the docs/57 R9 lane.
- LiveKit event dedup (not verified).

### 4. Enforcement without baselines

There is no temporary gate that only checks the PR's diff, for three reasons:
- docs/59 §1 says «A rule's CI check turns on only when the code already passes it» and «There is no one-time baseline».
- A per-file count of base against head fails on the 595 renames in `nest/all-modules` and on every rule-1 file split.
- The repo's rename mapping (`tools/scripts/ci-checks/lint/baselines/renames.mjs`) exists for the old suppression files, not for new counters.

Each rule below enters lint for the whole repo, with no exceptions file, in the PR that brings it to zero.
- After #937, a rule is an Oxlint plugin rule in `packages/config/oxlint/ab-plugin.js`. Before #937, it is an ESLint `SYNTAX` entry plus its oxlint twin.
- The conditions are AST logic inside the rule, not `syntaxExempt`, `exempt` scopes or ignore globs, so `guard:loosened` stays silent.

| Rule | Matches | Turns on in |
|---|---|---|
| `ab/no-raw-db-error` | Inside the existing `DB_CLIENT` lint globs (the files allowed to hold a DB client): `throw dbError(`; `throw new Error(…)` whose argument reads `error.message`; the `'23505'` literal outside `common/db/errors/`. Storage, auth and fetch errors outside those globs do not match. | E |
| `ab/no-hand-paging` | `.range(` whose arguments read `pageSize`; `(x.page - 1)`; a `pageSize` key inside `z.object` outside `packages/core/src/schemas/page/`. `pdf-client.ts:23` (`page:`, a PDF page) and `drive-files.schema.ts:30` (`limit:`) do not match. | E |
| `ab/contracts-from-packages` | In `*.controller.ts`: any `z.` call, or a `ZodBody`/`ZodQuery`/`ZodParam`/`ZodParams`/`Returns` argument not imported from `@ab/*`. A call on an imported name, such as `id()`, passes. | C2 |
| `ab/returns-required` | A route handler without `@Returns`, unless it has `@HttpCode(204)`, `@Redirect`, `@Res()` without passthrough, or a `StreamableFile` return. A route-map test asserts the same over AppModule metadata. | C2 |
| `ab/no-select-star` | `.select('*')` in `apps/api/src` | C2 |

Existing rules cover the rest:
- `ab/zod-inputs` (414 api entries) reaches zero in C1 and C2, which prune its entries.
- `ab/no-untyped-api-calls` (551 client entries) becomes fixable once h3 lands. C1 and C2 prune it in the files they touch.
- `ab/no-global-fetch` already covers raw fetch in the api, and B prunes its one entry. No `raw-fetch` rule is needed.
- `await-in-loop` stays with the docs/57 R9 lane. B fixes the sites it lists but does not bring the count to zero.

The cost of turning rules on only at zero: between B and C2, feature PRs may add api-local schemas. C2 rebases, sweeps them up, and cannot merge until its rules pass.

### 5. Rollout

#### Prerequisites

docs/59 §4 sets the order comment sweep, unit move, format, autofix, class B, class C.
- The list below covers the first three steps.
- Autofix and the other class B lanes do not finish first. Instead they are frozen in the folders these PRs touch while each PR is open, and each PR body says so.

1. `nest/all-modules` merged (595 renames).
2. #937 merged after its rebase.
3. Before B, these must be merged:
   - the api unit folds still listed in `refactor/guards/units.json` (`common/auth`, `common/settings`, `config/env`);
   - the api comment sweep (`chore/comments-api-*`, none open).

   The conductor starts both as one-time routines on the day `nest/all-modules` merges. Format is already done (#932).
4. Before C1: the staff-web unit folds for the folders C1 and C2 edit (`features/finance`, `people`, `sales`, `messaging`, `teaching` in `units.json`).

#### Who builds and merges

- Each PR is built in a cloud session. Nothing runs on the owner's PC.
- The hourly conductor reviews every PR once (see «Decisions» at the top).
- The conductor holds back the `fix/lint-zero-api-*` class C lanes for `ab/zod-inputs` and the client `untyped-api-calls` lanes.
- It freezes the api comment, unit and autofix lanes while B, E, C1 or C2 is open.
- E and C1 never run at the same time. Whichever is ready first goes first.

#### The PRs

| PR | Branch · title | Starts after | Scope | Merge | Rough size |
|---|---|---|---|---|---|
| A | `feat/contracts-core` · `feat(core): page and id schemas, typed api client` | #937 | Core `page/`, `id()`, `clientRequestId`. The 8 package page copies as spreads with the same defaults and maxima. Client-core h3, `parseResponse`, `core/paging/`, and the `nextPageParam`/`flattenPages` move from staff-mobile. The `apps/api/src/route-map/contracts.snap.json` test. Golden payload tests for the 8 copies. The bundle size step. docs/36 and docs/57 §2.5. No staff-web files. | auto (conductor) | ~60 files |
| B | `refactor/api-db-layer` · `refactor(api): one db error path, batched reads, shared jobs and http helpers` | prerequisites 1–3 | Commit 1: an error-path test (status and body) for each repo file that lacks one, about 99 by filename (the PR recounts). Commit 2: `common/db/errors/`, test first. Commit 3: the codemod and its fixtures. Commit 4: codemod output only. Later commits: §3 items 4–11, minus the parts marked E. | by hand, after all checks complete; read commit by commit before the squash | ~330 files |
| E | `fix/api-paging-errors` · `fix(api): one paging path and error answers` | B and the owner's answer to question 1 | `common/db/page/`. The `SortSpec` key and list fallback. The §2 migration table. The past-end answer and `MAX_PAGE`. The 128 repo-side `new Error` sites, with the other 55 checked one by one. The `peopleErrors` callers moved to the default map. The envelope and `httpError`. The Stripe timeout. `.in()` chunks, the expenses cap and `google-map.queries.ts:56`. Turns on `ab/no-raw-db-error` and `ab/no-hand-paging`. | by hand, owner's go | ~90 files |
| C1 | `refactor/contracts-finance-schedule-people` · `refactor(contracts): finance, booking and people schemas in packages` | B, prerequisite 4 | Commit 1 switches handlers to decorators in place and regenerates the snapshot. Commit 2 moves the schemas and must leave the snapshot byte-identical. Then `@Returns`, the interceptor, `createdIdSchema`, column lists instead of `select('*')`, client-core `x.api`/`x.keys`/`x.query-options` and the app hooks. Prunes suppression entries. The PR body has a «site → failing test» table. | by hand (question 2) | ~200 files |
| C2 | `refactor/contracts-messaging-sales-teaching` · `refactor(contracts): messaging, sales, teaching, reporting and platform schemas` | C1 | The rest, then turns on `ab/contracts-from-packages`, `ab/returns-required` and `ab/no-select-star`. | by hand (question 2) | ~250 files |

That makes five PRs. E is separate because its changes alter what clients receive, so they need the owner's go. Inside an auto-merged refactor they would ship unreviewed. Kept apart, a revert is one PR.

#### How each PR shows its behaviour change, or that it has none

- **`routes.snap.txt`** stays byte-identical. No controller class or handler is renamed.
- **`contracts.snap.json`** (from A) holds `z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })` for each route's declared body, query, params and response. It only checks shape:
  - it drops `.refine` and `.superRefine`;
  - it shows only the inner schema of a `z.preprocess`;
  - it cannot see the 126 in-handler `parseOrThrow` sites until C's first commit declares them.
- **Golden payload tables** cover what the snapshot cannot.
  - Each moved or rewritten schema gets a table of good and bad payloads that pins the parsed output and the issue codes. The table runs red first against the old schema.
  - These schemas get one: `bookingRequestSchema`'s two `superRefine`s, `teacherOptionsQuerySchema`'s refine, leads' `q.transform(searchTerm)`, `blanksToNull`, `withPackageSize`, the chat-search cursor refine, and the 42 `z.preprocess` sites in 19 api files.
- **B's error-path tests** pin status and body before the codemod runs, including `phone_taken`, `has_students` and `duplicate_phone`.
- **Response checks and e2e.** Api vitest and e2e run with `API_CHECK_RESPONSES=1`. The full e2e suite runs, because `apps/api/src/common/**` matches no partial pattern in `select.mjs`.
- **No coverage claim.** No workflow, vitest threshold or Stryker config exists, and the rule 14 check lands in its own docs/57 §9 lane. Tests come first per site instead.
- **PR body and mobile.** Each PR body lists «behaviour → test» (rule 14). Mobile goes through «test mobile» and «bundle mobile» with `native-changes` «none», so the change ships by OTA.

### 6. Risks and mitigations

#### Old mobile builds

The staff APK 0.7.0 is the native baseline, and the family app is in Play production. JS ships by EAS Update, but an install that has not fetched the update keeps running old JS.

These shapes are frozen, and the contract snapshot and golden tests assert them:
- ledger and my payments (bare arrays);
- short links `{ rows, total }`;
- portal history `{ rows, next_cursor }` with a bare ISO cursor;
- thread sync with the `~` cursor;
- chat search `{ items, total, next_cursor }` with the `_` cursor;
- message search `{ items, next_cursor }`;
- the thread and channel `{ messages, has_more }` envelopes.

If an old build ever needs its own branch, the `X-AB-Client` header (`mobile/<build>`) can carry it, as the `UPLOAD_CAPABILITY_HEADER` precedent shows.

#### Intended wire changes

Everything not in this table stays byte-identical.

| Change | PR | Where | What an old build sees |
|---|---|---|---|
| Past the end: 200, empty page, real total | E | 24 offset reads | It got 400 `page_out_of_range` (common `dbError`) or 500 (guardians, students, leads, job applicants, threads). Now it gets an empty list instead of an error screen. Clients read neither code. |
| Unique tie-breaker appended | E | lists through `applySort` | The same rows. Ties come in a fixed order, so no row repeats or goes missing between pages. |
| `page` ≤ 10 000 | E | every page query | 400 `validation_failed`, only above 10 000. |
| `new Error(error.message)` sites use the default map | E | 128 repo-side sites | A 23505, 23503 or PGRST103 that answered 500 now answers 409 or 400. It is still an error. |
| 409 loses `detail`; `code` added beside `message` | E | default map; 33 `{ message: '<code>' }` bodies and Nest defaults | The only client `detail` readers found (`evolution-sync-api.ts:50`, `templates/api.ts:95`) read WhatsApp errors. E re-greps the newest release tag first. |
| Guardians and students errors use the default map | E | `peopleErrors` callers (6 files) | 500 bodies use the standard envelope. The 409 codes stay (`phone_taken`, `has_students`). |
| Stripe client gets an explicit timeout | E | `stripe-clients.ts:16` | A hung Stripe call fails sooner. Stripe runs in test mode only today. |
| `.in()` in chunks | E | 4 reads | A 414 or 500 at about 200 ids becomes a 200. |
| `ParseUUIDPipe` → `ZodParam('id', id())` | C1, C2 | at least 145 params | A bad id is still 400, but the body becomes the `validation_failed` envelope. When several inputs are bad, a different one may fail first (`zod-inputs.ts:75`). Each route gets a test. |
| Undeclared columns dropped | C1, C2 | routes that served `select('*')` | Only fields that no client type declares. C greps the newest release tag for each key before dropping it. |

#### Other risks

- **Client parse on enum growth.** A new status value would throw where a cast used to render. Question 3 sets the production policy.
- **The response check runs only where tests reach.** e2e covers the six journeys, and `ab/returns-required` makes every JSON route declare a schema. Production behaviour does not change.
- **Conflicts with other lanes.** The codemod is a committed script, so a rebase means running it again. The lanes listed in §5 stay frozen while B, E, C1 or C2 is open.
- **CI time.** A core change invalidates every Turbo cache. The api runs 4 shards of about 7 to 9.5 min, plus the full e2e. Five PRs keep the number of full runs low.
- **`count: 'exact'`** on `v_activity_log` and `v_threads` costs the same as today. Out of scope.

### 7. Open questions for the owner

1. **E's wire changes.** Do you approve the §6 rows marked E as one set? Default: yes. Past the end answers 200 with an empty page and the real total. That costs one count query on that rare path and lets clients clamp the page.
2. **How class C ships.** Class C covers `ab/zod-inputs`, untyped calls and at least 145 id params. Should it ship as two bundled PRs (C1 and C2), each with a «site → failing test» table, reviewed site by site and merged by hand? Or as one PR per domain (5 PRs), closer to docs/59 §3's «reviewed one by one»? Default: two bundled PRs, matching your «as few PRs as possible».
3. **Client mismatches in production.** When a client gets a response that does not match the schema in production, should it report once per path and build and render the body as today? Or throw `bad_response` (docs/36 z14)? Please also name the oldest build you still support. Default: report and render until the oldest supported build carries the schemas, then flip one line to throw. Suggested oldest builds: staff 0.7.0 and the current family production build.

Decided without a question: response checks are off in production. Tests and e2e check every response, so production pays nothing and its responses stay byte-identical.

### 8. Numbers

Counted on `origin/develop` `4eef53603`, non-test files.

These figures come from the draft's DRY audit and were not recounted:
- 73 `check` calls, 39 `'23505'` compares, 14 P0001 mappers;
- 33 `{ message: '<code>' }` bodies, 59 `domainError`, 116 `waHttpError`;
- 16 `clientRequestId`, 11 `messageOf`, 4 `errorText`;
- 9 constant-time compares, 3 HMAC checks;
- 29 inline returns, 17 inline page offsets, 7 silent catches;
- 17 controllers that pass `unknown` to a service;
- about 91 api test files that boot Nest;
- about 99 repo files without an error-path test.

#### Api-local request schemas to move

These counts are approximate.
- They cover top-level `const x = z.…`, `blanksToNull(…)` and `xSchema.extend/omit/pick/partial(…)` declarations in `apps/api/src/modules`.
- They exclude repos, mappers, `drivers/`, webhook files, google-sync, LiveKit, relay, `config/`, drive-backup, `*.payload*`, `*-client.ts` and `*.schema.ts`.

| Domain | Declarations | Files |
|---|---|---|
| messaging | 33 | 20 |
| teaching | 21 | 17 |
| people | 16 | 11 |
| finance | 11 | 7 |
| reporting | 8 | 5 |
| sales | 6 | 3 |
| platform | 3 | 2 |
| total | 98 | 65 |

The inline schemas inside 126 `parseOrThrow(` calls in 51 controllers come on top of these.

On the input side:
- 89 raw `@Body()` and 61 raw `@Query()`;
- at least 145 `ParseUUIDPipe` params (single-line matches) and 81 other plain `@Param` strings;
- 302 decorator uses already in place;
- 414 `ab/zod-inputs` entries.

On the response side:
- 589 route handlers in 169 controllers. Without the 54 `@HttpCode(204)` handlers and about 10 redirect, `@Res` and stream controllers, about 525 handlers get `@Returns`.
- 29 inline return types get named schemas.
- 81 `select('*')` calls in 35 files.

#### List reads by paging style

`.range(` appears on 72 lines, 2 of them comments.

| Style | Count | PR |
|---|---|---|
| Offset `.range` + count | 24 reads in 21 files | E → `readPage` |
| RPC or in-memory page | 3 (users, i18n keys, report history) | E → `pageWindow`/`toPage` |
| `readAll`/`readChunkedAll` callbacks and other bounded ranges | about 46 | unchanged |
| Hand keyset predicates | 4 | E → `afterCursor` |
| Keyset, unchanged | channel ×4, portal history, chat search, message search | none |
| Bare capped arrays | 2 (ledger, my payments) | frozen |
| `.limit` above `max_rows` | 1 (expenses) | E |
| `.in()` past `IN_CHUNK` | 4 | E → `readChunked` |

#### Duplicates removed

- **Page query schemas:** 10 → 1 (`common/http` `pageQuerySchema`, leads `pageQueryShape`, 8 package copies).
- **Hand paging:** `pageRange` ×2, `rangeOf`, `bounds`, about 17 inline `(page - 1) * pageSize`, and the hand-built page objects.
- **Client paging:** 2 paging re-implementations; 3 URL page parsers → 1.
- **Errors:** 2 `dbError`, 12 `check` helpers (73 calls), 653 `throw dbError(` lines, 128 repo-side `new Error(error.message)`, about 14 P0001 mappers, 39 `'23505'` compares.
- **Small helpers:** `clientRequestId` ×16; `isAssistant` ×5; `messageOf` ×11 and `errorText` ×4, moved onto the existing core helpers.
- **Crypto:** constant-time compares ×9, HMAC checks ×3.
- **Timers and loops:** `setInterval` ×5; hand read-all loops ×4; DB calls made in a loop ×4, plus 3 signed-URL loops.
- **Search text cleaning:** ×4.
- **Hand-written client types:** about 10.

#### Planned PRs

| PR | Files (rough) | Merge |
|---|---|---|
| A | ~60 | auto |
| B | ~330 | by hand |
| E | ~90 | by hand, owner's go |
| C1 | ~200 | by hand |
| C2 | ~250 | by hand |

# Part 2 · Enum value maps and schema-driven mappers

I read everything from origin/develop at 4eef53603 and ran nothing. The type claims below come from reading the zod 4.6.5 declarations (`node_modules/.pnpm/zod@4.6.5/.../v4/classic/schemas.d.ts`); I did not compile them. The Nest batch (`nest/all-modules`) will move paths again, so both inventories get rerun on its merge head before the first PR.

### 1. Enum value maps

#### Rule

In `apps/api/src` (tests aside), a `const` object literal whose values are all literals (string, number, boolean, null) carries no type. That means no `Record<…>`, `Partial<Record<…>>` or `Readonly<Record<…>>` annotation and no `satisfies Record<…>`. The one exception is a table whose key and value types are both plain `string` or `number`, such as mime types, HTML entities or extensions. Those tables are not enum objects.

A table between two package enums moves into a package. It goes to the package that already holds its twin or inverse, otherwise to the owner of the target enum. Tables with an api-local or a provider side stay in the api, untyped.

These stay as they are:
- Handler and strategy maps, whose values are functions, builders or schemas (rule 11). There are 40 today, including `BUILD`, `AUTO`, `ON_DECISION`, `MISS_TEXT`, `SAME` and `REPORT_OF`.
- Config and rule objects (`BUCKET_RULES`, `BUDGET`, `ROLE_KEYS`, `APPLICANT_TRANSITIONS`, ...).
- Error-code maps whose values are constants (`CREDENTIAL_CODE`, `UNSUPPORTED_CODE`, `REFUSED`, `NO_LIST`).
- Labels read from the bundle (`CITIES = ar.tz`, `TEMPLATE_NAMES`, `MEDIA_LABELS`). They are not object literals, and this addendum does not touch them.

#### Where the maps live, by kind

| Kind (count) | Form | Maps |
|---|---|---|
| package enum → package enum (7) | Untyped `as const` table in the package, plus an accessor with declared parameter and return types where the lookup composes another function | `OUTCOME`, `LIST` → `@ab/shared`; `ATTENDANCE` beside `ATTENDANCE_EVENT` in `packages/shared/src/reports/rules.ts`; `CORRECT_EVENT`, `CANCEL_EVENT` → `@ab/schedule`; `RECORD_WRITE` → `packages/catalog/src/permissions/roles/roles.ts`; `AS_READY` → `packages/shared/src/schemas/readiness.ts` |
| identity or narrowing (6) | No table. `ROW_OF` is deleted and `kind` is passed straight through, because `AnyPushKind` is assignable to `NotificationKey`. Each of the others becomes a tuple of the members it lets through, read with `.find((x) => x === v)`. That is the existing `roleOf` pattern (`teaching/student-channels/views/message-view.ts:12`). | `ROW_OF` (`common/push/dispatch/push.rules.ts`), `KIND_OF` (`student-recordings/lesson-files/lesson-files.mapper.ts`), `CHAT_ROLES`, `SHOWN` (`people/portal/lessons/portal-lesson-family.ts`; the one in `wa-submit.ts` is a handler map), `REQUESTERS`, `LINK_KIND` |
| api-local enums (4) | Drop the annotation and keep the table beside its enum | `COUNTER`, `OTHER` (`relane.repo.ts`; the rule has no repo exemption), `NAMED`, `NEXT` |
| provider or DB string → our enum (8) | Drop the annotation and keep the table in its adapter (rule 18). Look values up with `own(table, key)`, moved from `webhook/parse/webhook.evolution.ts:54` to `apps/api/src/common/infra/own-value.ts`. Prototype keys never match, and today's fallbacks stay written out: `?? 'pending'` in `ourStatus`, `?? guestRole(row)` in `room-state.mapper.ts`. | `META_STATUS`, `HEADERS`, `BUTTONS`, `TICK`, `STAFF_ROLE`, `RECORDED`, `PROVIDER_KEYS`, `SEEDED_KEYS` |
| our enum → provider value (2) | Drop the annotation and keep the table in its adapter | `INTEGRATION`, `MEDIA_TYPE` |

For the two lesson-event tables, one reverse of `LESSON_EVENT_TARGET` goes beside it in `packages/schedule/src/lessons/state-machine/state-machine.ts`. The table has 8 entries, and `scheduled` has no event.

```ts
/** The event that leads to each status: LESSON_EVENT_TARGET read backwards. */
export const STATUS_EVENT = {
  confirmed: 'confirm', completed: 'complete', late: 'mark_late', excused: 'excuse',
  no_show: 'mark_no_show', cancelled_by_teacher: 'cancel_by_teacher',
  cancelled_by_admin: 'cancel_by_admin', rescheduled: 'reschedule',
} as const;
// api: STATUS_EVENT[to] replaces CORRECT_EVENT[to];
//      STATUS_EVENT[CANCEL_STATUS[by]] replaces CANCEL_EVENT[by]
//      (CANCEL_STATUS drops its Record<CancelBy, LessonStatus> type for this)
```

`BUILD` (functions) and `AUTO` (`{ event, reason }`) do not change. One test checks that `Object.fromEntries(LESSON_EVENTS.map((e) => [LESSON_EVENT_TARGET[e], e]))` equals `STATUS_EVENT`. Today nothing proves that `CORRECT_EVENT` agrees with the state machine.

#### How the types are inferred

There is no zod wrapper here. An internal enum value is already typed, so a `.parse` would only recheck what the compiler proved, and it would cost one parse per row. Here is what catches each mistake:
- **Missing key.** Indexing the untyped table with the full source union fails to compile if a member has no entry (TS7053 under `strict`). A member that maps to nothing gets an explicit `null`. Today's `Partial<Record<AttendanceKind, PortalOutcome>>` accepts a forgotten member silently.
- **Wrong value.** The table's value type is its literal union, so the accessor's declared return type, or the consumer's own type, rejects a typo.
- **String keys.** `own()` takes `Readonly<Record<string, T>>`, so an untyped table fits and `T` is inferred from it.

I dropped `.transform().pipe(to)`. Its `pipe<T extends $ZodType<any, output<this>>>` requires the target's input to fit the map's output. Partial maps such as `STAFF_ROLE` (2 of 5 roles) and `META_STATUS` (5 of 7 statuses) would therefore fail to compile, and a stray extra value would still pass.

#### Portal-history sketch

```ts
// packages/shared/src/people/students/portal-outcome.ts
import type { Attendance, LessonStatus } from '@ab/catalog';
import { attendanceKind } from '../../sales/student/student-details.js';
import type { PortalHistoryStatus, PortalOutcome } from './portal-family.js';

const OUTCOME_OF_KIND = {
  present: 'attended', absent: 'absent', excused: 'excused', cancelled: null, unmarked: null,
} as const;
const LIST_OF_OUTCOME = { attended: 'attended', absent: 'absent', excused: 'absent' } as const;

/** Staff's attendance kind as the family sees it; cancelled, unmarked and moved lessons are in no list. */
export function portalOutcome(status: LessonStatus, attendance: Attendance | null): PortalOutcome | null {
  const kind = attendanceKind(status, attendance);
  return kind === null ? null : OUTCOME_OF_KIND[kind];
}

/** The list an outcome shows in: an excused absence is still «غاب عنها». */
export function portalListOf(outcome: PortalOutcome): PortalHistoryStatus {
  return LIST_OF_OUTCOME[outcome];
}
```

In `portal-history.mapper.ts`, `OUTCOME` and `LIST` go away:

```ts
export function outcomeOf(row: PortalPastRow): PortalOutcome | null {
  return portalOutcome(row.status, row.own[0]?.attendance ?? null);
}
// pickFor:     outcome !== null && portalListOf(outcome) === status
// monthCounts: counts[portalListOf(outcome)] += 1
```

`HISTORY_LIST_OF` in `packages/client-core/src/people/portal/history.ts:12` is the same table as `LIST`. It is deleted, and `historyRows` filters on `portalListOf(row.outcome) === list`.

### 2. Schema-driven mapping

The owner's second ask gets a partial yes. Across the 101 `to*` functions, a regex count finds about 400 fields copied under the same name, 31 renamed and 340 derived (§7). The helper removes the copied lines. Every view with a derived field still needs its function. In `toHistoryRow` only 3 of 8 keys are plain copies.

#### Helper

```ts
// apps/api/src/common/http/as-response.ts
import { InternalServerErrorException, Logger } from '@nestjs/common';
import type { z } from 'zod';

const log = new Logger('Response');

/**
 * The contract is the whitelist: z.object drops keys it does not name, at every depth. A value that
 * does not fit is a 500 that logs the failing paths, never the values (names, phones, money).
 */
export function asResponse<S extends z.ZodType>(schema: S, value: z.input<S>): z.output<S> {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  log.error(`response_invalid at ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  throw new InternalServerErrorException({ code: 'response_invalid', message: 'response_invalid' });
}
```

It follows `parseStoredJson` in `apps/api/src/common/db/stored-json.ts`. It logs the paths itself, because Nest's base filter answers an `HttpException` without logging it.

#### How it uses the schema

- The caller passes `{ ...row, renamed, derived }`, and zod drops every key the schema does not name. Nested objects are stripped by their nested schemas.
- `S` is inferred from `schema` alone. With `value: z.input<S>`, a forgotten rename leaves a required key missing, and a misspelt explicit key fails the excess-property check. Keys that come from the spread are not checked, and that is intended.
- A rename is an explicit key (`lesson_id: lesson.id`). When a read serves a single response, a PostgREST alias in the select (`lesson_id:id`) removes the rename.
- Response schemas use only primitives without transforms or refines: plain `z.string()`, `instant`, `localDate` or `timeOfDay` from `@ab/core/schemas`. They never use `phoneE164` (a transform), `timeZone` (builds an `Intl.DateTimeFormat` per value) or `requiredText`/`optionalText` (trim and `min(1)`). Those would reject the mappers' own `''` fallbacks, such as `tz: s.student?.tz ?? ''` in `lessons.mapper.ts`.

#### Where it runs, and where it does not

The helper is called once per row, in a response mapper, and only when every importer of that mapper leads to a read route. The PR lists the importer chain up to the controller. This scope is what makes one 500 policy safe. These mappers stay plain functions:

| Mapper | Why it stays plain |
|---|---|
| `toMessageView`, `toThreadView` (messaging) and their decorators | `/threads/sync` rows are loose on purpose (`threadSyncSchema` uses `z.looseObject`, «rows keep their full view»). The phone retries a failed page every 30 s. `Outbox.write` and `replayOf` build the view after the send. |
| `toTemplateView` | `TemplateRegistry.approved()` (`template.registry.ts:46`) runs inside the sender worker through `reopen-request.ts:50` and `WindowHold` |
| `toPaymentView` (payments) | `PaymentsService.create` runs from the Stripe webhook (`link-fulfilment.ts:49`, `link-refunds.ts:83`) and returns `this.get(row.id)` after the insert |
| `toPaymentView` (teacher earnings) | Built after writes (`earnings.service.ts:69, 80, 94`) |
| Write mappers: `toGuardianInsert`/`Patch`, `toStudentInsert`/`Patch`, `toEntry` | Their DTO is already parsed, and PostgREST rejects unknown columns |
| Non-views: `toCsv`, `toGoogleError`, `toVoiceOgg`, `toInbound`, `toMetaTemplate`, `toModel`, `toFamilyModel`, `toBalance` | They feed parsers, PDFs, provider bodies or jobs, not HTTP responses |

A decorator (`{ ...toUserView(r), avatar_url }`) passes its extra value into the mapper instead, so each row is still parsed once. A composite that only assembles parsed parts, such as `{ ...page, items, totals }` in `payments.service.ts:30`, needs no second parse. A composite that copies fields inline, like the `student` part of `toStudentDetails`, ends in `asResponse` itself.

#### Error behaviour

A row that fails returns a 500 for the request, and the log holds the failing paths. The row is never dropped. A dropped row makes a lesson vanish from a family's history with nothing to show it. A fail-open fallback is not possible either: the input is a spread, so returning it unparsed would ship columns such as `cancel_reason`. Because the sync, worker, webhook and post-commit paths are out of scope (table above), the 500 can only reach read routes.

For the portal, nothing new breaks. `packages/client-core/src/people/portal/portal-api.ts` already parses with the same schemas, so a bad row fails there today, only later and with less information.

#### Performance

The cost is one parse per row and no more. Portal history parses at most 20 rows a page (`PORTAL_HISTORY_PAGE`), and `monthCounts` parses nothing. The repo has no benchmarks, and its only `*.builder.ts` is `tools/scripts/automerge/testing/facts.builder.ts`, so a CI bench would mean new infrastructure. Instead, a PR that converts a mapper returning more than about 1000 rows per request posts one timing from a cloud session: 5000 synthetic rows through the schema. That applies to `toLessonView` over the calendar's `readAll` window and `toExpenseView` (up to 5000 rows), if they qualify. If a timing is too slow, the schema gets lighter. The list is never capped, because capping the calendar would hide lessons. There is no skip flag, since by the scope rule no job or worker reaches the helper. I have not measured zod 4 speed here.

#### Portal history rewritten

```ts
// portal-history.mapper.ts (tail); PastLesson moves to portal-history.types.ts (rule 15)
const NO_TEACHER = { display_name_ar: '', display_name_en: null };

/** portalHistoryRowSchema is the whitelist: cancel_reason, rule, own and status are dropped. */
export function toHistoryRow(lesson: PastLesson, refs: HistoryRefs): PortalHistoryRow {
  const reportId = refs.reports.get(lesson.id) ?? null;
  return asResponse(portalHistoryRowSchema, {
    ...lesson,
    lesson_id: lesson.id,
    teacher: lesson.teacher ?? NO_TEACHER,
    absence_reason: familyReason(lesson),
    report_id: reportId,
    recording_id: reportId === null ? null : (refs.recordings.get(lesson.id) ?? null),
  });
}
```

`teacherOf` is deleted. `starts_at`, `ends_at` and `outcome` now come from the spread. `familyReason` still gets the whole lesson, because it reads `status`, `cancel_reason`, `starts_at` and `rule`.

Both mapper tests stay as they are. The exact `toEqual`, the `not.toContain('cancel_reason')` check and the empty teacher both still pass, because `portalTeacherSchema` takes `display_name_ar: z.string()`, which accepts `''`.

### 3. Codec, accessor, helper or plain function

| Use | When |
|---|---|
| Untyped `as const` table (plus an accessor when it composes) | Every enum-to-enum map. All 27 in §7 fall here. |
| `z.codec` | One wire value that a client and the api both decode and encode with the same schema. None of the 27 maps qualifies, so `z.codec` stays unused. `ATTENDANCE` and `ATTENDANCE_EVENT` go both ways, but both directions run in the api. Two untyped tables and one inverse test are shorter than a codec plus two new named schemas. |
| `asResponse` | Response mappers whose importers are all read routes |
| Plain function ending in `asResponse` | Views that are mostly derived: `toMyCommission`, `toSalesTeacher`, `toMeetingView`, `toPortalLesson`. The derivation stays and the copies go. |
| Plain function without the helper | The excluded mappers in §2 |
| Handler map | Rule 11 strategies. Untouched. |

### 4. Enforcement and migration

#### Rule A: `ab/no-typed-value-table` (main lint, at zero)

The rule is syntactic, so it runs in ESLint and in the Oxlint `ab` plugin through `boundariesPlugin.rules` (`packages/config/oxlint/ab-plugin.js`). Its scope is `apps/api/src`, tests aside. It reports a `const` that meets all three conditions:
- the initializer, with `as const` or `satisfies`, is an object literal;
- every value is a string, number or boolean literal, or `null`;
- it is typed with `Record<K, V>` (bare or inside `Partial`/`Readonly`, as an annotation or with `satisfies`), where K or V is something other than `string`, `number` or `boolean`.

At 4eef53603 it reports 42 tables in 38 files: 39 annotations and 3 `satisfies` (`TEXT_COLUMN` in `reports/report.mapper.ts:79`, and `LINK_TABLE` in `subjects.repo.ts:22` and `users.links.repo.ts:14`). It does not touch `EXT`, `ENTITIES`, `MIME_BY_EXT`, `MIME_BY_TYPE`, `OPTIONAL`, `SEEDED_KEYS` or the `Record<string, number>` `STATUS`. PR 2 fixes all 42 and turns the rule on at zero. Client apps are out of scope, because their route and icon tables are the lookups rule 11 asks for.

The placement half (package-to-package maps live in a package) cannot be checked syntactically. A new line in CLAUDE.md rule 12 carries it, so routines write new code that way.

#### Guard B: `ab/response-via-schema` (`pnpm guard:mappers`, diff-scoped, permanent)

The guard looks at exported functions named `to[A-Z]…` in `apps/api/src/**/*.mapper.ts`, outside tests, whose declared return type is imported from `@ab/shared`, `@ab/money`, `@ab/schedule`, `@ab/settings` or `@ab/catalog` (bare, in `Promise<…>`, or as an array). It fails when the returned expression is an object literal that holds a spread, or three or more `k: x.k` copies at any depth, and is not `asResponse(…)`.

It reports only functions whose declaration line was added in `git diff -U0` against the base. It reuses `baseCommit` and `changes` from `tools/scripts/ci-checks/comment-only/git.mjs`. Only the returned expression is read, so intermediates such as `{ ...l, teacher_id }` inside `toOverview` pass. Write mappers return `@ab/db` types and are skipped.

The convention the guard keys on is this: a reader that must never throw (worker, webhook, sync, after a commit) is not named `to*` and does not live in a `*.mapper.ts`. The guard checks new code only, so it needs no baseline and no end date. There is no code review, and conversions land across several schema PRs, so the guard is what holds the line in the meantime. There is no `.loose()` gate: `packages/shared/src` uses `z.looseObject` 18 times for provider payloads.

#### PRs

Both PRs run as cloud routines in the fast lane, after `nest/all-modules` merges.

| # | Title | Content |
|---|---|---|
| 1 | `refactor(portal): history maps in shared, rows through their schema` | `portal-outcome.ts` with its test, the client-core dedupe, `asResponse` with its test, `toHistoryRow`, and `PastLesson` in `portal-history.types.ts` |
| 2 | `refactor(api): untyped enum tables and package maps` | The 42 tables; the moves to schedule, shared and catalog; the identity deletions; `own-value.ts`; rule A on at zero; guard B; the CLAUDE.md line |

Mapper conversions open no PRs of their own. Each one rides in the parallel plan's schema PR for its domain, because only those PRs create the schemas. For each converted mapper, the PR body gives:
- the importer chain;
- for spread mappers, the schema keys compared with the select's columns;
- the result of grepping the clients for widened types;
- the staging counts, if question 1 gets a yes.

#### Proof that no response changed

- No existing mapper-test expectation is edited.
- Before conversion, a mapper without an exact-literal test gets one, built from a complete row. The row comes from the generated `Tables<…>` type plus the embed shapes, through existing sample helpers such as `pastRow`. A `Partial<…> as Row` cast like the one at `students.mapper.test.ts:62` is not allowed, because it hides the columns a spread would carry.
- One null-edge test per converted mapper sets every column the generated type allows to be null to `null`. The hand-written `overrideTypes` interfaces are not the source.
- `apps/api/src/route-map/routes.snap.txt` stays unchanged. That proves routes, guards and status codes, not bodies.
- The six e2e journeys pass in CI.
- Map tests send every member through each moved table and check the two inverses (the `ATTENDANCE` pair and `STATUS_EVENT`).

### 5. Risks

- **New 500s from data that never matched.** The read-only scope limits where they can occur. The null-edge fixture comes from the generated types. If question 1 gets a yes, staging counts come before each merge. `.catch` is used only where a business fallback exists.
- **Nullable drift.** An `overrideTypes` interface can call a column non-null when the database or a left join allows null. The generated-type fixture and the counts catch that. Interfaces built by hand cannot.
- **Silent strips.** A spread over a `*` select strips keys that clients read without parsing. `toProfile` spreads `PROFILE_COLUMNS = '*, …'` (`students.repo.ts:29`). staff-web widens `StudentProfile` with `teacher_gender_pref` in `features/teaching/booking/booking-entries.tsx:17` and `booking/trial-date/TrialDatesSection.tsx:13`. That field is added to the contract before `toProfile` converts.
- **Leaks.** A key that the schema names but a given viewer must not see still passes, so `notesIf` (`people-edit.mapper.ts:9`) stays in front of the parse. `Json` and `unknown` fields are not whitelisted inside.
- **Lenient client schemas.** `.optional()` and `.default()` fields (`lessons_used`, `amount_due`) would not notice a server that forgot them. The exact-literal tests do.
- **jscpd.** An interface and its schema side by side count as duplicates. The schema PR deletes the interface.
- **Performance.** One parse per row, a measured timing for any list over 1000 rows, and no list is ever truncated.

### 6. Questions for the owner

1. Before a domain's conversions merge, may a `workflow_dispatch` job in Actions run read-only SQL counts on staging, which holds the real imported data? It would count, per column the new schema requires, the null rows and the values outside the enum, and post numbers only. Recommended default: yes on staging with a read-only key you add; prod only with your go, and never from the PC or a routine.
2. The mappers in the §2 exclusion table (payments, earnings, outbox, templates, sync) stay hand-written. Should they convert later by splitting off a post-commit reader that never throws? Recommended default: not now. Convert them only after the read routes have logged no `response_invalid` for 30 days.

### 7. Numbers

All counts are from 4eef53603, non-test files.

**Typed `Record<…>` consts in `apps/api/src`.** The pattern finds 121; 16 are test support (`test-app`, `test-util`, fakes), which leaves 105:

| Category | Count | Changes |
|---|---|---|
| Handler and strategy maps | 40 | no |
| Config and rule objects | 11 | no |
| Error codes and HTTP status | 11 | 5 lose their type (`BY_STATUS`, `ERROR_CODE`, `MISSING`, `HTTP`, `BANDS`) |
| Labels from `ar.json` | 3 | no |
| Non-enum string tables | 6 | `LANE_ROWS` loses its type |
| Number or boolean per enum | 7 | lose their type |
| Enum value maps | 27 | 7 move to packages, 6 deleted, 4 api-local, 8 provider to ours, 2 ours to provider |

Rule A hits 42 tables in 38 files (39 annotations and 3 `satisfies`). Untyped tables that matter here: livekit `KIND`, `KIND_STATUSES`, client-core `HISTORY_LIST_OF` (deleted) and shared `ATTENDANCE_EVENT` (loses its type).

**Mappers.** There are 101 exported `to*` functions in 73 files; 54 of those files are among the 71 `*.mapper.ts`. A regex count is approximate, so these figures are too. It finds 791 fields in 88 functions; the other 13 have no countable fields (composites, array builders, parser misses).

| Field kind | Count | Share |
|---|---|---|
| Same-name copies `k: x.k` | 377 | 48% |
| Shorthand `k` | 23 | 3% |
| Renamed | 31 | 4% |
| Derived (includes `?? null`, `Number()`, nested objects) | 340 | 43% |
| Spreads | 20 | 2.5% |

By function: 18 are at least 75% copied, 32 are 40 to 75%, and 38 are under 40%.

| Domain | `to*` | Files | ≥ 75% copied | Copied fields |
|---|---|---|---|---|
| finance | 20 | 16 | 5 | 117 / 202 |
| sales | 22 | 17 | 5 | 71 / 148 |
| teaching | 18 | 11 | 3 | 47 / 128 |
| messaging | 10 | 9 | 2 | 82 / 134 (mostly excluded) |
| people | 16 | 9 | 2 | 37 / 79 |
| reporting | 6 | 5 | 0 | 25 / 50 |
| platform | 5 | 3 | 0 | 7 / 19 |
| common | 4 | 3 | 1 | 14 / 31 |

**Files to change.**
- PR 1: 9 code files, 3 of them new (`portal-outcome.ts`, `as-response.ts`, `portal-history.types.ts`), plus 3 test files.
- PR 2, about 56 files:
  - the 38 table files;
  - 4 package files (`reports/rules.ts`, `state-machine.ts`, `roles.ts`, `schemas/readiness.ts`);
  - `own-value.ts`;
  - 3 importers outside the 38 (`outcome-correction.ts`, `lesson-cancel.service.ts`, `teaching/lessons/index.ts`);
  - about 10 tooling files (two rules and their tests, plugin registration, the gate and its test, `package.json`, `ci.yml`, CLAUDE.md).
- Mapper conversions: up to the 54 mapper files that hold a `to*`. Only the read-only ones convert, inside their domain's schema PR.
