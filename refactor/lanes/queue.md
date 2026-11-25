# Refactor lane queue

Read by the hourly cloud builder. Take lanes top to bottom. No lane adds a rule or a guard with a baseline (docs/59): it fixes every existing site first, in numbered PRs when there are many, and the rule turns on at zero in the last one. Such a lane lists its branches in order; each one is taken and ready on its own, and the next needs the one before it merged. A lane is **taken** when its branch exists on origin (open, merged or closed PR). A lane is **ready** when every branch in «Needs» has a merged PR into develop. Briefs come from the 2026-11-22 refactor plan (docs/57, docs/58); paths in them may have moved since: `git grep` the symbol.

## L12: Keep receipt files on delete and replace

- Branch: `fix/keep-receipt-files`
- Needs: nothing
- Audit items: BE-04

Goal (audit BE-04 step 1):
- Deleting a payment hard-deletes the row, then removes the receipt and attachment files: apps/api/src/modules/finance/payments/payments.service.ts:92-95 calls receipts.service.ts:51-52 and payment-attachments.service.ts:94-95 (storage.remove).
- Replacing a receipt deletes the old file (payments.service.ts:85-86).
- Expenses do the same (expenses.service.ts:41, expense-receipts.ts:33-34).
- The audit row keeps the `before` row, but the file is gone, and the weekly Drive backup may be off.

Behaviour:
- Stop removing files on payment delete, on expense delete and on receipt replace.
- Keep the row delete and its audit row as today: the owner sanctioned this flow.
- Remove the discard code that is now unused (knip).
- Add no retention job; add one when the owner asks.
- Void instead of delete is an owner question, not part of this PR.

Tests first:
- A delete leaves the files (the fake storage remove is not called).
- A receipt replace keeps the old object, and its path is in the audit `before` row.

Req: R-PAY-01, R-NFR-03.

## L16: Durable teacher report drafts on staff-mobile

- Branch: `fix/report-drafts`
- Needs: nothing
- Audit items: MOB-4

Goal (audit MOB-4): a teacher's تقرير الحلقة autosaves 800 ms after typing (packages/shared/src/reports/form-values.ts:47), but:
- A failed PUT is never retried: shouldSave is false when settled === failed (:102-104), and apps/staff-mobile/src/teacher/report/hooks/use-autosave.ts:45-48 only stores 'failed'.
- The values live only in useState (v2/hooks/use-v2-entry.ts:38-40, hooks/use-report-entry.ts:31).
So closing or killing the app before a save or a send loses the text.

Behaviour:
- Keep the unsent body per report id under one AsyncStorage key. Wrap every read and write in try/catch.
- Retry it when onlineManager goes online and when AppState becomes active.
- Restore it into the form when the card opens.
- Clear it on a successful save or send.
- Put effects only inside named hooks.

staff-web's use-autosave.ts gets this behaviour later, through the shared hook in lane L37, not here.

Tests first (jest-expo):
- A failed save followed by a reconnect gives exactly one PUT with the same body.
- After an app restart, the typed values are shown.
- A successful send clears the key.

Req: R-REP-01, R-REP-02, R-REP-03, R-REP-04.

## L09: staff-web query and router defaults

- Branch: `fix/web-query-defaults`
- Needs: nothing
- Audit items: WEB-5

