# @ab/migrate — Sheets + CRM → Supabase (R-MIG-01, R-MIG-02)

One-off, re-runnable import of the owner's Google Drive export and WhatsApp CRM into the platform
DB. Mapping rules: `docs/06-data-migration.md`; data defects to clean: `docs/02-issues.md` A1–A9.

**Personal data.** The zip and the CRM hold real people. Intermediate files go only to `cache/` and
`out/` (git-ignored). Never commit, print or paste real rows; tests use invented fixtures; reports
committed or shared carry counts only (`out/report.md`). `out/review.xlsx` is for the owner only.
Never open `Backup  keys.docx` or `data.zip` (the zip reader filters them before inflating).
The CRM is read-only: `src/sources/crm.ts` exposes paged SELECTs and nothing else. Teachers' names
are not in the code either: they live in the owner's git-ignored `cache/teachers.json` (below).

Running an import: **`RUNBOOK.md`** (owner review, staging apply, validation, delta sync, production).

## Pipeline

```
extract  zip (xlsx) ──► cache/sheets/<spec id>.json     SourceRow[]   (sources/extract-sheets.ts)
         CRM (REST) ──► cache/crm/<table>.json          CrmRow[]      (sources/extract-crm.ts)
map      per entity, pure: SourceBundle ──► Mapped[] (ok + NaturalKey, or rejected + RowIssue[])
resolve  same natural key: same content → duplicate (warn), different → conflict (review)
plan     vs target: import_items (+ adopt by unique column) ──► create / update / skip / adopt;
         dangling refs ──► missing_ref (reject, cascades)                     (plan/diff.ts)
apply    APPLY_ORDER, one transaction per entity, import_runs + import_items  (plan/apply.ts)
validate docs/06 checks as SQL ──► out/validate.md                             (validate.ts)
```

Outputs of `dry-run` and `apply`: `out/plan.json` (full plan, personal), `out/report.md` (counts
only), `out/review.xlsx` (sheets: summary, merges proposed, duplicates to decide, rejected,
unmatched PDFs, missing teachers, changes, adopted, review, warnings).

Owner inputs (git-ignored, read by `loadBundle`):

- `cache/teachers.json` — required. `{ "names": { "<slug>": "<Arabic display name>" },
  "aliases": { "<Arabic spelling>": "<slug>" } }`; slug = lower-case English name from HUB
  «المعلمين». Cities in teacher columns are handled in code (`sources/values.ts`).
- `cache/pdf-approved.json` — optional. Zip paths of PDFs the owner accepts despite a weak match
  (similar student name, or a report submitted, not held, on the PDF date). Without it those PDFs
  stay in «unmatched PDFs»: a wrong match would send one child's report to another parent.

## CLI

```
pnpm migrate extract-sheets [--zip <path>]
pnpm migrate extract-crm [--since <ISO>|last]        # 'last' = per-table cursor in cache/crm/cursor.json
pnpm migrate:dry --target local|staging              # never writes to the target
pnpm migrate:apply --target local|staging            # production: --target production --confirm-production
  # dry-run / apply options: --creates-only, --from YYYY-MM-DD, --only <entity,…> (RUNBOOK §7c),
  #   --expiry-days N (the app's subscription_expiry_days for imported statuses, default 7; docs/06)
pnpm migrate validate --target local|staging
pnpm migrate review                                  # rebuild out/review.xlsx from out/plan.json
```

Env: copy `.env.example` to `tools/migrate/.env`. `--target staging` only accepts a DSN on the
staging session pooler (host + user checked). Production is refused without `--confirm-production`,
which needs the owner's explicit go.

## Contracts (`src/types.ts`)

- `SourceRow { ref: SourceRef; fields }` — fields named by `sources/headers*.ts`, never by column.
  Dates are zone-less wall clock (`YYYY-MM-DD`, `HH:mm`, `YYYY-MM-DDTHH:mm:ss`); convert with
  `time.ts zonedToUtc({ date, time, tz })` (sheets are `Asia/Riyadh` unless the row says otherwise).
- `Mapped<T>` — `{ ok: true, key, value: TargetRecord, ref, issues }` or `{ ok: false, ref, issues }`.
- `TargetRecord { columns, refs }` — `refs` are FK columns → `NaturalKey`, resolved to uuids at apply.
  Never put another imported row's uuid in `columns`.
