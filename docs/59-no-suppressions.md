# 59. No suppressions

A suppression says a rule is not being followed. So there are none: no disable or ignore comments, no
`@ts-` escapes, no cast or rename made only to quiet a rule, no rule switched off or loosened, and no new
baseline entry. Fix the code.

The entries already in `eslint-suppressions.json`, `oxlint-suppressions.json`, `refactor/guards/` and
`refactor/folder-cap/` are old debt. Lanes remove them; nothing adds to them.

## 1. What CI enforces

| Check | Fails on | Where |
|---|---|---|
| `pnpm guard:lint` | any count above the base branch's in an `eslint-suppressions.json` or `oxlint-suppressions.json`, per file and per rule (entries follow renamed files); a file or rule entry the base lacks; a per-rule total above the base's; a suppressions file in a workspace whose base has none; a file left as `{}` (delete it); an entry whose file is gone | guards job |
| `pnpm guard:baselines` | a new entry, a raised number or a new file under `refactor/guards/` (the layer table `packages.json` aside: rule 23) and `refactor/folder-cap/` | guards job |
| `pnpm guard:loosened` | never fails: a «lint rules loosened» annotation when the head sets a rule to `off`, `0` or `warn`, adds an ignore glob, a `syntaxExempt` or an `exempt` scope, or raises a numeric limit, in `packages/config`, any `lint.blocks.mjs` or `eslint.config`, `.oxlintrc.json`, `knip.json`, `.jscpd.json` or the `lint:ox` script. Such a PR merges only with the owner's go | guards job |
| ESLint `--max-warnings 0`, Oxlint | any violation not already in the package's suppressions file | verify job |

There is no one-time baseline. A PR that turns a rule on or tightens a limit brings that rule's violations
to zero in the same PR; `eslint --suppress-all`, `--suppress-rule` and the Oxlint gate's `--suppress-all`
are not used. A rule's CI check turns on only when the code already passes it.

Fixing an old entry still needs its prune commit: a red CI lint job prints the pruned
`eslint-suppressions.json` diff («Suppressions to prune») and the Oxlint row prints the pruned
`oxlint-suppressions.json` diff; commit them (cloud: `pnpm lint:prune`, `pnpm lint:oxfull -- --prune`).
A workspace whose suppressions file is gone never gets one back.

## 2. The debt (develop `be54ea650`)

| | Count |
|---|---|
| ESLint suppressions | 19,992 in 9,381 file/rule entries, 21 files |
| Oxlint suppressions | 21,357 in 9,985 file/rule entries, 21 files |
| Empty files (deleted with this doc) | `apps/family-mobile` oxlint, `apps/family-web` both, `packages/db` both |
| `refactor/guards` | knip 229, units 304 folders (416 units), queries 37 |
| `refactor/folder-cap` | 2 folders |
| Inline comments in source | 8 `oxlint-disable-next-line`, 3 `@ts-expect-error` (the other text matches are test fixtures of `guard:comments` and the two generated route trees) |

Largest ESLint rules: `max-len` 12,822 (about 38 % on comment lines), `complexity` 1,056,
`ab/module-boundaries` 1,048, `dot-notation` 728, `consistent-type-definitions` 603,
`ab/no-untyped-api-calls` 551, `ab/zod-inputs` 414, `ab/no-shape-checks` 372, `no-nested-ternary` 296,
`max-lines-per-function` 244, `no-restricted-syntax` 214. Oxlint alone adds 1,407
`typescript/consistent-type-imports` in `apps/api`.

By workspace (ESLint): api 7,097, staff-web 4,644, staff-mobile 4,112, e2e 829, shared 692,
migrate 453, web-kit 365, scripts 357, mobile-kit 301, client-core 250, wa-stub 229, money 201,
settings 126, schedule 123, catalog 77, google-stub 42, core 30, brand tools 28, config 22, i18n 9,
time 5.

## 3. Proof classes

Each fix PR states its class and proves it the class's way.

- **A. Formatting and type-only fixes that keep the AST**: long lines, `dot-notation`,
  `consistent-type-definitions`, `consistent-type-imports`, unnecessary assertions. Proof: the emitted
  JavaScript (or the AST without types and comments) is unchanged; `guard:comments` for comment sweeps.
- **B. Behaviour-preserving refactors with tests**: `complexity`, `max-depth`, `no-nested-ternary`,
  `max-lines-per-function`, `ab/module-boundaries`. Proof: tests cover the code before the change
  (written first when missing) and pass unchanged after it.
- **C. Boundary changes, reviewed one by one, test first**: `ab/zod-inputs`, `ab/no-shape-checks`,
  unchecked JSON, `ab/no-untyped-api-calls`, floating promises, `require-await`. Each changes what the
  code accepts or when it fails, so each site gets a failing test first (the bad input, the rejected
  promise) and its own review.

## 4. Order in each workspace

1. Comment sweep (`chore/comments-*`, rule 24): drops most comment-line `max-len` entries.
2. Unit move (`pnpm units:fold`): files reach their final paths before anything else touches them.
3. Format: long code lines (class A).
4. Autofix: `eslint --fix` for class A rules only, one rule per PR.
5. Class B.
6. Class C.
7. Delete the workspace's suppressions files once they are empty.

## 5. Not a fix

- a new cast or `as` to silence a type rule;
- `void` in front of a floating promise without handling its rejection;
- splitting a function into meaningless pieces to pass `max-lines-per-function` or `complexity`;
- moving logic into a test, a fixture or an exempt folder to dodge a limit;
- renaming a file into an exempt glob (`*.test.ts`, `*.gen.ts`, `testing/`);
- splitting a string or an identifier to dodge `max-len`.

**Warning, `consistent-type-imports` in `apps/api`.** An autofix may turn a class that a Nest constructor
injects into `import type`. Nest's dependency injection reads the class at runtime
(`emitDecoratorMetadata`), so the import must stay a value import. Typecheck stays green while the app
fails to boot. Fix those 1,407 sites by hand or with a fixer that skips constructor parameter types, and
let the api e2e boot prove it.
