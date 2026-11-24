# 31b — Oxlint: the one linter, rule mapping, baselines

Owner 2026-11-07: «go with oxlint»; owner 2026-11-24: «use oxlint and oxformat drop eslint and prettier».
Oxlint, type-aware through tsgolint, is the only linter; ESLint and its configs, plugins wiring,
`eslint-suppressions.json` files and the parity check are gone. Each package's `oxlint-suppressions.json`
is the only lint baseline.

Speed, same machine (4 cores, cloud session), whole repo, no cache: ESLint (every package, type-aware,
as `turbo lint` ran it) 712 s; Oxlint (every rule of every package, type-aware) 74 s. Before the move CI's
`verify (lint)` took 318 s with ESLint split over two machines.

## 1. How the config is built

- Each package states its own rules once, in **`lint.blocks.mjs`** (flat-config shape: `files`,
  `ignores`, `rules`; `react: true` for web and mobile). Helpers come from `@ab/config/lint`.
- **`oxlint.config.ts`** (repo root; editors find it by name) finds every `lint.blocks.mjs` and calls
  `compose()` of `@ab/config/oxlint` (`packages/config/oxlint/`): the core rules
  (`packages/config/oxlint/core-rules.json`), then per package, scoped to its folder:
  1. every file: `rules.js` `ALL` (hard, flow, date, fetch and selector rules, the presets' syntax
     rules) + `typed.js` `TYPED` (typescript-eslint's type-aware presets with their resolved options);
  2. `**/*.ts`: complexity 6; JS files (`js,mjs,cjs,jsx`): `JS_ONLY`; tests: `TEST_OFF` +
     `TYPED_TEST_OFF`; tests and `src/time/**`: no date restriction;
  3. React packages: `react.js` (hooks + React Compiler rules, browser globals, async JSX handlers);
  4. the package's own blocks (`convert.js`: `files` → `files`, `ignores` → `excludeFiles`, an
     ignores-only block → `ignorePatterns`, rule names per §2);
  5. last, plain JS files lose every type-aware rule.
- JS plugins: `ab` (`packages/config/oxlint/ab-plugin.js`: the repo's `ab/*` rules, the decorator-aware
  `ab/consistent-type-imports` (§3.2), and `ab/no-restricted-syntax`, `ab/no-dupe-args`, `ab/no-octal`,
  which Oxlint has no native version of), `stylistic` (`@stylistic/eslint-plugin`, for `max-len`) and
  `react-hooks-js` (`eslint-plugin-react-hooks`, for `config` and `gating`). Those two plugins are the
  only ESLint-ecosystem packages left; pnpm installs `eslint` only as their peer, no workspace depends
  on it.
- `pnpm lint` builds the workspace packages (type-aware rules read their types), runs Oxlint
  (`--type-aware --deny-warnings`, unused disable directives are errors) and holds the report to the
  baselines (§4). `pnpm lint:prune` does the same and lowers the counts.

## 2. Names

A block may name a rule as ESLint did: `@typescript-eslint/x` → `typescript/x` (except the extension
rules `no-empty-function` and `no-unused-expressions`, whose Oxlint version is the core rule);
`react-hooks/x` → `react/x` (native port; `config`, `gating` → `react-hooks-js/x`); `jsx-a11y/x` stays;
`max-len` → `stylistic/max-len`; `no-restricted-syntax` → `ab/no-restricted-syntax`; `no-dupe-args`,
`no-octal` → `ab/…`; core rules keep their name. `oxlintName()` (`packages/config/oxlint/convert.js`)
is the one table. Oxlint names pass through unchanged.

## 3. What the move had to settle

### 3.1 Type-aware ports that miss findings (closed by fixing the code)

Type-aware rules run in tsgolint (oxlint-tsgolint 7.0.2008 with oxlint 1.95.0, the latest when ESLint
went). A JS plugin gets no TypeScript program, so there is no fallback inside Oxlint. After the bump,
tsgolint still missed these findings typescript-eslint 8.71 reported (parity run, no suppressions):

| rule | ESLint | Oxlint | missed |
|---|---|---|---|
| `typescript/no-meaningless-void-operator` | 26 | 14 | 12 |
| `typescript/no-unnecessary-type-assertion` | 188 | 174 | 14 (43 with tsgolint 7.0.2005) |
| `typescript/prefer-optional-chain` | 36 | 17 (3 elsewhere) | 22 |

