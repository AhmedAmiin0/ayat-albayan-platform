# refactor/ — move maps and folder-cap allow-lists (docs/27)

- `moves/<id>.json` — one move map per refactor PR (`id` = the docs/27 §5a row, `seq` = its row number, so a replay
  applies the maps in queue order). `moves` lists files, `dir/` (moved whole) or one-folder globs (`dir/meta-*`);
  tests (`x.test.ts`, `x.spec.ts`) and `__snapshots__/` move with their file. The first run records the expanded
  `files` list, so the map still works once the sources are gone. Optional `barrels: [{ dir, files }]` writes
  `dir/index.ts` with named re-exports of those files only.
- `folder-cap/<app>.json` — the folders allowed over the cap today (api, web, mobile; packages and tools for lane D).
  One file per app, so the parallel lanes never edit the same file. Each move PR removes the folders it fixes.

```
node tools/scripts/ci-checks/move-module.ts refactor/moves/<id>.json   # apply one map (run twice = no diff)
node tools/scripts/ci-checks/move-module.ts --replay                   # an open feature branch follows every committed move
node tools/scripts/ci-checks/pure-move-check.mjs origin/develop        # only renames, module paths, barrels, path config
node tools/scripts/ci-checks/folder-cap.mjs [--strict] [--write <app>] # report crowded folders (strict in Wave F)
pnpm imports:absolute -- <workspace|paths…> [--write]                  # `../` → `@/` in api/web/mobile (dry run without --write)
```

Every move PR writes `@/` imports in the app files it creates or edits (docs/32 R12): move-module.ts already does for the
paths it rewrites; run `imports:absolute` on the rest, then `pnpm lint:prune` and `pnpm guard:lint -- --write`.

- `guards/` — baselines that may only shrink: `jscpd.json` (`pnpm guard:dup`), `knip.json` (`pnpm guard:knip`) and
  `lint.json` (`pnpm guard:lint`: per-rule totals of every package's `eslint-suppressions.json`, docs/31a §5). After a
  PR that fixes violations: `eslint . --prune-suppressions` in the package, then `pnpm guard:lint -- --write`.

A move PR may also update a guard's path list in a test (for example the Meta callers whitelist): the pure-move
check accepts a string or anchored regex literal that changes exactly by a rename of the same diff.