Goal (audit WEB-5; docs/57 §10.4 quick win #1): apps/staff-web/src/boot.tsx:10 uses `new QueryClient()`, which means staleTime 0 and TanStack's default of 3 retries on any error, 401/403/404 included.
- Every mount and every return to the tab re-reads every query on screen, for example the WeekSchedule overview (schedule/api.ts:16-28).
- Errors show only after about 7 s.

Behaviour:
(1) Default staleTime 30_000. Inbox and calls keep their own settings.
(2) A MutationCache onSuccess calls queryClient.invalidateQueries({ refetchType: 'none' }). Every successful write marks all cached reads stale: a screen opened after a write refetches, and open screens are not refetched.
(3) retry = shouldRetry, moved from packages/mobile-kit/src/lib/query/query-client.ts:19-23 into packages/client-core; mobile-kit imports it from there. No retry on 4xx.
(4) Router: defaultPreload 'intent' and defaultPreloadStaleTime 0.
(5) The admin booking's ReviewStep.tsx:50 also invalidates the students and money roots.

Route loaders are not part of this PR.

Tests first:
- a unit test of the defaults
- the MutationCache guard marks a cached query stale without refetching it
- a 404 is not retried; a 500 is
- a send in the open chat triggers no full read of the open thread (lane L03 changed that invalidation; keep it)

Req: R-NFR-08.

## L10: Migration-check rules

- Branch: `ci/migration-check-rules`
- Needs: nothing
- Audit items: OPS-6+SPT-14

Load supabase-postgres-best-practices first.

Goal (audits OPS-6 step 2 and SPT-14):
- tools/scripts/ci-checks/migration-check.mjs:16-30 (lintSql) checks only parentheses, quotes, the final semicolon and file names, while migrations go straight to production.
- 35 of the 102 DDL migrations since 20261010000290 lack `set local lock_timeout`, for example 20261111000200_lesson_teacher_confirm.sql, 20261030000993_chat_edit_delete.sql and 20261117100140_profile_locale_unset.sql.

Add four rules, for added files only. checkAll already lints only added files, so no baseline is needed.
(a) create table needs enable row level security for that table.
(b) security definer needs `set search_path` and `revoke execute … from public, anon`.
(c) DDL on an existing table (alter table, create [unique] index, drop or add constraint, drop) needs `set local lock_timeout`.
(d) drop or rename needs a `-- destructive: <reason>` marker.

stripSql already removes comments, so check the marker on the raw text.

Tests first, in the migration-check test: one passing and one failing fixture per rule.

Req: R-NFR-02, R-NFR-05.

## L19: Catalogue-wide RLS and grants e2e spec

- Branch: `ci/rls-catalogue-spec`
- Needs: nothing
- Audit items: OPS-8

Load supabase-postgres-best-practices first.

Goal (audit OPS-8): per-role RLS specs exist (60 use as() from e2e/support/core/rls.ts), but only 6 read the catalogue, each for one table. A new table without RLS, or an anon-callable SECURITY DEFINER function, would go unnoticed. Clients hold the anon key and a user JWT; RLS is on 102 tables (docs/58 §4).

Add one e2e catalogue spec, run in the CI e2e job. It checks that:
- every table in public has relrowsecurity on
- anon has SELECT only on an allow-list (translation_overrides and the others found today, each with a reason)
- no SECURITY DEFINER function in public is executable by anon or authenticated, outside a helper allow-list

Build the allow-lists from what the CI DB has today, and list them in the PR so the owner can shrink them.

Test-first: prove the spec catches a violation. Inside the spec's transaction, create a temp table with RLS off and assert that the check flags it.

Req: R-NFR-02.

## L11: Teacher clash lock in booking and lesson-move RPCs

- Branch: `fix/teacher-clash-lock`
- Needs: nothing
- Audit items: BE-03

Load supabase-postgres-best-practices first.

Goal (audit BE-03):
- Booking and lesson moves check for clashes with a read (ConflictChecker, planner.prepare; booking.service.ts:34-35, lessons/time-edit/time-edit.service.ts), then write in an RPC that never checks again.
- create_booking locks only per package (migrations/20261106000501_course_one_per_package.sql:47).
- edit_lesson_time (latest: 20261117100160) and apply_lesson_changes (20261018000475_v3) take no lock.
- No index or constraint involves teacher_id.

Behaviour: a new migration (fresh timestamp, `set local lock_timeout`) replaces the three functions. Each one:
- takes pg_advisory_xact_lock(hashtextextended('teacher:'||teacher_id, 0)) for each teacher it touches, in sorted order to avoid deadlocks
- re-selects that teacher's open lessons that overlap each new interval
- raises P0001 teacher_clash unless the new lesson carries override_reason

The API maps teacher_clash to a 409 with an Arabic message key. Add no exclusion constraint: it would block audited overrides. Keep every other line of the latest function bodies byte-identical.

Tests first:
- *.sql.spec.ts in the CI DB job: two concurrent create_booking calls for one teacher slot give one success and one teacher_clash.
- A booking with override_reason still succeeds.
- An api unit test of the 409 mapping.

Req: R-SCH-04, R-SCH-07, R-SCH-11.

## L23: zod for jsonb reads (payout breakdown first)

- Branch: `fix/zod-jsonb-reads`
- Needs: nothing
- Audit items: BE-10

Goal (audit BE-10 step 1): three jsonb columns are cast, not parsed:
- finance/payouts/payouts.mapper.ts:7-9 (an isRecord guard plus `as unknown as T[]`). The payout breakdown's lesson ids drive the ledger.
- finance/subscriptions/subscriptions.mapper.ts:46 (price_source as unknown as QuoteResponse).
- messaging/whatsapp/templates/catalog/templates.repo.ts:136.

Behaviour:
- One zod schema per shape, in packages: money for the breakdown and the quote, shared for the template catalog. Types come from z.infer.
- The mapper parses. A bad row raises a typed error that the controller maps to a clear 500 code, instead of passing silent data on.
- Payout breakdown first.
- Prune the ab/zod-inputs or no-unsafe suppressions the change clears.
- The controller codemod to @ZodBody/@ZodQuery/@ZodParam is not part of this PR.

Tests first:
- A malformed breakdown row is refused.
- A valid row maps as today (same fixture as the existing mapper test).

Req: R-PAY-02, R-SUB-01, R-MSG-01.

## L08: Server-side DB timeout, outcome-unknown answer, required clientRequestId

- Branch: `fix/db-timeout-outcome`
- Needs: nothing
- Audit items: BE-15

Needs PR #783 merged. It adds common/db/db-timeout.ts, db-timeout.filter.ts and common/infra/http/db-fetch.ts: a 15 s client deadline, answered with 503 and Retry-After 5 on every route.

Load supabase-postgres-best-practices first.

Goal (audits BE-15, OPS-6 step 3, BE-10 step 2): a timed-out write may still commit after staff were told to retry.

Work:
(1) In the CI DB job, print pg_roles.rolconfig for authenticator, service_role and postgres, and the postgres default. Write the values in the PR body.
(2) A migration (fresh timestamp, `set local lock_timeout`) sets statement_timeout a little above DB_TIMEOUT_MS (for example 20 s) for the role PostgREST runs the API's calls as. Set it only if none, or a higher one, is set. Any long RPC gets its own `set statement_timeout` in its function definition.
(3) The filter answers write routes (non-GET) with a distinct code, db_outcome_unknown, so clients resend with the same clientRequestId. Reads keep db_timeout.
(4) Make clientRequestId required in packages/money/src/ledger/schemas.ts:61 and :106 and in ledger/earnings/earnings-schemas.ts:21.
- First, use git log to find when these started sending it: staff-web use-record-payment.ts, staff-mobile use-record-payment.ts, client-core request-id.ts, use-pay-teacher.ts and CreateSubscriptionDialog.tsx.
- State in the PR whether any phone build still in use (APK 0.7.0, from 11-15) could lack it. If so, keep it optional for that endpoint and say why.
- The schedule schemas (scheduling.ts:45, course-change.ts:23) stay optional.

Tests first:
- *.sql.spec.ts in the CI DB job: an RPC that sleeps past the server timeout is cancelled.
- A POST /payments replayed after a timeout writes one row.
- A POST without clientRequestId gets a 400.

Req: R-PAY-01, R-PAY-02, R-NFR-08.

## L07: Graceful worker shutdown for the sender

- Branch: `fix/sender-graceful-stop`
- Needs: `fix/wa-lane-hold`
- Audit items: BE-14

Needs:
- PR #783 merged (it changes common/jobs/ticker.ts)
- lane L01 merged (same sender files)

Goal (audit BE-14):
- On SIGTERM, Ticker.stop() (apps/api/src/common/jobs/ticker.ts:46-49) only clears its timers, and no job implements beforeApplicationShutdown (0 hits).
- The process can exit while a send sits between the claim ('sending') and 'sent'. The next pass fails that row as UNRECORDED, which is 'uncertain' (sender/message.worker.ts:60; message.job.ts:45-56).
- Deploys happen several times a day, and Docker's stop_grace_period is 30 s (deploy/staging/docker-compose.yml:27).

Behaviour:
- Ticker.stop() returns the running promise (this.running ?? Promise.resolve()).
- Jobs await it in beforeApplicationShutdown, bounded by a 20 s race.
- Once stopping, the sender (message.sender.ts:59, drain/lane-tickers.ts:32-33) claims no new rows, and finishes or releases its current row.

Tests first:
- Ticker.stop() resolves only after the run in flight.
- A shutdown during a fake slow send records 'sent', not SENDING.
- The 20 s bound wins over a hung pass.

Req: R-MSG-01, R-MSG-05.

## L14: staff-web route error, loading and not-found states; sign-out on 401

- Branch: `fix/web-route-states`
- Needs: `fix/web-query-defaults`
- Audit items: WEB-2

Needs lane L09 merged (same file: apps/staff-web/src/boot.tsx).

Goal (audit WEB-2): staff-web has no route error, pending or not-found component (boot.tsx:11, routes/__root.tsx).
- A render error or a failed /auth/me shows TanStack's English «Something went wrong!» card, and its «Show Error» button reveals the raw message.
- The page is blank while loading.
- family-web already has these components (features/route-states/RouteStates.tsx, boot.tsx:14-17).

Part 1 (always):
- Move RouteError and RoutePending into packages/web-kit (boot), and use them in both apps as defaultErrorComponent and defaultPendingComponent.
- Add a defaultNotFoundComponent in staff-web.
- Add a small inline Arabic splash in apps/staff-web/index.html #root.

Part 2, only if PR #783 is merged when you start (otherwise leave it out and say so in the PR):
- Pass onCaughtError and onUncaughtError to createRoot.
- Add a QueryCache and MutationCache onError that reports to #783's installErrorReporting.
- The same onError signs out on 401 and on 403 account_disabled. Use mobile-kit's signOutOnAuthError (query-client.ts:30-34, :44-45), moved to client-core.

Tests first:
- A throwing route shows the Arabic card with a retry button.
- An unknown path shows not-found.
- A 401 from a query signs out once.

Design review: load heuristic-evaluation, design-qa-checklist and critique-brand-consistency. Use the staff look and the existing palette.

Req: R-NFR-01, R-NFR-07, R-AUTH-01.

## L15: web-kit query-state component

- Branch: `fix/web-query-state`
- Needs: `fix/web-query-defaults`
- Audit items: WEB-1

Needs lane L09 merged (the retry policy).

Goal (audit WEB-1):
- On the student file, «المدفوعات» and «الفواتير» vanish when their read fails: StudentPayments.tsx:14 and StudentInvoices.tsx:16 return null on !data.
- The dashboard money tiles show «—» both while loading and on error (MoneyKpis.tsx:22,28).
- Three load-state helpers exist: web-kit portal/LoadState.tsx, settings pages/communications/LoadState.tsx and teaching/teacher-students/load-state.ts.

Behaviour:
- One packages/web-kit display/query-state component replaces the three. It has a skeleton, an error line with «إعادة المحاولة», and an empty state.
- Use it on StudentPayments, MoneyKpis, receivables and payouts.
- Keep a 403 silent where a panel hides on purpose: StudentInvoices, with retry:false in api.invoice.ts:58.
- The other files from the audit's regex list follow when they are touched.

Tests first:
- one test per state: loading; error, where retry calls refetch; empty; data
- StudentPayments shows the error line on a failed read

Design review: load heuristic-evaluation, design-qa-checklist and critique-brand-consistency.

Req: R-NFR-01, R-STU-06, R-PAY-01.

## L28: One net-paid rule

- Branch: `fix/net-paid-rule`
- Needs: nothing
- Audit items: BE-05

Goal (audit BE-05): three api files re-implement net paid beside @ab/money netPaid (packages/money/src/ledger/usage/payment-state.ts:19-22):
- teaching/course-stop/course-stop.repo.ts:104-111: a float sum with no currency filter
- reporting/dashboard/work/work.mapper.ts:75
- finance/subscriptions/subscriptions.repo.ts:106-120: cents, skipping rows in another currency

Work:
- Route all three through netPaid. Add a currency-filtering variant in packages/money for subscriptions.repo.
- Add a lint ban on `kind === 'refund' ?` sums outside packages/money.

Tests first: one fixture (a payment, a refund and a legacy foreign-currency row) gives the same paid and owed amounts on the package view, the work list and the course stop.

Req: R-PAY-01, R-SUB-01.

## L29: Payouts batch read and docs/57 corrections

- Branch: `fix/payouts-batch-read`
- Needs: nothing
- Audit items: BE-06

Goal (audit BE-06): the payouts list annotates one ledger read per unpaid payout (finance/payouts/payouts.ledger.ts:41-47). Replace it with one paidOnLessons read for all the page's lesson ids, grouped by payout.

Also correct docs/57 on develop:
- §10.4: strike quick win #2 (sales renewals run once per family, sales-money.reads.ts:32-36).
- §10.4: strike quick win #4 (template lookups are already cached once a minute, template-names.ts:7).
- §10.4: restate #7 (one cache entry per pathKey, so no duplicate requests).
- §7.4.5: note that the counting fake Db already exists (people/guardians/fake-db.ts).
- Lane L: replaced by the oxfmt format sweep (`pnpm format:check`, docs/31b §9).

Tests first: with the counting fake Db, N payouts take one ledger read, and the totals equal today's.

Req: R-PAY-02, R-TCH-04.

## L30: Alerts sweep only for live packages

- Branch: `fix/alerts-live-packages`
- Needs: nothing
- Audit items: BE-07

Goal (audit BE-07; docs/57 §3.1 row 5):
- alerts.repo.ts:39-45 reads every subscription ever, with no status filter.
- alerts.service.ts:51-73 evaluates each student in turn, about 6 PostgREST calls each, every 15 min.

Work:
- Limit the sweep to students with a live package (not ended or cancelled), plus those changed since the last sweep.
- Batch the recompute into one set-based RPC over the ids. Load supabase-postgres-best-practices.
- The set-based horizon generate is a later slice.

Tests first:
- A student whose package ended is not evaluated.
- The call count stays constant as the number of students grows (counting fake Db).

Req: R-SUB-02, R-NFR-08.

## L33: Shared fake Db and finance repo shape tests

- Branch: `ci/shared-fake-db`
- Needs: nothing
- Audit items: SPT-02+BE-12

Goal (audits SPT-02 and BE-12):
- 92 of 209 api repos have no test. Finance has 15: payments.repo.ts, balance.repo.ts, invoices.repo.ts, commissions.repo.ts, payment-links.repo.ts, statements.repo.ts and others.
- The counting fake Db lives in people/guardians/fake-db.ts, is imported by 194 files, and types its rows as `data?: unknown`.

Slice 1:
- A pure move of fake-db.ts to apps/api/src/common/testing/, using a refactor/moves map and pure-move-check, in its own commit.
- Shape tests for the 15 untested finance repos, asserting the table, columns, filters, bounds and round-trip count.

Typed rows from @ab/db and the lane R moves (69 files in ab/forbidden-imports) are later slices, at most 20 files each.

Tests: the shape tests are the deliverable. The move keeps the existing tests unchanged and green.

Req: R-PAY-01, R-NFR-06.

## L35: Query-key lint, every literal fixed first

- Branches, in order: `ci/query-key-lint-1` … `ci/query-key-lint-9` (the fixes), then `ci/query-key-lint` (the rule)
- Needs: nothing (each numbered PR needs the one before it merged)
- Audit items: WEB-3+SPT-08

Goal (audits WEB-3 and SPT-08; docs/57 G3):
- 325 inline `queryKey: [` literals in 187 files bypass pathKey and listKey (packages/client-core/src/core/keys/query-keys.ts:1-15).
- A few roots are not paths (reply-lesson ×3, portal-recording-url ×2, portal-lesson-file-url ×2, thread-file ×2), so path-prefix invalidation never reaches them.

Work:
- PR 1 (`ci/query-key-lint-1`): check whether any write should refresh the non-path roots and move those to path keys; add one queryOptions in client-core for /auth/me, which 3 or more staff-mobile files fetch.
- PRs 2–9: replace the inline literals with per-domain factories (`x.keys.ts`) or pathKey/listKey, one domain at a time, at most 20 files per PR, until `git grep "queryKey: \["` finds none outside `*.keys.ts`.
- Last PR (`ci/query-key-lint`): add the lint rule ab/query-key-factory (a queryKey must come from pathKey, listKey or a *.keys.ts) at zero violations: no suppression, no baseline.

Tests first: each fix PR keeps the invalidation tests of the queries it touches green (adds one when missing); the last PR has rule tests with valid and invalid cases.

Req: R-NFR-05.

## L39: api test import profile and fewer AppModule boots

- Branch: `ci/api-test-imports`
- Needs: nothing
- Audit items: SPT-10

Goal (audit SPT-10): the api unit suite runs in 4 shards of 7–9.5 min each, and 92 % of that time is module import (ci.yml:204-208). 43 tests boot AppModule, and '@ab/shared' star-exports 7 packages.

Slice 1:
- In CI or a cloud session, collect per-file durations with vitest's JSON reporter on one shard, plus the 20 slowest imports, and put them in the PR.
- Then replace the AppModule boots with module-level test apps, keeping one AppModule DI smoke test.
- Add an isolate:false project or subpath imports only if the profile points there.

The goal is 2 shards.

Req: R-NFR-06.

## L40: Admin booking draft kept and guarded

- Branch: `fix/booking-draft-kept`
- Needs: nothing
- Audit items: WEB-11

Goal (audit WEB-11, S part): the admin booking draft lives in component state (BookingWizard.tsx:59-61), so navigating away, for example to answer a chat, loses it. The sales chat path keeps its draft (SalesRegisterAction.tsx:47-51).

Work:
- Keep the admin draft in sessionStorage the way the composer does (rememberUntilSessionEnd), with try/catch around storage.
- Add a leave guard on the wizard, following platform/settings/values/sheet/LeaveGuard.tsx.
- Moving the forms to TanStack Form + zod is a later lane.

Tests first:
- Navigating away and back restores the draft.
- A finished booking clears it.
- Leaving a dirty wizard asks first.

Design review skills (heuristic-evaluation, design-qa-checklist, critique-brand-consistency) for the guard dialog.

Req: R-SCH-06.

## L42: Chat render-count measurement and LazyList for long staff lists

- Branch: `fix/mobile-chat-render`
- Needs: nothing
- Audit items: MOB-7

Use the docs/57 G1-d compiler report if it is available.

Goal (audit MOB-7): the staff chat's render cost is unmeasured. It is apps/staff-mobile/src/inbox/messages/components/MessageList.tsx, an inverted FlatList, with floating-day state in days/use-top-day.ts and use-day-band.ts. Staff-mobile has 33 FlatList sites against 23 LazyList.

Slice 1, the measurement: a render-count test on a 300-message fixture, with scroll start, scroll end and viewability events, counting MessageRow and cell renders.
- Only if cells re-render: move the floating-day state into an Animated value, or a tiny store that only FloatingDay reads.

Then:
- Move TodayLayout, SalesSchedule and Notifications to LazyList, with a recycle test for any row that holds local state.
- Remove the memo advice at LazyList.tsx:61.
- The chat stays on FlatList.

Req: R-MOB-02, R-NFR-08.

## L43: Phone boot mark

- Branch: `fix/mobile-boot-mark`
- Needs: nothing
- Audit items: MOB-10

Goal (audit MOB-10): staff app cold start is not measured (0 boot timing in sm, fm or mk).

Work:
- Add a boot mark only: the time from index.ts load to the first screen, plus the restored cache size (one AsyncStorage value, mk query-client.ts:65-76).
- Log both once per start, with the build tag, through the existing logger or reporter.
- Change nothing else. Read a week of numbers before trying a per-query persister or embedded fonts.

Tests first: the mark logs once per start, with both values.

Req: R-MOB-01, R-NFR-08.

## L31: Finance dashboard card from one aggregate RPC

- Branch: `fix/finance-card-rpc`
- Needs: `fix/net-paid-rule`
- Audit items: BE-08

Needs lane L28 (the money rule).

Goal (audit BE-08; docs/57 §3.1 row 4): the dashboard cards readAll whole windows into Node to count and sum: reporting/dashboard/dashboard.queries.ts:32,41,91; finance/finance.queries.ts:17,34,55; work/work.queries.ts:26,42,56.

First slice, the finance card:
- One aggregate SQL function (count and sum … group by). Load supabase-postgres-best-practices.
- Call it through a renamed FinanceRepo, renamed from FinanceQueries (rule 1; docs/32 lane R).
- Add a 60 s entry in common/infra/cache/shared-cache.ts.
- Prune finance.queries.ts from refactor/guards/queries.json.

The dashboard and work cards follow as their own PRs.

Tests first:
- One RPC per card.
- The totals equal today's mapper on the same fixture.

Req: R-RPT-01, R-RPT-02.

## L37: Report draft hooks into client-core

- Branch: `fix/report-draft-hooks`
- Needs: `fix/report-drafts`
- Audit items: SPT-05

Needs lane L16 merged.

Goal (audit SPT-05): the report draft autosave and report-entry hooks exist once per staff app, and the copies have drifted:
- staff-web features/reporting/reports/entry/use-autosave.ts skips a body that has not changed.
- staff-mobile teacher/report/hooks/use-autosave.ts sends it again, and writes the draft into the query cache.

Work:
- Move useDraftSave and useReportEntry into packages/client-core as one implementation, with storage and the cache write behind optional ports.
- Decide the unchanged-body rule once, with a test.
- Keep L16's unsent-body retry, so staff-web inherits it.
- Move the existing tests; do not rewrite them.
- At most 20 files.

Req: R-REP-01, R-REP-02.

## L41: Server time at booking decision sites

- Branch: `fix/booking-server-time`
- Needs: `ci/query-key-lint`
- Audit items: WEB-6

Needs lane L35 (the G3 lint infrastructure). Split into numbered PRs: `fix/booking-server-time` (slice 1), then `fix/client-now-2` … `fix/client-now-4`, the rule in the last one.

Goal (audit WEB-6; docs/57 R16): booking, makeup and package screens use the PC's clock (MakeupAction.tsx:20, LessonRows.tsx:70, SlotPicker.tsx:35, pricing-form.ts:53). The server already re-checks (booking.plan.ts:14-21).

Work:
- Slice 1: client-core learns a clock offset from the API's Date header; a web-kit useServerNow() replaces new Date() at those decision sites.
- Slices 2–3: replace the rest of today's 55 sites, at most 20 files per PR: a business decision reads server time; a UI timer or animation moves into a named `*.timer.ts` or animation hook, the rule's one exemption.
- Last slice: add ab/no-client-now at zero violations: no suppression, no baseline.

Tests first: with a skewed fake clock and a Date header, past slots are marked by server time.

Req: R-SCH-01, R-SCH-04.

## L32: Driver capabilities record, slice 1

- Branch: `fix/driver-capabilities`
- Needs: `fix/wa-lane-hold`, `fix/sender-graceful-stop`
- Audit items: BE-11

Needs lanes L01 and L07 merged (same sender files).

Goal (audit BE-11): DriverCaps has 4 booleans (drivers/driver-caps.ts:7-16), and 34 provider-name literals in 28 files outside drivers/ choose behaviour, for example hold-key.ts:16-17, numbers.parity.ts ×3, media-client.ts ×2 and lines.check.ts ×2.

First slice:
- Grow DriverCaps into a per-driver record (a rule 11 map) covering holdKey and mediaSource, and replace those call sites.

templateSource, reopen, parity, and the moves of crm-copy, crm-sent and crm-confirm come in later slices, at most 20 files each, until none of the 34 provider literals is left outside drivers/ and config/env. The last slice adds the guard that bans them there, at zero: no baseline.

Tests first: a table test per driver and capability, checked against today's behaviour.

Req: R-MSG-01, R-MSG-04.

## L34: Parsed API answers, slice 1: schema option and payout/payment views

- Branch: `fix/parsed-api-answers`
- Needs: `fix/db-timeout-outcome`
- Audit items: SPT-01+WEB-8

Needs lane L08 merged (the money schemas).

Goal (audits SPT-01 and WEB-8; docs/36 h3):
- client-core api-client.ts:23-43: apiFetch<T> and apiSend<T> return `body as T`.
- There are 551 ab/no-untyped-api-calls suppressions, 109 of them in 35 money files.
- The Z-5 lint message (packages/config/eslint-syntax.js:10) asks for a `schema` option that does not exist.

Slice 1:
- Add the schema overload, with tests: a mismatch becomes ApiError bad_response. Follow the pattern in own-profile.ts:32.
- Turn PayoutView and the payment views (packages/money/src/ledger/views.ts) into zod schemas with z.infer types, each with a rejected-payload test.
- Switch the staff-web and staff-mobile payouts and payments clients to it, and prune their suppressions.
- Money screens show the L15 query-state error when a parse fails.

The other money views and the docs/52 §4 bodies follow, at most 20 files per PR.

Req: R-PAY-01, R-PAY-02.

