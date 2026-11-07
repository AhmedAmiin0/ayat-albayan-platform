# 31b — ESLint → Oxlint: rule mapping, parity, baselines

Owner 2026-11-07: «go with oxlint» — move the whole lint to Oxlint (OXC) to speed CI, with **zero lost
coverage**. Measured before: develop CI run 42328736019, job `verify (lint)` = 318 s (Oxlint's first
pass + ESLint per package through turbo, type-aware). Oxlint with every rule of every package
(type-aware) takes about 50 s on a 4-core machine (this doc's measure; CI: job «lint parity (oxlint)»).

Status: **PR 1 (parity) only.** ESLint still gates CI (`verify (lint)`); Oxlint runs beside it with the
same rules, its own baseline and a parity check. **PR 2 (Oxlint only, ESLint removed) is blocked** until
§3 is empty: three type-aware rules where Oxlint's port (tsgolint) misses findings typescript-eslint
reports, plus one rule whose port is stricter in a way that would break the api (§3.2).

## 1. How the Oxlint config is built

- Each package states its own rules once, in **`lint.blocks.mjs`** (flat-config shape: `files`,
  `ignores`, `rules`; `react: true` for web and mobile). Its `eslint.config.js` spreads those blocks into
  `config()` / `reactConfig()` of `@ab/config/eslint`, exactly as before (ESLint's resolved config is
  byte-identical for all 10 483 files it lints: checked when the blocks moved). Helpers come from
  `@ab/config/lint` (no ESLint import).
- **`oxlint.full.config.ts`** (repo root) finds every `lint.blocks.mjs` and calls `compose()` of
  `@ab/config/oxlint` (`packages/config/oxlint/`): the `.oxlintrc.json` rules (Oxlint's first pass today),
  then per package, scoped to its folder and in eslint.js's order:
  1. every file: `rules.js` `ALL` (hard, flow, date, fetch and selector rules, the presets' syntax
     rules) + `typed.js` `TYPED` (the type-aware presets with today's options);
  2. `**/*.ts`: complexity 6; JS files (`js,mjs,cjs,jsx`): `JS_ONLY` (js recommended rules
     typescript-eslint turns off for TS); tests: `TEST_OFF` + `TYPED_TEST_OFF`; tests and `src/time/**`:
     no date restriction;
  3. React packages: `react.js` (hooks + React Compiler rules, browser globals, async JSX handlers);
  4. the package's own blocks (`convert.js`: `files` → `files`, `ignores` → `excludeFiles`, an
     ignores-only block → `ignorePatterns`, rule names per §2);
  5. last, plain JS files lose every type-aware rule (ESLint's `disableTypeChecked`).
- JS plugins (Oxlint loads ESLint-API plugins): `ab` (`packages/config/oxlint/ab-plugin.js`: the 10
  `ab/*` rules, the same rule objects ESLint runs, plus `ab/no-restricted-syntax`, `ab/no-dupe-args`,
  `ab/no-octal`), `stylistic` (`@stylistic/eslint-plugin`, for `max-len`) and `react-hooks-js`
  (`eslint-plugin-react-hooks`, for `config` and `gating`).
- `pnpm lint:oxfull` runs it (`--type-aware`, unused disable directives are errors) and holds the
  report to the baselines (§4). Type-aware rules read the workspace packages' types: build them first
  (`pnpm turbo build --filter='./packages/*'`), as turbo lint's `^build` does.

## 2. Names

`@typescript-eslint/x` → `typescript/x` (except the extension rules `no-empty-function` and
`no-unused-expressions`, whose Oxlint version is the core rule); `react-hooks/x` → `react/x` (native
port; `config`, `gating` → `react-hooks-js/x`); `jsx-a11y/x` stays; `max-len` → `stylistic/max-len`;
`no-restricted-syntax` → `ab/no-restricted-syntax`; `no-dupe-args`, `no-octal` → `ab/…`; core rules keep
their name. `oxlintName()` (`packages/config/oxlint/convert.js`) is the one table; the parity check and
the docs use it.


## 3. Rules that cannot move yet (PR 2 is blocked on these)

### 3.1 Missed findings: type-aware ports behind typescript-eslint 8.71 (`parity/gaps.json`)

Type-aware rules run in tsgolint (oxlint-tsgolint 7.0.2005; 7.0.2006, the latest, reports the same); a JS plugin gets no
TypeScript program, so there is no fallback inside Oxlint.

| rule | ESLint | Oxlint | missed | what tsgolint does not report |
|---|---|---|---|---|
| `typescript/no-meaningless-void-operator` | 26 | 14 | 12 | `void` on a call or an `await` in an async arrow body (`async () => void (await x())`) |
| `typescript/no-unnecessary-type-assertion` | 194 | 149 | 45 | an assertion to the contextual or a widened type (`{} as Record<string, number>` in a typed slot, `tz as string` on a string-literal union, `jest.requireMock(…) as {…}`) |
| `typescript/prefer-optional-chain` | 36 | 17 (3 elsewhere) | 22 | `!a \|\| a.b !== c` (→ `a?.b !== c`) |

Options (owner's call): (a) wait for tsgolint to catch up, bump, and drop the rule from `gaps.json` (the
parity job fails on a stale gap, so the list only shrinks); (b) keep ESLint for these three rules only
(a small type-aware ESLint pass: most of today's 318 s is the type-aware program build, so the saving
would shrink); (c) accept the narrower rule (drop coverage: needs the owner's explicit yes).

### 3.2 Stricter ports (Oxlint reports more; nothing lost, but each needs a decision)

| rule | extra findings | cause |
|---|---|---|
| `typescript/consistent-type-imports` | 1 407 (api only) | typescript-eslint skips a file with decorators when `emitDecoratorMetadata` is on (apps/api); Oxlint does not. Following Oxlint there would turn injected classes into `import type` and **Nest would fail at boot** (docs/31a §3.3). **Blocks PR 2.** Options: run typescript-eslint's own rule as a JS plugin with the decorator flags (keeps `eslint` installed as a library), or turn the rule off in apps/api (loses its 44 real findings there). |
| `react/purity` | 24 | `new Date()` during render; the React Compiler's check (ESLint) did not report these. Could run the plugin's own rule (`react-hooks-js/purity`) instead. |
| `no-unsafe-optional-chaining` | 15 | looks through `(a?.b as T).c`; ESLint's core rule does not (tests). |
| `typescript/explicit-module-boundary-types` | 14 | does not apply `allowTypedFunctionExpressions` to methods of a returned object literal (client-core). |
| `typescript/no-deprecated` | 7 | also reports a deprecated property written in an object literal. |
| `typescript/prefer-optional-chain` | 3 | other patterns than ESLint's (besides its misses, §3.1). |
| `jsx-a11y/role-has-required-aria-props` | 2 | `<input type="checkbox" role="switch">`: the native `checked` supplies `aria-checked`; a false positive. |
| `no-restricted-globals` | 1 | `typeof fetch` in a type position. |
| `typescript/unbound-method` | 1 | tools/migrate `plan/apply.ts`. |

These counts sit in the Oxlint baselines (§4), so they never fail; a new one fails like any violation.

### 3.3 Reported on another line (not a gap)

`complexity` on a decorated method (ESLint: the decorator line; Oxlint: the method) or an arrow
function (ESLint: `=>`; Oxlint: the start), and `jsx-a11y/role-supports-aria-props` on a multi-line
element: same file, same rule, same count; the parity check pairs them as `moved`.

## 4. Baselines (`oxlint-suppressions.json`)

Oxlint has no bulk suppressions. Each package keeps `oxlint-suppressions.json` next to
`eslint-suppressions.json`, in the same shape (`{ file: { rule: { count } } }`, package-relative,
Oxlint rule names). `pnpm lint:oxfull` writes Oxlint's JSON report (`oxlint-report.json`) and
`lint-gate.mjs --oxlint` holds **every file to its exact per-rule count**: above it fails (a new
violation, fix it); below it fails until pruned (`pnpm lint:oxfull -- --prune`, then commit the
baselines: a count only goes down, an entry never appears); a finding outside every package or a
parse error always fails. On a PR, `pnpm guard:lint` also refuses any per-rule total above the base
branch's (a count raised by hand), as it does for ESLint. The carried-over baseline (PR 1) is
today's ESLint suppressions under Oxlint names: 9 736 of 9 801 entries identical (after develop's
absolute-import sweep); the rest are the
§3.1 misses (lower) and §3.2 extras (higher). `--suppress-all` wrote it once; nothing else may.

## 5. Parity check (`pnpm lint:parity`, CI «lint parity (oxlint)»)

Runs ESLint over every package with no suppressions and Oxlint with `oxlint.full.config.ts`, both
timed (job summary). Fails when:

- **findings**: a finding ESLint reports is not one Oxlint reports (same file + line + rule after §2;
  same file + rule at most 3 lines away pairs as `moved`), beyond the reviewed count its rule has in
  `parity/gaps.json` (§3.1; unlisted: 0); a gap whose count is above what it misses fails too (lower
  it: the list only shrinks);
- **config**: for any file ESLint lints, a rule ESLint turns on is off in Oxlint's config for that file
  or has other options, or Oxlint does not lint the file at all (`oxlint --debug=files`);
- **packages**: a folder with an `eslint.config.*` and no `lint.blocks.mjs` (also in `pnpm lint:oxfull`),
  and a lint block key Oxlint would drop (`languageOptions`, a plugin other than `ab`: `convert.js` throws).

Known limits: config parity resolves Oxlint's overrides itself (`matchesGlob`, in order, as Oxlint
documents them), and compares written options only: a tsgolint port whose built-in defaults differ
from typescript-eslint's shows only through findings (§3). The `.oxlintrc.json` rules are outside it
(ESLint turns them off); `pnpm lint:ox` still runs them.

Details land in `lint-parity-report.json` (an artifact when the job fails).

## 6. Tests

The `ab/*` rule tests (`packages/config/*.test.js`) run every case list under ESLint's RuleTester and
Oxlint's (`oxlint/plugins-dev`, `rule-testers.js`). It already caught one difference:
`ab/no-parent-imports` read `TSImportType.argument`, which Oxlint's AST lacks; it now reads `source`
(typescript-eslint 8 and Oxlint). `packages/config/oxlint/*.test.js` cover the composition;
`tools/scripts/ci-checks/lint/{oxlint,parity}/*.test.mjs` the gate and the comparison.

## 7. Editors

The Oxlint VS Code / Zed extension reads `.oxlintrc.json` (the first pass) by default. To see every
rule while editing, point it at the full config (VS Code: `"oxc.configPath": "oxlint.full.config.ts"`
and `"oxc.typeAware": true`). PR 2 renames it to `oxlint.config.ts`, which editors find by themselves.

## 8. Mapping: every ESLint rule enabled today

All errors. «packages»: where ESLint turns it on (`all` = the 20 linted packages). «findings»: ESLint's
count (no suppressions) = Oxlint's matching count; `+n stricter`: §3.2; **gap**: §3.1. The
`.oxlintrc.json` rules already run in Oxlint (ESLint turned them off) and keep running there.

| ESLint rule | packages | Oxlint rule | how | findings ESLint = Oxlint |
|---|---|---|---|---|
| `@typescript-eslint/await-thenable` | all but docs/design/brand/tools, config | `typescript/await-thenable` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/consistent-indexed-object-style` | all | `typescript/consistent-indexed-object-style` | native | 6 = 6 |
| `@typescript-eslint/consistent-type-definitions` | all | `typescript/consistent-type-definitions` | native | 648 = 648 |
| `@typescript-eslint/consistent-type-exports` | all but docs/design/brand/tools, config | `typescript/consistent-type-exports` | native, type-aware (tsgolint) | 7 = 7 |
| `@typescript-eslint/consistent-type-imports` | all | `typescript/consistent-type-imports` | native | 44 = 44, +1407 stricter |
| `@typescript-eslint/dot-notation` | all but docs/design/brand/tools, config | `typescript/dot-notation` | native, type-aware (tsgolint) | 734 = 734 |
| `@typescript-eslint/explicit-module-boundary-types` | catalog, client-core, core, db, i18n, money, schedule, settings, shared, time | `typescript/explicit-module-boundary-types` | native | 15 = 15, +14 stricter |
| `@typescript-eslint/no-array-delete` | all but docs/design/brand/tools, config | `typescript/no-array-delete` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/no-base-to-string` | all but docs/design/brand/tools, config | `typescript/no-base-to-string` | native, type-aware (tsgolint) | 47 = 47 |
| `@typescript-eslint/no-confusing-void-expression` | all but docs/design/brand/tools, config | `typescript/no-confusing-void-expression` | native, type-aware (tsgolint) | 114 = 114 |
| `@typescript-eslint/no-deprecated` | all but docs/design/brand/tools, config | `typescript/no-deprecated` | native, type-aware (tsgolint) | 31 = 31, +7 stricter |
| `@typescript-eslint/no-duplicate-type-constituents` | all but docs/design/brand/tools, config | `typescript/no-duplicate-type-constituents` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/no-dynamic-delete` | all | `typescript/no-dynamic-delete` | native | 1 = 1 |
| `@typescript-eslint/no-empty-function` | all | `no-empty-function` | native | 15 = 15 |
| `@typescript-eslint/no-floating-promises` | all but docs/design/brand/tools, config | `typescript/no-floating-promises` | native, type-aware (tsgolint) | 59 = 59 |
| `@typescript-eslint/no-for-in-array` | all but docs/design/brand/tools, config | `typescript/no-for-in-array` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/no-generated-empty-object-type` | all but docs/design/brand/tools, config | `typescript/no-generated-empty-object-type` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/no-implied-eval` | all but docs/design/brand/tools, config | `typescript/no-implied-eval` | native, type-aware (tsgolint) | 1 = 1 |
| `@typescript-eslint/no-import-type-side-effects` | all | `typescript/no-import-type-side-effects` | native | 6 = 6 |
| `@typescript-eslint/no-meaningless-void-operator` | all but docs/design/brand/tools, config | `typescript/no-meaningless-void-operator` | native, type-aware (tsgolint) | **gap**: 12 missed (§3.1) |
| `@typescript-eslint/no-misused-promises` | all but docs/design/brand/tools, config | `typescript/no-misused-promises` | native, type-aware (tsgolint) | 5 = 5 |
| `@typescript-eslint/no-misused-spread` | all but docs/design/brand/tools, config | `typescript/no-misused-spread` | native, type-aware (tsgolint) | 12 = 12 |
| `@typescript-eslint/no-mixed-enums` | all but docs/design/brand/tools, config | `typescript/no-mixed-enums` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/no-redundant-type-constituents` | all but docs/design/brand/tools, config | `typescript/no-redundant-type-constituents` | native, type-aware (tsgolint) | 6 = 6 |
| `@typescript-eslint/no-require-imports` | all | `typescript/no-require-imports` | native | same (no findings) |
| `@typescript-eslint/no-unnecessary-boolean-literal-compare` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-boolean-literal-compare` | native, type-aware (tsgolint) | 26 = 26 |
| `@typescript-eslint/no-unnecessary-condition` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-condition` | native, type-aware (tsgolint) | 163 = 163 |
| `@typescript-eslint/no-unnecessary-template-expression` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-template-expression` | native, type-aware (tsgolint) | 5 = 5 |
| `@typescript-eslint/no-unnecessary-type-arguments` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-type-arguments` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/no-unnecessary-type-assertion` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-type-assertion` | native, type-aware (tsgolint) | **gap**: 45 missed (§3.1) |
| `@typescript-eslint/no-unnecessary-type-conversion` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-type-conversion` | native, type-aware (tsgolint) | 57 = 57 |
| `@typescript-eslint/no-unnecessary-type-parameters` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-type-parameters` | native, type-aware (tsgolint) | 2 = 2 |
| `@typescript-eslint/no-unsafe-argument` | all but docs/design/brand/tools, config | `typescript/no-unsafe-argument` | native, type-aware (tsgolint) | 15 = 15 |
| `@typescript-eslint/no-unsafe-assignment` | all but docs/design/brand/tools, config | `typescript/no-unsafe-assignment` | native, type-aware (tsgolint) | 22 = 22 |
| `@typescript-eslint/no-unsafe-call` | all but docs/design/brand/tools, config | `typescript/no-unsafe-call` | native, type-aware (tsgolint) | 5 = 5 |
| `@typescript-eslint/no-unsafe-enum-assignment` | all but docs/design/brand/tools, config | `typescript/no-unsafe-enum-assignment` | native, type-aware (tsgolint) | 7 = 7 |
| `@typescript-eslint/no-unsafe-enum-comparison` | all but docs/design/brand/tools, config | `typescript/no-unsafe-enum-comparison` | native, type-aware (tsgolint) | 1 = 1 |
| `@typescript-eslint/no-unsafe-member-access` | all but docs/design/brand/tools, config | `typescript/no-unsafe-member-access` | native, type-aware (tsgolint) | 16 = 16 |
| `@typescript-eslint/no-unsafe-return` | all but docs/design/brand/tools, config | `typescript/no-unsafe-return` | native, type-aware (tsgolint) | 11 = 11 |
| `@typescript-eslint/no-unsafe-unary-minus` | all but docs/design/brand/tools, config | `typescript/no-unsafe-unary-minus` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/no-unused-expressions` | all | `no-unused-expressions` | native | 1 = 1 |
| `@typescript-eslint/no-useless-default-assignment` | all but docs/design/brand/tools, config | `typescript/no-useless-default-assignment` | native, type-aware (tsgolint) | 15 = 15 |
| `@typescript-eslint/only-throw-error` | all but docs/design/brand/tools, config | `typescript/only-throw-error` | native, type-aware (tsgolint) | 13 = 13 |
| `@typescript-eslint/prefer-find` | all but docs/design/brand/tools, config | `typescript/prefer-find` | native, type-aware (tsgolint) | 1 = 1 |
| `@typescript-eslint/prefer-includes` | all but docs/design/brand/tools, config | `typescript/prefer-includes` | native, type-aware (tsgolint) | 6 = 6 |
| `@typescript-eslint/prefer-nullish-coalescing` | all but docs/design/brand/tools, config | `typescript/prefer-nullish-coalescing` | native, type-aware (tsgolint) | 10 = 10 |
| `@typescript-eslint/prefer-optional-chain` | all but docs/design/brand/tools, config | `typescript/prefer-optional-chain` | native, type-aware (tsgolint) | **gap**: 22 missed (§3.1) |
| `@typescript-eslint/prefer-promise-reject-errors` | all but docs/design/brand/tools, config | `typescript/prefer-promise-reject-errors` | native, type-aware (tsgolint) | 2 = 2 |
| `@typescript-eslint/prefer-reduce-type-parameter` | all but docs/design/brand/tools, config | `typescript/prefer-reduce-type-parameter` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/prefer-regexp-exec` | all but docs/design/brand/tools, config | `typescript/prefer-regexp-exec` | native, type-aware (tsgolint) | 2 = 2 |
| `@typescript-eslint/prefer-return-this-type` | all but docs/design/brand/tools, config | `typescript/prefer-return-this-type` | native, type-aware (tsgolint) | 1 = 1 |
| `@typescript-eslint/prefer-string-starts-ends-with` | all but docs/design/brand/tools, config | `typescript/prefer-string-starts-ends-with` | native, type-aware (tsgolint) | 4 = 4 |
| `@typescript-eslint/related-getter-setter-pairs` | all but docs/design/brand/tools, config | `typescript/related-getter-setter-pairs` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/require-await` | all but docs/design/brand/tools, config | `typescript/require-await` | native, type-aware (tsgolint) | 110 = 110 |
| `@typescript-eslint/restrict-plus-operands` | all but docs/design/brand/tools, config | `typescript/restrict-plus-operands` | native, type-aware (tsgolint) | 3 = 3 |
| `@typescript-eslint/restrict-template-expressions` | all but docs/design/brand/tools, config | `typescript/restrict-template-expressions` | native, type-aware (tsgolint) | 54 = 54 |
| `@typescript-eslint/return-await` | all but docs/design/brand/tools, config | `typescript/return-await` | native, type-aware (tsgolint) | 1 = 1 |
| `@typescript-eslint/switch-exhaustiveness-check` | all but docs/design/brand/tools, config | `typescript/switch-exhaustiveness-check` | native, type-aware (tsgolint) | 5 = 5 |
| `@typescript-eslint/unbound-method` | all but docs/design/brand/tools, config | `typescript/unbound-method` | native, type-aware (tsgolint) | 12 = 12, +1 stricter |
| `@typescript-eslint/use-unknown-in-catch-callback-variable` | all but docs/design/brand/tools, config | `typescript/use-unknown-in-catch-callback-variable` | native, type-aware (tsgolint) | 81 = 81 |
| `ab/forbidden-imports` | api, web, mobile | `ab/forbidden-imports` | JS plugin `ab` (this repo) | 147 = 147 |
| `ab/max-params` | all | `ab/max-params` | JS plugin `ab` (this repo) | 2 = 2 |
| `ab/module-boundaries` | api, web, mobile, catalog, client-core, core, money, schedule, settings, shared, time | `ab/module-boundaries` | JS plugin `ab` (this repo) | 1212 = 1212 |
| `ab/no-global-fetch` | api, web, mobile, docs/design/brand/tools, catalog, client-core, config, core, db, i18n, money, schedule, settings, shared, time, migrate, scripts | `ab/no-global-fetch` | JS plugin `ab` (this repo) | 2 = 2 |
| `ab/no-if-chains` | all | `ab/no-if-chains` | JS plugin `ab` (this repo) | 26 = 26 |
| `ab/no-parent-imports` | api, web, mobile | `ab/no-parent-imports` | JS plugin `ab` (this repo) | 1793 = 1793 |
| `ab/no-shape-checks` | all but e2e | `ab/no-shape-checks` | JS plugin `ab` (this repo) | 385 = 385 |
| `ab/no-unchecked-json` | all | `ab/no-unchecked-json` | JS plugin `ab` (this repo) | 69 = 69 |
| `ab/no-untyped-api-calls` | all | `ab/no-untyped-api-calls` | JS plugin `ab` (this repo) | 580 = 580 |
| `ab/zod-inputs` | api | `ab/zod-inputs` | JS plugin `ab` (this repo) | 414 = 414 |
| `complexity` | all | `complexity` | native | 1101 = 1101, 4 on another line |
| `constructor-super` | all | `constructor-super` | native | same (no findings) |
| `getter-return` | all | `getter-return` | native | same (no findings) |
| `jsx-a11y/alt-text` | web | `jsx-a11y/alt-text` | native | same (no findings) |
| `jsx-a11y/anchor-has-content` | web | `jsx-a11y/anchor-has-content` | native | same (no findings) |
| `jsx-a11y/anchor-is-valid` | web | `jsx-a11y/anchor-is-valid` | native | same (no findings) |
| `jsx-a11y/aria-activedescendant-has-tabindex` | web | `jsx-a11y/aria-activedescendant-has-tabindex` | native | same (no findings) |
| `jsx-a11y/aria-props` | web | `jsx-a11y/aria-props` | native | same (no findings) |
| `jsx-a11y/aria-proptypes` | web | `jsx-a11y/aria-proptypes` | native | same (no findings) |
| `jsx-a11y/aria-role` | web | `jsx-a11y/aria-role` | native | same (no findings) |
| `jsx-a11y/aria-unsupported-elements` | web | `jsx-a11y/aria-unsupported-elements` | native | same (no findings) |
| `jsx-a11y/autocomplete-valid` | web | `jsx-a11y/autocomplete-valid` | native | same (no findings) |
| `jsx-a11y/click-events-have-key-events` | web | `jsx-a11y/click-events-have-key-events` | native | 2 = 2 |
| `jsx-a11y/heading-has-content` | web | `jsx-a11y/heading-has-content` | native | same (no findings) |
| `jsx-a11y/html-has-lang` | web | `jsx-a11y/html-has-lang` | native | same (no findings) |
| `jsx-a11y/iframe-has-title` | web | `jsx-a11y/iframe-has-title` | native | same (no findings) |
| `jsx-a11y/img-redundant-alt` | web | `jsx-a11y/img-redundant-alt` | native | same (no findings) |
| `jsx-a11y/interactive-supports-focus` | web | `jsx-a11y/interactive-supports-focus` | native | 2 = 2 |
| `jsx-a11y/label-has-associated-control` | web | `jsx-a11y/label-has-associated-control` | native | 1 = 1 |
| `jsx-a11y/media-has-caption` | web | `jsx-a11y/media-has-caption` | native | 5 = 5 |
| `jsx-a11y/mouse-events-have-key-events` | web | `jsx-a11y/mouse-events-have-key-events` | native | same (no findings) |
| `jsx-a11y/no-access-key` | web | `jsx-a11y/no-access-key` | native | same (no findings) |
| `jsx-a11y/no-autofocus` | web | `jsx-a11y/no-autofocus` | native | 3 = 3 |
| `jsx-a11y/no-distracting-elements` | web | `jsx-a11y/no-distracting-elements` | native | same (no findings) |
| `jsx-a11y/no-interactive-element-to-noninteractive-role` | web | `jsx-a11y/no-interactive-element-to-noninteractive-role` | native | same (no findings) |
| `jsx-a11y/no-noninteractive-element-interactions` | web | `jsx-a11y/no-noninteractive-element-interactions` | native | 2 = 2 |
| `jsx-a11y/no-noninteractive-element-to-interactive-role` | web | `jsx-a11y/no-noninteractive-element-to-interactive-role` | native | same (no findings) |
| `jsx-a11y/no-noninteractive-tabindex` | web | `jsx-a11y/no-noninteractive-tabindex` | native | 2 = 2 |
| `jsx-a11y/no-redundant-roles` | web | `jsx-a11y/no-redundant-roles` | native | same (no findings) |
| `jsx-a11y/no-static-element-interactions` | web | `jsx-a11y/no-static-element-interactions` | native | 2 = 2 |
| `jsx-a11y/role-has-required-aria-props` | web | `jsx-a11y/role-has-required-aria-props` | native | 0 = 0, +2 stricter |
| `jsx-a11y/role-supports-aria-props` | web | `jsx-a11y/role-supports-aria-props` | native | 1 = 1, 1 on another line |
| `jsx-a11y/scope` | web | `jsx-a11y/scope` | native | same (no findings) |
| `jsx-a11y/tabindex-no-positive` | web | `jsx-a11y/tabindex-no-positive` | native | same (no findings) |
| `max-depth` | all | `max-depth` | native | 123 = 123 |
| `max-len` | all | `stylistic/max-len` | JS plugin `@stylistic/eslint-plugin` | 13529 = 13529 |
| `max-lines` | all | `max-lines` | native | same (no findings) |
| `max-lines-per-function` | all | `max-lines-per-function` | native | 261 = 261 |
| `no-class-assign` | all | `no-class-assign` | native | same (no findings) |
| `no-console` | api, web, mobile, catalog, client-core, config, core, db, i18n, money, schedule, settings, shared, time | `no-console` | native | 1 = 1 |
| `no-const-assign` | all | `no-const-assign` | native | same (no findings) |
| `no-dupe-args` | all | `ab/no-dupe-args` | JS plugin `ab` (this repo) | same (no findings) |
| `no-dupe-class-members` | all | `no-dupe-class-members` | native | same (no findings) |
| `no-dupe-keys` | all | `no-dupe-keys` | native | same (no findings) |
| `no-else-return` | all | `no-else-return` | native | same (no findings) |
| `no-func-assign` | all | `no-func-assign` | native | same (no findings) |
| `no-import-assign` | all | `no-import-assign` | native | same (no findings) |
| `no-lonely-if` | all | `no-lonely-if` | native | same (no findings) |
| `no-nested-ternary` | all | `no-nested-ternary` | native | 317 = 317 |
| `no-new-native-nonconstructor` | all | `no-new-native-nonconstructor` | native | same (no findings) |
| `no-obj-calls` | all | `no-obj-calls` | native | same (no findings) |
| `no-octal` | all | `ab/no-octal` | JS plugin `ab` (this repo) | same (no findings) |
| `no-redeclare` | all | `no-redeclare` | native | same (no findings) |
| `no-regex-spaces` | all | `no-regex-spaces` | native | same (no findings) |
| `no-restricted-globals` | api, web, mobile, docs/design/brand/tools, catalog, client-core, config, core, db, i18n, money, schedule, settings, shared, time, migrate, scripts | `no-restricted-globals` | native | 13 = 13, +1 stricter |
| `no-restricted-imports` | api, mobile | `no-restricted-imports` | native | same (no findings) |
| `no-restricted-properties` | all | `no-restricted-properties` | native | 6 = 6 |
| `no-restricted-syntax` | web, mobile | `ab/no-restricted-syntax` | JS plugin `ab` (this repo) | 231 = 231 |
| `no-setter-return` | all | `no-setter-return` | native | same (no findings) |
| `no-this-before-super` | all | `no-this-before-super` | native | same (no findings) |
| `no-undef` | all | `no-undef` | native | same (no findings) |
| `no-unreachable` | all | `no-unreachable` | native | same (no findings) |
| `no-unsafe-negation` | all | `no-unsafe-negation` | native | same (no findings) |
| `no-unsafe-optional-chaining` | all | `no-unsafe-optional-chaining` | native | 0 = 0, +15 stricter |
| `no-useless-assignment` | all | `no-useless-assignment` | native | same (no findings) |
| `no-with` | all | `no-with` | native | same (no findings) |
| `react-hooks/config` | web, mobile | `react-hooks-js/config` | JS plugin `eslint-plugin-react-hooks` | same (no findings) |
| `react-hooks/error-boundaries` | web, mobile | `react/error-boundaries` | native | same (no findings) |
| `react-hooks/exhaustive-deps` | web, mobile | `react/exhaustive-deps` | native | same (no findings) |
| `react-hooks/gating` | web, mobile | `react-hooks-js/gating` | JS plugin `eslint-plugin-react-hooks` | same (no findings) |
| `react-hooks/globals` | web, mobile | `react/globals` | native | same (no findings) |
| `react-hooks/immutability` | web, mobile | `react/immutability` | native | same (no findings) |
| `react-hooks/incompatible-library` | web, mobile | `react/incompatible-library` | native | same (no findings) |
| `react-hooks/no-deriving-state-in-effects` | web, mobile | `react/no-deriving-state-in-effects` | native | same (no findings) |
| `react-hooks/preserve-manual-memoization` | web, mobile | `react/preserve-manual-memoization` | native | same (no findings) |
| `react-hooks/purity` | web, mobile | `react/purity` | native | 0 = 0, +24 stricter |
| `react-hooks/refs` | web, mobile | `react/refs` | native | same (no findings) |
| `react-hooks/rules-of-hooks` | web, mobile | `react/rules-of-hooks` | native | same (no findings) |
| `react-hooks/set-state-in-effect` | web, mobile | `react/set-state-in-effect` | native | same (no findings) |
| `react-hooks/set-state-in-render` | web, mobile | `react/set-state-in-render` | native | same (no findings) |
| `react-hooks/static-components` | web, mobile | `react/static-components` | native | same (no findings) |
| `react-hooks/unsupported-syntax` | web, mobile | `react/unsupported-syntax` | native | same (no findings) |
| `react-hooks/use-memo` | web, mobile | `react/use-memo` | native | same (no findings) |
| `react-hooks/void-use-memo` | web, mobile | `react/void-use-memo` | native | same (no findings) |
