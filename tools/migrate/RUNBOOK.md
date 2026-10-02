# Import runbook — Sheets + CRM → platform (R-MIG-01, R-MIG-02)

Who runs it: the developer, with the owner for every decision in step 4. How the tool works:
`README.md`. Mapping rules: `docs/06-data-migration.md`.

**Personal data.** The Drive zip, the CRM and everything under `tools/migrate/cache/` and
`tools/migrate/out/` are real people. They stay on this machine, are git-ignored, and are never
committed, pasted into chat, tickets or PRs. Only `out/report.md` (counts) may be shared.
`out/review.xlsx` goes to the owner only. The CRM is read-only for this tool.

## 0. Once per machine

1. `pnpm i` at the repo root.
2. `cp tools/migrate/.env.example tools/migrate/.env` and fill it from `.claude/artifacts/`
   (CRM: `crm/crm.env`; staging: `staging/supabase.md` + `staging/api.env`). Never commit it.
3. Teacher directory `tools/migrate/cache/teachers.json` (required; git-ignored):
   `{ "names": { "<slug>": "<Arabic display name>" }, "aliases": { "<Arabic spelling>": "<slug>" } }`.
   `<slug>` is the lower-case English name from HUB «المعلمين». Add any spelling the review shows
   under «missing teachers» to `aliases`. The owner checks the Arabic display names.

## 1. Target prerequisites

The target must have the full app schema before an apply (a dry-run works without it):

- Phase 4 migrations (`message_templates`, messaging, push) — staging lacks them today.
- `20261001000160_import_log.sql` (`import_runs`, `import_items`).
- `20261001000161_students_code_reserve.sql` (app-created student codes start at AB-1000; legacy
  codes AB-0001…0999 stay free for the import).
- Staging only: the demo seed holds AB-0183…AB-0194. Five real legacy codes fall in that range.
  Delete the demo rows before the apply (preferred: `pnpm clear:demo --allow-remote-staging`
  with the staging `DATABASE_URL`, check the counts, then add `--apply`), or accept that those
  five students get new codes (the dry-run lists each one under «duplicates to decide»).
  clear:demo refuses (nothing deleted, the table is named) while app rows still point at demo
  people: lessons, rules and payments block the delete, and WhatsApp messages, trial rules booked
  from a demo lead and job applicants are counted first so they are never silently detached.

## 2. Extract (no target involved)

```
pnpm migrate extract-sheets --zip <path to the Drive zip>   # → cache/sheets/
pnpm migrate extract-crm                                     # → cache/crm/ (SELECT only)
```

## 3. Dry-run (SELECT only against the target)

```
pnpm migrate:dry --target staging
```

Prints counts and writes `out/plan.json`, `out/report.md`, `out/review.xlsx`. Running it twice
on the same cache gives the same plan (apart from its timestamp).

## 4. Owner review of `out/review.xlsx`

Go through the sheets in this order. Fix data at the source (the sheet, then re-extract) or record
the decision in an owner file, then re-run step 3 until nothing in «review» is a surprise.

| sheet | what it holds | what the owner does |
|---|---|---|
| summary | create / update / adopt / skip / reject / review per table | check the totals look like the academy |
| merges proposed | similar names under one phone; two «الطلاب» rows with one AB code; registration rows joined to a child by AB code although the name differs; HEART names that fit several siblings; app rows adopted by exact name (warn) | confirm or say which child; split or merge in the app after import if needed |
| duplicates to decide | same record twice with different values (the kept row is named); a different teacher between rows (review); a report resubmitted (latest kept); a legacy code already used in the target; a booking rule replaced by a HEART timetable | pick the right value; fix the sheet if the kept one is wrong |
| rejected | rows not imported and why (test rows, bad phones, dates outside 2026-08-01..today, unknown students) | fix the source row only if it is real |
| unmatched PDFs | report PDFs with no report, several reports, or only a weak match (similar name, or a report submitted on the PDF date) | for each weak match that is right, add its zip path (column «file») to `cache/pdf-approved.json` (a JSON array); never approve a guess — a wrong match sends one child's report to another parent |
| missing teachers | teacher text that names no known teacher | add the spelling to `cache/teachers.json` aliases |
| changes | field-by-field changes an `update` would make (second and later runs; templates already in the target) | confirm nothing the team edited in the app is overwritten by mistake |
| adopted | rows the app created before the import that imported records will link to | confirm each is the same person / template |
| review | the rest: subscribed students (SUBS) or attendance folders (ATT) missing from the registry; families whose rows name no child (guardian kept); missing prices; HEART timetable rows that match no student; sibling rows | add missing students to HUB «الطلاب» (or the app) before the apply; enter prices and children in the app after it |
| warnings | facts, no action needed: lessons with no booked time (stored at noon Riyadh); HEART timetables assumed 45 min, Asia/Riyadh; teacher taken from the registry when the report's teacher cell was a city | — |

Open owner questions (answer before the production apply):

- HEART timetables: are the times Asia/Riyadh and the lessons 45 minutes?
- Guardian names: «اسم ولي الأمر» is empty in the export, so guardians are named after a child.
  Rename them in the app.
- Arabic-programme students: the export has no reliable programme column; all import as Quran.

## 5. Apply to staging

```
pnpm migrate:apply --target staging
```

Takes the target's apply lock, re-plans (the same plan as the last dry-run if nothing changed),
writes one transaction per batch, records `import_runs` + `import_items`, uploads approved report
PDFs to the `reports` bucket and prints the run id. A failed batch rolls back alone and the run is
marked failed; fix the cause and run it again — finished batches are skipped. A second apply of
the same data writes nothing.

## 6. Validate

```
pnpm migrate validate --target staging
```

Writes `out/validate.md` (counts only) and exits 1 when a hard check fails. Then spot-check in
the app with the owner: five students with their codes and teachers, one family's lessons and
reports (PDF opens), a subscription balance, one lead's WhatsApp thread.

## 7. Cut-over: final delta sync

1. Freeze the old system: close the Google Forms, stop the Apps Script triggers, tell teachers to
   use the app from now on.
2. Download a fresh Drive zip; `extract-sheets --zip <new zip>`; `extract-crm --since last`.
3. Dry-run, review only what is new (summary, «changes», «review»), apply, validate.

Re-runs are idempotent: unchanged records are skipped, changed ones are updated, and a lesson
report's lifecycle (version, send time) edited in the app is never rewound.

## 8. Production (owner's explicit go only)

Production is refused unless `--confirm-production` is passed; pass it only after the owner has
confirmed in writing, and only after a clean staging run.

1. Deploy all migrations of step 1 to production; fill `PRODUCTION_*` in `.env`.
2. `pnpm migrate:dry --target production --confirm-production`; owner reviews as in step 4.
3. `pnpm migrate:apply --target production --confirm-production`.
4. `pnpm migrate validate --target production --confirm-production`.

## 9. Afterwards

Delete `tools/migrate/cache/`, `tools/migrate/out/` and `tools/migrate/.env` from every machine
and worktree once the import is signed off. Keep nothing personal outside the platform database.
