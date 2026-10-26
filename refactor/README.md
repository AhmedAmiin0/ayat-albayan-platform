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
```

A move PR may also update a guard's path list in a test (for example the Meta callers whitelist): the pure-move
check accepts a string or anchored regex literal that changes exactly by a rename of the same diff.
