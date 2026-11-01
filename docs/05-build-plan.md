# 05 — Build Plan for Claude Code (workflows, Playwright, unit tests)

The owner asked for: **use workflows (multi-agent) to build faster, Playwright for e2e, unit tests everywhere.** This plan is written so Claude Code can execute it phase by phase. Every phase ends with `pnpm turbo lint typecheck test` green and, from Phase 3 on, `pnpm turbo e2e` green, in the PR's GitHub Actions CI (a cloud session may run lint, typecheck and unit tests itself); nothing runs on the owner's PC.

## 0. Ground rules for the executing agent

1. Read `CLAUDE.md`, `docs/03-requirements.md`, `docs/04-architecture.md` before writing code.
2. Use the **Workflow** tool for every phase that has ≥ 3 independent work items (the user opted in: "use workflows to make it faster"). Pattern: `parallel()` builders per module → `pipeline()` into a reviewer/verifier agent per module → one integrator agent that gets the PR's CI green (lint, typecheck, unit tests and only the e2e specs the change reaches, desktop project only) and then the full e2e suite (all specs, both projects): the push run on develop after the merge, or `gh workflow run ci.yml --ref <branch>` before it (a manual run takes the full path in job «changes»: 8 shards plus «single line», no `--project` filter). Keep ≤ 10 agents per workflow run.
3. Every agent prompt must repeat the two hard constraints: **≤150 lines per file, ≤3 params per function**, and "write unit tests in the same PR".
4. Agents work in **git worktrees** (one branch per module) and merge through the integrator; never two agents on the same file.
5. Each phase: builders → verifier (checks lint/typecheck/tests in CI or a cloud session, reads the diff against requirements IDs) → fix loop (max 2) → merge.
6. Never invent requirement behaviour — if a requirement ID is ambiguous, leave a `TODO(R-XXX-nn): question` and list it in the phase summary.

## 1. Phases

### Phase 0 — Scaffold (single agent, no workflow)
- `pnpm dlx create-turbo@latest` → restructure to layout in `04-architecture.md §2`.
- `packages/config`: eslint (max-lines 150, max-params 3), tsconfig strict, prettier, vitest preset.
- `packages/db`: `supabase init`, first migration = enums + `profiles`, `teachers`, `guardians`, `students`, `leads`. Generate types.
- `apps/api`: Nest + Fastify, Supabase JWT guard, health endpoint, OpenAPI.
- `apps/web`: Vite + TanStack Router + Tailwind RTL + shadcn; login page.
- `apps/mobile`: Expo + expo-router + login.
- `e2e/`: Playwright config (chromium, `ar` locale, RTL, 2 viewports), auth fixture, DB seed/reset helpers.
- CI: `.github/workflows/ci.yml` running `supabase start`, `turbo lint typecheck test`, `turbo e2e --filter=e2e`.
- Deliverable check: `pnpm turbo lint typecheck test e2e` passes with one smoke e2e (login).

### Phase 1 — Core domain (workflow: 4 builders + verifier)
Parallel builders, one worktree each:
- **B1 `students+guardians`**: migration, RLS, Nest module (CRUD, `normalizeArabic`, `normalizePhone`, `DuplicateDetector`, `MergeService`), unit tests for every pure function (≥ 20 cases incl. سهيلة/سهيله, hamza variants, +966/966/0 formats). Web: students table + profile + merge dialog.
- **B2 `teachers`**: migration, module, availability + time-off, `freeSlots` query, unit tests on slot math across DST-free Riyadh + Cairo tz. Web: teacher list, availability grid.
- **B3 `leads+job_applicants`**: migration, module, status machine, unit tests on transitions. Web: inbox list (no messaging yet).
- **B4 `shared`**: enums, zod schemas, i18n ar.json (all labels from the current forms/sheets), `api-client` generator script.
Verifier: checks tests and the file-length/param lint in the PR's CI or a cloud session (never on the owner's PC), checks each builder covered its requirement IDs (R-STU-*, R-TCH-01/02, R-LEAD-01/04).

### Phase 2 — Scheduling engine (workflow: 3 builders + verifier)
- **B1 `schedule_rules + OccurrenceGenerator`**: idempotent upsert over horizon, unit tests: no duplicates on re-run (issue B1), byday math, tz conversion Riyadh↔UTC, horizon extension.
- **B2 `ConflictChecker + BookingWizardService`**: teacher/student overlap, availability window, override-with-reason; one transaction; unit + API e2e.
- **B3 `lessons` state machine + reschedule/cancel**: table-driven unit tests for every transition; chargeable flag rules (R-SCH-07).
Then **web**: booking wizard (student → teacher → slot grid → package) + week schedule view. Playwright journeys #4 and #5 added.