Nothing was turned off. Every violation ESLint reported for these rules (all 250, suppressed or not) was
fixed in the code before ESLint went, so nothing it caught stays hidden; the baselines hold none of them.
Patterns tsgolint still does not detect, which review has to catch until it does (bump and re-check:
a new finding shows as a new violation):

- `no-meaningless-void-operator`: `void` on an `await` in an async arrow body
  (`async () => void (await x())`), on a comma expression (`void (a(), await b())`) and on a
  conditional whose branches are void (`void (ok ? f() : undefined)`).
- `no-unnecessary-type-assertion`: an assertion the receiver does not need
  (`{ status: 'approved' as TemplateStatus }` inside `new Map(…)`, `{} as Record<string, number>` in a
  typed slot, `handler as (s: AppStateStatus) => void` where it already has that type), and an assertion
  that only feeds a generic's inference (`screen.getByRole('textbox') as HTMLInputElement`,
  `jest.requireMock('x') as {…}`, `res.json() as T`: write the type argument, `getByRole<T>(…)`).
  typescript-eslint's own autofix for the first kind can widen a literal and break the types: rewrite
  them with a typed helper, an annotation or `!= null` instead.
- `prefer-optional-chain`: a comparison after a guard, `!a || a.b !== c` and `a && a.b === c`
  (→ `a?.b !== c`, `a?.b === c`; equivalent only when `c` is never `undefined`: check, and use
  `a?.b == null` where the guard also covered `null`).

### 3.2 Stricter ports (Oxlint reports more)

| rule | extra findings | now |
|---|---|---|
| `typescript/consistent-type-imports` | 1 407 (api only) | **solved, rule on**: typescript-eslint skipped every file with a decorator when `emitDecoratorMetadata` is on; following Oxlint's native rule there would turn injected classes into `import type` and Nest would fail at boot. apps/api runs `ab/consistent-type-imports` (`packages/config/type-imports/`) instead of the native rule: the same checks, messages and fixes, but a type named where `emitDecoratorMetadata` emits it (a parameter of a decorated class's constructor, of a decorated method or one with a decorated parameter, a decorated method's return type, a decorated property's type; type arguments excluded, union members included) counts as a value use. It reports every type-only import elsewhere, decorated files included: 33 findings (ESLint's 28 + 5 it skipped), all fixed. Every other package keeps the native rule. |
| `react/purity` | 19 | `new Date()` during render; the React Compiler's check did not report these. Baselined. |
| `no-unsafe-optional-chaining` | 15 | looks through `(a?.b as T).c`. Baselined. |
| `typescript/explicit-module-boundary-types` | 14 | methods of a returned object literal (client-core). Baselined. |
| `typescript/no-deprecated` | 7 | also a deprecated property written in an object literal. Baselined. |
| `typescript/prefer-optional-chain` | 3 | other patterns than ESLint's; fixed. |
| `jsx-a11y/role-has-required-aria-props` | 2 | `<input type="checkbox" role="switch">`: a false positive. Baselined. |
| `no-restricted-globals` | 1 | `typeof fetch` in a type position. Baselined. |
| `typescript/unbound-method` | 1 | tools/migrate `plan/apply.ts`. Baselined. |

## 4. Baselines (`oxlint-suppressions.json`)

Oxlint has no bulk suppressions. Each package keeps `oxlint-suppressions.json`
(`{ file: { rule: { count } } }`, package-relative). `pnpm lint` writes Oxlint's JSON report
(`oxlint-report.json`) and `lint-gate.mjs --oxlint` holds **every file to its exact per-rule count**:
above it fails (a new violation, fix it); below it fails until pruned (`pnpm lint:prune`, then commit the
baselines: a count only goes down, an entry never appears); a finding outside every package or a parse
error always fails. Nothing writes a new entry (the one-time `--suppress-all` of the carry-over is
gone). On a PR, `pnpm guard:lint` also refuses any per-rule total above the base branch's (a count
raised by hand) and an entry whose file is gone.

## 5. Parity check (removed)

