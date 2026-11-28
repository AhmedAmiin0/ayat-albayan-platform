# Lane lint-zero: every suppression fixed, in one PR

The owner (2026-11-28) asked for every lint suppression to be fixed in one chunk, not in small PRs or batches. This lane also gives every file one class. On develop `51c67e8e9` there were about 10,800 suppression entries in 17 `oxlint-suppressions.json` files, and 79 files that declared 2+ classes.

The work goes into one branch, `lane/lint-zero`, and ends in one PR to develop. Parallel part sessions fix disjoint areas on their own branches, `wip/lint-zero/<part>`, which have no PR. An integrator session merges the parts into `lane/lint-zero` every hour. No PR is opened until every part is done, so the other lanes' CI is never held up by this lane.

## Parts

| part | branch | area |
|---|---|---|
| api-teaching | wip/lint-zero/api-teaching | apps/api/src/modules/teaching |
| api-messaging | wip/lint-zero/api-messaging | apps/api/src/modules/messaging |
| api-rest | wip/lint-zero/api-rest | the rest of apps/api |
| web-a | wip/lint-zero/web-a | apps/staff-web: src/features/{messaging,teaching,reporting}, src/components, src/lib, src/routes, src/test |
| web-b | wip/lint-zero/web-b | the rest of apps/staff-web |
| mobile | wip/lint-zero/mobile | apps/staff-mobile |
| packages-tools | wip/lint-zero/packages-tools | packages/*, e2e, tools/* |

A part edits only files in its area. A fix that needs a file outside the area (for example a shared helper in a package) goes in a commit whose message names that file. The integrator reviews it, and the owning part never edits that file in the same hour.

## What counts as done for a part

- Its area has no entries left in any `oxlint-suppressions.json`. Check with `pnpm lint:prune` and the oxlint report filtered to the area.
- No file in its area declares 2 or more classes.

## How to fix (docs/59 applies, and so does its «Not a fix» list)

- **Never quiet a rule.** That means no disable comment, `@ts-` escape, cast, rename or rule change made to silence it, and no new baseline entry. Fix the code.
- **No behaviour change.**
  - Existing tests stay unchanged and green, and their assertions are never edited to fit.
  - The api `routes.snap.txt` stays byte-identical.
  - Logic moved into a new pure function gets its own unit test (rule 4, rule 14).
- **Order inside an area:**
  1. Autofix: run `oxlint --fix` on the area, then `oxfmt`.
  2. Mechanical type rules.
  3. max-len.
  4. Structure: complexity, max-depth, no-nested-ternary, no-if-chains, max-lines-per-function. Use lookup maps, named predicates and small helpers (rule 11).
  5. module-boundaries and forbidden-imports. Import through `index.ts`, or move the code to where it belongs.
  6. The contract rules: no-untyped-api-calls, zod-inputs, no-shape-checks, no-unchecked-json. Use route objects, `call({ … })` and zod schemas, as docs/62 sets out.
- **max-len.** The rule already ignores strings, template literals, URLs and regexes, so what remains is code, JSX text and comments.
  - Code: let oxfmt wrap it, or split it (long class strings go into a `cn()` with several arguments).
  - JSX text: it belongs in i18n.
  - Comments: rule 24 decides. Delete a comment that only restates the code. Rewrite a useful one shorter, in English, with no dates, quotes or tool names.
- **One class per file.** The extra class moves to its own file beside the original (`x.error.ts`, `x.pipe.ts`, `x.fake.ts` …). The moved class keeps its name. A unit with 3+ files gets its own folder with `index.ts`. Test fixtures go one class per file under `tests/fixtures/`.
- **Files another lane is changing.** Skip any file that an open PR of another branch changes (`lane/contracts-*`, `lane/api-one-*`, `fix/portal-r2-*`, `feat/route-form-*`, `feat/expo-ui-*`, and the rest). Add it to the part's `SKIPPED` file (see Runs below) and come back once that PR has merged.
- **The rules in CLAUDE.md still bind every change:** 150 lines, 100 characters, 50-line functions, 3 parameters, imports through `index.ts`, absolute `@/` in apps only, no file extensions, one component per folder, types apart from logic, zod at boundaries, few `if` conditions.

## Runs

**Part session, hourly.**
1. Start: fetch, then check out `wip/lint-zero/<part>`. If it doesn't exist, create it from `origin/lane/lint-zero`. Then `git merge origin/lane/lint-zero`.
2. Exit at once if the newest commit on the part branch is under 55 minutes old and lacks the trailer `Run-State: done` (another session is working). Also exit if the part is done; say «done».
3. Work through the area in the order above for about 50 minutes. Commit by rule and by folder; each commit is `fix(<scope>): <what>`, or `refactor(<scope>): split … into one class per file`.
4. Before each push, run:
   - `pnpm i`;
   - `pnpm lint`, which must show no new violations. The suppression file may only shrink: run `pnpm lint:prune` and commit only the entries for your area;
   - typecheck and unit tests of the touched workspaces;
   - `pnpm guard:units guard:dup guard:knip guard:baselines guard:components guard:comment-language guard:escapes guard:packages guard:tsconfig`;
   - `node tools/scripts/ci-checks/folder-cap.mjs --strict`.
5. Push every 45 minutes. The last commit of the run ends with `Run-State: done`. Keep `refactor/lanes/lint-zero/SKIPPED-<part>.txt` up to date: one path per line, with the PR number that holds it.

**Integrator, hourly at :12.**
1. Merge every `wip/lint-zero/<part>` and `origin/develop` into `lane/lint-zero`.
2. Resolve each `oxlint-suppressions.json` conflict by regenerating the file with `pnpm lint:prune`, never by hand. Resolve code conflicts by keeping both sides' fixes.
3. Run the full check: `pnpm lint`, `pnpm turbo typecheck test`, and every `pnpm guard:*`. Fix whatever the merge broke, then push.
4. When every part is done and every SKIPPED list is empty:
   - turn on `max-classes-per-file: 1` at zero;
   - delete the suppression files that are now empty, and adjust the lint runner only as docs/59 allows;
   - add the line «one class per file» to rule 1 in `CLAUDE.md`.
   Then open the one PR, titled `fix(repo): remove every lint suppression and keep one class per file`.
5. Once the PR is open: keep it up to date with develop, fix red checks at the root, and never merge it. The owner's merge is done by hand.

## Never

- Never push to develop or to another lane's branch. Never run `gh pr merge` or label a PR.
- Never touch production, secrets, Supabase or the VPS.
- Never edit `.github/`, `refactor/guards/packages.json`, `lane-automerge.yml` or `tools/scripts/automerge/`.
- Never write a real name, phone number, email address or money figure anywhere, and no tool or assistant names.
- Every commit is authored and committed as `Ahmed Amin <86498649+AhmedAmiin0@users.noreply.github.com>`.
