# refactor/ — move maps and folder-cap allow-lists (docs/27)

- `moves/<id>.json` — one move map per refactor PR (`id` = the docs/27 §5a row, `seq` = its row number, so a replay
  applies the maps in queue order). `moves` lists files, `dir/` (moved whole) or one-folder globs (`dir/meta-*`);
  tests (`x.test.ts`, `x.spec.ts`) and `__snapshots__/` move with their file. The first run records the expanded
  `files` list, so the map still works once the sources are gone. Optional `barrels: [{ dir, files }]` writes
  `dir/index.ts` with named re-exports of those files only.
- `folder-cap/<app>.json` — the folders allowed over the cap today (api, web, mobile; packages and tools for lane D).
  One file per app, so the parallel lanes never edit the same file. Each move PR removes the folders it fixes.

Run these in a cloud session (they need `pnpm i`), never on the owner's PC:

```
node tools/scripts/ci-checks/move-module.ts refactor/moves/<id>.json   # apply one map (run twice = no diff)
node tools/scripts/ci-checks/move-module.ts --replay                   # an open feature branch follows every committed move
node tools/scripts/ci-checks/pure-move-check.mjs origin/develop        # only renames, module paths, barrels, path config
node tools/scripts/ci-checks/folder-cap.mjs [--strict] [--write <app>] # report crowded folders (strict in Wave F)
pnpm imports:absolute -- <workspace|paths…> [--write]                  # `../` → `@/` in api/web/mobile (dry run without --write)
```

Every move PR writes `@/` imports in the app files it creates or edits (docs/32 R12): move-module.ts already does for the
paths it rewrites; run `imports:absolute` on the rest, then commit the pruned `eslint-suppressions.json` the red CI
lint job prints («Suppressions to prune») or run `pnpm lint:prune`. The commands in this file need `pnpm i`: run them
in a cloud session, never on the owner's PC (owner, 2026-11-01).

- `guards/` — lists that may only shrink: `knip.json` (`pnpm guard:knip`) and `queries.json` (`pnpm guard:queries`).
  A new entry fails; a fixed one passes and ci's `baselines` job drops it after a green push to `develop`, so a PR
  never edits them for a fix (move-module still rewrites the paths of moved files). The counts store nothing: on a PR,
  jscpd (`pnpm guard:dup`), folder cycles (`pnpm guard:cycles`) and the per-rule lint totals (`pnpm guard:lint`, summed
  over every package's `eslint-suppressions.json`, docs/31a §5) fail only above the base branch's own measure. After a
  PR that fixes violations: commit the `eslint-suppressions.json` diff the red CI lint job prints («Suppressions to
  prune»), or run `eslint . --prune-suppressions` in the package in a cloud session (never on the owner's PC); nothing
  else.

A move PR may also update a guard's path list in a test (for example the Meta callers whitelist): the pure-move
check accepts a string or anchored regex literal that changes exactly by a rename of the same diff.
