# Paste this into Claude Code (first message)

```
You are building the Ayat Al-Bayan Academy Platform from the handover in this folder.

Step 1 — Read CLAUDE.md, then docs/01 → 06 in order. Do not start coding before you can list the 6 core journeys and the 10 hard code rules back to me.

Step 2 — Phase 0 (scaffold) yourself, single agent: Turborepo + pnpm, packages/config (eslint max-lines 150 / max-params 3 / strict TS), packages/db (supabase init + first migration + generated types), apps/api (NestJS Fastify, Supabase JWT guard, health, OpenAPI), apps/web (Vite + TanStack Router/Query/Table/Form + Tailwind RTL + shadcn, login), apps/mobile (Expo + expo-router, login), e2e/ (Playwright: chromium, ar locale, RTL, auth fixture, db seed/reset), tools/wa-stub (fake Meta Cloud API), GitHub Actions CI. Finish when `pnpm turbo lint typecheck test e2e` is green with a login smoke test.

Step 3 — Phases 1→6: use a workflow for each phase exactly as docs/05-build-plan.md §1–2 describes (parallel module builders in worktrees → per-module verifier → integrator). Every builder prompt must include: the module's requirement IDs, "max 150 lines per file", "max 3 params per function", "write Vitest/Jest unit tests beside the code", "Arabic labels from packages/shared/i18n". Add the Playwright journeys listed for the phase. Stop after each phase, show me PHASE_SUMMARY.md and the open questions, and wait for my go.

Step 4 — Phase 6 migration: run tools/migrate in dry-run on the CSV exports I will put in tools/migrate/input/, show me the merge queue and rejected rows before applying.

Constraints that override everything: Supabase + NestJS + React/TanStack + Expo + Turborepo; files ≤150 lines; functions ≤3 params; unit tests + Playwright on every phase; workflows for parallel execution.
```

## What to export from Google before Phase 6
Download as CSV (File → Download → CSV, one per tab) into `tools/migrate/input/`:
- HUB `1UO_Kh_eSDWd7JYHVyhfhOr94Vbh3-2E4R2GnvBVEbY0`: ردود التسجيل, الطلاب, المعلمين, كل المحادثات, ردود التوظيف, الردود الجاهزة
- BOOK `1Q9N1Emhmh0iq5kz0TEDZDqlOJt1mLtpEo-m_9pGyYLQ`: تقويم الحجوزات, المعلمون
- REP `1trZNAFeiUyGChVHYFmdPQwT26Civb4YXatChLbJI4ZM`: Form Responses 1
- SUBS `1IbZXQrwftvgNpULv2XMkI7heJVLaiZhAzU_8l6MHvRE`: الطلاب
- HEART `1Xap8wVaJu2Ea-it_SGuRkDJRxv1J6t6GRihpHaURR8I`: subscription
- FIN `1lct5ImTOa1Dm8g3XtdD9se92ZPi-LBlAUPSu8YV17QU`: general, sept

Also needed from you: Meta WABA id + phone number id + permanent token (into `.env`, never in the repo), Supabase project refs (dev/staging/prod), package prices.