Until ESLint went, `pnpm lint:parity` compared ESLint's findings with Oxlint's and both configs file by
file; it is gone with ESLint. §3 and §8 keep what it measured.

## 6. Tests

The `ab/*` rule tests (`packages/config/*.test.js`, `type-imports/rule.test.js`) run every case list
under Oxlint's RuleTester (`oxlint/plugins-dev`, `rule-testers.js`). The config tests lint real code with
the Oxlint binary (`oxlint/testing/lint-code.js`) or resolve the composed config for a file
(`oxlint/resolve.js`). `tools/scripts/ci-checks/lint/**/*.test.mjs` cover the gate.

## 7. Editors

The Oxlint VS Code / Zed extension finds `oxlint.config.ts` by itself; turn on `"oxc.typeAware": true`
to see the type-aware rules while editing.

## 8. Mapping: every ESLint rule the repo ran, and where it runs now

Kept as the record of the move (measured with oxlint 1.90 before ESLint was removed). All errors.
«packages»: where the rule is on (`all` = the 20 linted packages). «findings»: ESLint's count (no
suppressions) = Oxlint's matching count; `+n stricter`: §3.2; **gap**: §3.1 (closed). The core rules
(`packages/config/oxlint/core-rules.json`, once `.oxlintrc.json`) are not listed.

| ESLint rule | packages | Oxlint rule | how | findings ESLint = Oxlint |
|---|---|---|---|---|
| `@typescript-eslint/await-thenable` | all but docs/design/brand/tools, config | `typescript/await-thenable` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/consistent-indexed-object-style` | all | `typescript/consistent-indexed-object-style` | native | 6 = 6 |
| `@typescript-eslint/consistent-type-definitions` | all | `typescript/consistent-type-definitions` | native | 648 = 648 |
| `@typescript-eslint/consistent-type-exports` | all but docs/design/brand/tools, config | `typescript/consistent-type-exports` | native, type-aware (tsgolint) | 7 = 7 |
| `@typescript-eslint/consistent-type-imports` | all | `typescript/consistent-type-imports`; apps/api: `ab/consistent-type-imports` | native; api: JS plugin (§3.2) | 44 = 44, +1407 stricter (api: 0, see §3.2) |
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
| `@typescript-eslint/no-meaningless-void-operator` | all but docs/design/brand/tools, config | `typescript/no-meaningless-void-operator` | native, type-aware (tsgolint) | **gap**: 12 missed; all fixed (§3.1) |
| `@typescript-eslint/no-misused-promises` | all but docs/design/brand/tools, config | `typescript/no-misused-promises` | native, type-aware (tsgolint) | 5 = 5 |
| `@typescript-eslint/no-misused-spread` | all but docs/design/brand/tools, config | `typescript/no-misused-spread` | native, type-aware (tsgolint) | 12 = 12 |
| `@typescript-eslint/no-mixed-enums` | all but docs/design/brand/tools, config | `typescript/no-mixed-enums` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/no-redundant-type-constituents` | all but docs/design/brand/tools, config | `typescript/no-redundant-type-constituents` | native, type-aware (tsgolint) | 6 = 6 |
| `@typescript-eslint/no-require-imports` | all | `typescript/no-require-imports` | native | same (no findings) |
| `@typescript-eslint/no-unnecessary-boolean-literal-compare` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-boolean-literal-compare` | native, type-aware (tsgolint) | 26 = 26 |
| `@typescript-eslint/no-unnecessary-condition` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-condition` | native, type-aware (tsgolint) | 163 = 163 |
| `@typescript-eslint/no-unnecessary-template-expression` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-template-expression` | native, type-aware (tsgolint) | 5 = 5 |
| `@typescript-eslint/no-unnecessary-type-arguments` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-type-arguments` | native, type-aware (tsgolint) | same (no findings) |
| `@typescript-eslint/no-unnecessary-type-assertion` | all but docs/design/brand/tools, config | `typescript/no-unnecessary-type-assertion` | native, type-aware (tsgolint) | **gap**: 45 missed, 14 after the bump; all fixed (§3.1) |
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
| `@typescript-eslint/prefer-optional-chain` | all but docs/design/brand/tools, config | `typescript/prefer-optional-chain` | native, type-aware (tsgolint) | **gap**: 22 missed; all fixed (§3.1) |
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