### Phase 3 — Reports & subscriptions (workflow: 4 builders + verifier)
- **B1 `lesson_reports`**: prefilled form endpoint, draft/submit/version, unique per lesson+student, validation (dates). Web teacher report form (prefilled, read-only identity fields).
- **B2 `ReportPdfJob`**: HTML template (Arabic RTL, brand colours, same sections as today's PDF), Playwright-Chromium render, Storage upload, snapshot test on HTML, smoke test on PDF byte size/pages.
- **B3 `subscriptions + payments`**: balance view, alerts job, payments CRUD with receipt upload, payouts calculator; unit tests on balance after cancellations/no-shows.
- **B4 `dashboard`**: funnel/load/finance queries + web dashboard.
Playwright journeys #2 and #3.

### Phase 4 — Messaging (workflow: 3 builders + verifier)
- **B1 `WhatsappClient + TemplateRegistry`**: Cloud API client, `verifyAll()` at startup, settings page showing template health; unit tests with recorded fixtures; **stub server** `tools/wa-stub` for local/e2e.
- **B2 `WebhookController`**: signature verify, inbound → messages/leads, quick replies; API e2e.
- **B3 `ReminderScheduler + FollowUpScheduler + ReportDelivery`**: cron, dedup keys, retries; unit tests on timing windows in guardian tz; click-to-chat fallback link builder.
Web inbox thread view + send template. Playwright journey #1 end-to-end against the stub.

### Phase 5 — Mobile admin app (workflow: 3 builders + verifier)
- **B1** Inbox + thread + send template. **B2** Today (lessons across teachers, confirm/cancel). **B3** Students quick view + record payment with camera + push notifications registration.
- jest-expo + RNTL tests per screen; EAS preview build.

### Phase 6 — Migration & cut-over (workflow: 2 builders + verifier)
- **B1 `tools/migrate`**: readers for the Google Sheets exports (CSV), mappers per `06-data-migration.md`, dedupe review queue, dry-run diff, apply. Unit tests on mappers with real sample rows (anonymised).
- **B2** Google Calendar mirror module (optional) + Apps Script shutdown checklist.
- Run dry-run on real exports; owner reviews merge queue; apply to staging; owner UAT; apply to prod; stop Apps Script triggers; redirect Google Form to a "موقع التسجيل الجديد" notice.

## 2. Workflow script skeleton (for Claude Code's Workflow tool)

```js
export const meta = {
  name: 'build-phase',
  description: 'Build one phase of Ayat Al-Bayan platform: parallel module builders, verifier, integrator',
  phases: [{ title: 'Build' }, { title: 'Verify' }, { title: 'Integrate' }],
}
const RULES = `Hard rules: every file <=150 lines; every function <=3 params (use an options object);
strict TS, no any; write unit tests (Vitest/Jest) beside the code; Arabic labels from packages/shared/i18n.
Work only inside your module folder(s). Before finishing, get pnpm turbo lint typecheck test --filter=<your pkg>
green in a cloud session or the PR's CI; never run it on the owner's PC.`
const MODULES = args.modules // [{key, pkg, prompt, requirementIds}]

const built = await parallel(MODULES.map(m => () =>
  agent(`${m.prompt}\n\nRequirement IDs you must satisfy: ${m.requirementIds.join(', ')}\n\n${RULES}`,
    { label: `build:${m.key}`, phase: 'Build', isolation: 'worktree' })))

const verified = await parallel(built.map((b, i) => () =>
  agent(`Verify module ${MODULES[i].key}: check lint/typecheck/tests (cloud session or CI), read the diff,
  check every requirement id (${MODULES[i].requirementIds.join(', ')}) is implemented and tested; fix small issues; report residuals.`,
    { label: `verify:${MODULES[i].key}`, phase: 'Verify', isolation: 'worktree', schema: VERDICT_SCHEMA })))

const result = await agent(`Merge all module branches into one integration branch, resolve conflicts, open its PR
into develop and watch its GitHub Actions CI with gh pr checks --watch until green (lint, typecheck, unit tests and
the e2e specs the change reaches, desktop only). For the full suite (all specs, both projects) run
gh workflow run ci.yml --ref <branch> and watch it with gh run watch, or watch the push run on develop after the
merge. Fix integration issues, merge, write PHASE_SUMMARY.md with residual TODOs.`,
  { label: 'integrate', phase: 'Integrate' })
return { verified, result }
```

## 3. Definition of done (per phase)
- The PR's GitHub Actions CI is green: `pnpm turbo lint typecheck test`, from Phase 2 `pnpm turbo e2e` (a cloud session may run lint, typecheck and unit tests first; never the owner's PC). A PR runs only the e2e specs its change reaches, desktop only; the full suite runs on the push to develop or with `gh workflow run ci.yml --ref <branch>`.
- No file > 150 lines, no function > 3 params (lint enforces; CI fails otherwise).
- Every requirement ID listed for the phase appears in a test name or a code comment `// R-XXX-nn`.
- `PHASE_SUMMARY.md` lists what was built, tests added (count), residual TODOs/questions for the owner.

## 4. Open questions for the owner (answer before Phase 3/4)
1. Pricing per package & currency (sheet shows EGP revenue per student, but students pay in SAR?). Needed for `subscriptions.price` defaults.
2. Late-cancellation policy (hours before start that still consumes a lesson).
3. Which Meta WABA / phone number ID to use; template approval owner.
4. Should guardians get a portal link in v1 or only WhatsApp PDFs? (R-portal is designed but can be deferred.)
5. Group lessons: max students per lesson?