- `RowIssue { code, severity: reject|review|warn, entity, ref, field?, detail? }` — codes map to A1–A9.
- `NaturalKey { entity, key }` — built only by `keys.ts`. Stored in `import_items(entity, natural_key)`.
- `Plan { items: PlanItem[], issues, counts }`, `PlanItem { key, action, targetId, hash, record, ref }`.

## Entity modules (`src/entities/`)

One file per entity implementing `EntityModule` (`entities/contract.ts`), registered in
`entities/index.ts`. `map(bundle)` is pure and unit-tested with invented rows. Optional:
`adoptBy` (unique column equal to the key, e.g. `phone_e164`), `prefer: 'last'` (B1: latest
booking wins), `write(ctx)` for custom writes (legacy `code_seq` with `overridingSystemValue`,
link tables with `returning: null`, Storage uploads).

| entity                           | natural key (`keys.ts`)                         | main sources                                                |
| -------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| teachers                         | slug of English name (`abrar`, `mariam adel`)   | hub_teachers, book_teachers, cache/teachers.json            |
| guardians                        | E.164 phone                                     | hub_students, hub_registrations, bookings, HEART            |
| students                         | `phone\|personName(name)`                       | same (AB code = identity), siblings split (A4); SUBS + ATT checked |
| leads / job_applicants           | E.164 phone                                     | CRM contacts+tags first, conversations sheets fill gaps     |
| schedule_rules                   | `teacher\|students[@HH:mm]`                     | bookings (مؤكد/مشترك/يحتاج تأكيد, from --from), then HEART  |
| lessons                          | `teacher\|students\|date or UTC start`          | hub_reports (completed), one-off bookings ≥ --from          |
| lesson_students / lesson_reports | `lessonKey\|studentKey`                         | hub_reports (primary), rep_reports, att                     |
| report_pdfs                      | report key                                      | zip `تقارير آيات البيان/<student>/*.pdf` → bucket `reports` |
| subscriptions / payments         | `student\|starts_on` / `sub\|paid_on\|amount`   | heart_subscriptions, FIN                                    |
| expenses                         | `month\|category\|note\|amount`                 | fin_aug, fin_sept, fin_expenses_tracker                     |
| message_templates / messages     | Meta name / wamid else `crm:<id>`               | CRM                                                         |

## Sources found in the export (2026-10-02)

`sources/headers*.ts` lists every tab read, with header → field maps and value notes;
`SKIPPED_TABS` and `EXCLUDED_FILES` list what is not read and why. Corrections to docs/06:

- HUB «تقارير الحلقات» (134 rows) contains all 60 REP rows and the PDF link: it is the primary
  report source; REP is cross-check only.
- `job-applications-clean.xlsx` is the owner's own job-search log, not academy applicants.
- BOOK «تقويم الحجوزات» is mostly `يحتاج تأكيد` (268 of 285); only 6 rows are مؤكد/مشترك.
- The PDFs are inside the zip (136 under «تقارير آيات البيان»), so they are copied from the zip,
  not downloaded by link. The three `Ayat Al Bayan -- <teacher>.xlsx` files are empty.
- CRM is multi-tenant: every read filters `account_id` (`CRM_ACCOUNT_ID`).

## Target DB

`db/target.ts` (`TargetDb`, `TargetTx`) over `postgres`, one connection; `db/sql.ts` builds the
SQL (identifiers whitelisted, values as params, jsonb objects as JSON text). `db/storage.ts`
uploads to Storage with the service role. Migration `20261001000160_import_log.sql` adds
`import_runs` and `import_items` (unique `(entity, natural_key)`); deploy it before the first
`apply` (a dry-run on a DB without it plans a first run). Migration
`20261001000161_students_code_reserve.sql` starts app-created student codes at AB-1000, leaving
AB-0001..0999 to the legacy codes; the dry-run still checks every legacy code
against the target and drops (with a review row) any code a target student already holds.
`apply` takes a session advisory lock before planning: one apply per target at a time.

## Tests

`pnpm turbo lint typecheck test --filter=@ab/migrate`. Pure logic (keys, values, rows, resolve,
diff, apply with a fake DB, SQL builders, config guard, CLI args) is unit-tested beside the code.
Every test runs with an invented teacher directory (`src/test-setup.ts`, via `vitest.config.mts`).
