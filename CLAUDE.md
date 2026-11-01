# CLAUDE.md — Ayat Al-Bayan Academy Platform

Arabic-first (RTL) platform replacing Google Forms/Sheets/Calendar/Apps Script for an online Quran academy: WhatsApp lead inbox → student registration → teacher assignment & scheduling → lesson reports (PDF to parents via WhatsApp) → subscriptions, payments, teacher payouts.

## Read first
- `docs/01-current-system-flow.md` — what exists today and why it hurts
- `docs/02-issues.md` — 30+ concrete defects (each maps to a requirement ID)
- `docs/03-requirements.md` — requirement IDs `R-XXX-nn` (source of truth for scope)
- `docs/04-architecture.md` — stack, repo layout, schema, module map, testing
- `docs/05-build-plan.md` — phases, workflow usage, definition of done
- `docs/06-data-migration.md` — Sheets → Postgres mapping

## Stack (do not substitute)
Turborepo + pnpm · Supabase (Postgres, Auth, Storage, pg_cron/pg-boss) · NestJS (Fastify) API · React 19 + Vite + TanStack (Router/Query/Table/Form) + Tailwind/shadcn web · Expo (expo-router) admin mobile · Meta WhatsApp Cloud API · Playwright (web e2e) · Vitest/Jest unit · jest-expo mobile.

## Hard code rules (CI fails otherwise)
1. **Max 150 lines per file** (`max-lines`, blank lines & comments count) of **≤ 100 characters** (`max-len`; long strings and URLs may run on), functions ≤ 50 lines (`max-lines-per-function`, tests exempt). Split: `x.service.ts` / `x.repo.ts` (class `XRepo`: the only place that injects `DB`) / `x.mapper.ts` / one component per file / tests split by scenario. **No new `*queries.ts` file or `class XQueries`** (`pnpm guard:queries`; the old ones are listed in `refactor/guards/queries.json` until lane R renames them, docs/32 D2). Components call the API through hooks, never `apiFetch`/`apiSend` in a `.tsx`.
2. **Max 3 parameters per function, 4 per constructor** (`ab/max-params`, docs/32 D1; method signatures count). Use a typed options object for the 4th+.
3. Strict TypeScript, no `any`, no non-null assertions in app code. Type-aware lint at `--max-warnings 0`, React 19 idioms (mobile), no `useMemo`/`useCallback`/`memo` where the React Compiler builds (web, mobile), effects only in named hooks: `docs/31a-strict-types-lint.md`. Old violations sit in `eslint-suppressions.json`, whose totals may only shrink (`pnpm guard:lint`); fixing one makes lint fail until it is pruned: `pnpm lint:prune` then `pnpm guard:lint -- --write` (a red CI lint job prints the diff to commit).
4. Every PR/commit adds unit tests next to the code (`*.test.ts`). Pure logic (phone/arabic normalisation, occurrence generation, conflict check, state machines, balances, reminder timing) must be unit-tested ≥ 80 %.
5. Playwright e2e for the six journeys in `docs/03-requirements.md §5`; run against local Supabase + WhatsApp stub (`tools/wa-stub`).
6. All times UTC in DB; tz on every person; never free-text times.
7. Phone numbers E.164 only; `students.code` (`AB-nnnn`) is generated, never typed.
8. Idempotent jobs (dedup keys); idempotent occurrence generation (`unique(rule_id, starts_at)`).
9. RLS on every table + guards in Nest. Secrets only via env/Vault.
10. Arabic UI strings in `packages/shared/i18n/ar.json`, written in clear Modern Standard Arabic (owner, 2026-10-03: no Egyptian dialect); keep the domain vocabulary below.
11. Few `if` conditions (owner, 2026-11-01): prefer lookup tables / `Record<Key, Handler>` maps and per-kind strategies over if/else or switch chains, named predicates over inline boolean logic; at most one early-return guard where possible, never nested ifs, no nested ternaries, no lonely `if`, no `else` after `return` (`max-depth` 2; `complexity` 8, 6 in plain `.ts`: packages/config/eslint-flow.js).
12. Validate with **zod** (owner, 2026-11-01: «use zod»): every API body/query/param, env and DB config value, webhook payload, external API response and form is parsed with a zod schema (shared ones in `packages/shared`), and types come from `z.infer`; no hand-written `typeof`/`in`/shape checks or manual type guards for data that crosses a boundary.
13. **Imports only through a module's `index.ts`** (api `modules/<domain>/<module>`, web `features/<domain>/<feature>`, mobile `src/<feature>`), **written absolute** in apps: `@/…` (→ `src/…`), never `../` (`ab/no-parent-imports`; `./` siblings stay; `pnpm imports:absolute -- <files> --write`; owner 2026-10-30, docs/32 R12); ≤ 12 code files and ≤ 12 sub-folders per folder; no new duplicate (jscpd) or unused code (knip). Baselines only shrink: `eslint-suppressions.json`, `refactor/folder-cap/`, `refactor/guards/` (docs/04 §8). Shared web + mobile logic lives in `packages/client-core`.

## How to execute (speed)
- Use the **Workflow** tool for every phase with ≥ 3 independent modules (owner opted in). Builders in worktrees → verifiers → integrator (see `docs/05-build-plan.md §2`). ≤ 10 agents per run.
- Every agent prompt repeats rules 1–4 and lists the requirement IDs it must satisfy.
- Project skills live in `.claude/skills/` (see its README): every design review loads `heuristic-evaluation`, `design-qa-checklist` and `critique-brand-consistency`; every migration, SQL or RLS change loads `supabase-postgres-best-practices`.
- Before finishing any phase: `pnpm turbo lint typecheck test` (+ `e2e` from Phase 2) green; write `PHASE_SUMMARY.md`.

## Commands
```
pnpm i
pnpm supabase start            # local stack (packages/db)
pnpm turbo dev                 # api :3000, web :5173, wa-stub :4010
pnpm turbo lint typecheck test
pnpm turbo e2e                 # playwright (apps/web against seeded db)
pnpm --filter mobile start     # expo
pnpm migrate:dry && pnpm migrate:apply   # tools/migrate
```

## Domain vocabulary
حلقة = lesson · معلم/ة = teacher · ولي الأمر = guardian · باقة = package/subscription · حلقة تجريبية = trial · تسميع = recitation (recited) · حفظ جديد = new memorization · مراجعة = revision · تجويد = tajweed · تقرير الحلقة = lesson report · يحتاج تأكيد = needs confirmation · مشترك = subscribed/active.
