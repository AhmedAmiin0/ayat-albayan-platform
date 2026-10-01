# Ayat Al-Bayan — System Handover Package

Generated 2026-10-01 from a full read of the academy's Google Forms, Sheets, Calendars and Apps Script.

| File | What it is |
|------|------------|
| `HANDOVER-PROMPT.md` | **Start here.** The message to paste into Claude Code + what to export from Google |
| `CLAUDE.md` | Project rules Claude Code reads automatically (stack, 150-line / 3-param limits, tests, workflows) |
| `docs/01-current-system-flow.md` | As-is flow (Mermaid diagram) and inventory of the 12 tools in use |
| `docs/02-issues.md` | 34 issues with evidence from your real data, each mapped to a requirement |
| `docs/03-requirements.md` | Roles, domain model, enums, 60+ requirement IDs, 6 core journeys |
| `docs/04-architecture.md` | Turborepo layout, Supabase schema, NestJS modules, React/TanStack, Expo, testing matrix |
| `docs/05-build-plan.md` | 7 phases, workflow (multi-agent) script skeleton, Playwright/unit-test gates, definition of done |
| `docs/06-data-migration.md` | Column-by-column mapping from every sheet to Postgres, dedupe rules, validation |

How to use: create an empty git repo, copy this whole folder into it, open Claude Code in that folder, paste the prompt from `HANDOVER-PROMPT.md`.
