# 31a: strict TypeScript + lint rules

Status: **proposal**, part of refactor v2 (docs/31). Owner request, 2026-10-30: «put a strict rules for types and linting».

Measured by probe PR #393 (closed, not merged) on `develop` @ `012ffa06`, CI run 40971961301 (lint job 123790703101,
typecheck job 123790703132). Versions: TS 6.0.3, ESLint 10.11.0, typescript-eslint 8.71.0, eslint-plugin-react-hooks
7.1.1, eslint-plugin-jsx-a11y 6.10.2. The counts are a snapshot. PR 1 records the exact counts on its own base.

Nothing in this plan runs on the owner's PC. GitHub Actions and cloud routines run every command below.

## 1. Summary

|                         | today                                                   | after PR 1                                               |
| ----------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| tsc errors (new flags)  | n/a                                                     | 2, both fixed in PR 1 (tsc has no suppression mechanism)  |
| type-aware lint         | none (no `projectService`)                              | every TS file                                            |
| lint errors recorded    | 2,031 (`ab/module-boundaries` only)                     | + ≈3,093 new, in the same `eslint-suppressions.json` files |
| a new violation         | fails only for the rules that are errors today          | fails for every rule in §3                               |
| warnings                | ignored (`complexity`, `exhaustive-deps` never fail CI) | none left; `eslint . --max-warnings 0`                   |
| suppression file grows  | passes if someone edits the JSON                        | fails CI (`refactor/guards/lint.json`, §5.1)             |
| `eslint --fix` can clear | n/a                                                     | ≈1.7k of the ≈3.1k (L0 sweep, §6)                       |

## 2. TypeScript flags

| flag                                                 | `base.json` (web, shared, client-core, db, tools/\*, e2e, scripts) | `nest.json` (api)                         | `apps/mobile` | probe errors                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- | ------------- | ---------------------------------------------- |
| `strict`, `noUncheckedIndexedAccess`                 | on                                                                 | on                                        | on            | 0                                              |
| `noImplicitOverride`, `noFallthroughCasesInSwitch`   | on                                                                 | on                                        | **add**       | 0                                              |
| `noImplicitReturns`                                  | **add**                                                            | inherits                                  | **add**       | 1: api `crm-body.test.ts:34` (TS7030)          |
| `allowUnreachableCode: false`, `allowUnusedLabels: false` | **add**                                                       | inherits                                  | **add**       | 0                                              |
| `verbatimModuleSyntax`                               | **add**, replaces `isolatedModules`                                | **off**, keeps `isolatedModules`          | **add**       | 0                                              |
| `erasableSyntaxOnly`                                 | **add** (shared, client-core, tools/\* already had it)              | **off**                                   | **add**       | 1: mobile `src/inbox/composer/send-file.ts:30` (TS1294) |

- api is CommonJS, so `verbatimModuleSyntax` would turn every ESM import into TS1286/TS1287. Nest DI uses constructor
  parameter properties, which `erasableSyntaxOnly` forbids. `consistent-type-imports` (§3) covers api instead.
- mobile keeps `extends: expo/tsconfig.base` (it carries `customConditions: react-native` and `module: preserve`) and lists the flags itself.
- tools/scripts drops its own copy of the flags and extends `base.json`. Its `include` still covers only `move-module`.
  The other CI scripts are `.mjs` and get lint without types (§3).
- tools/\* and e2e run under Node type stripping. There, a type imported without `import type` fails at runtime with
  "does not provide an export named X". `verbatimModuleSyntax` makes tsc reject it first.
- The two fixes: an explicit `return` in the api test, and a field plus an assignment instead of the parameter property in `send-file.ts`.

## 3. Lint rules

### 3.1 Shared factory, every package (`packages/config/eslint.js`)

`config(root, ...extra)` and `reactConfig(root, ...extra)`; `root` is `import.meta.dirname`. The probe ran this shape.
"new" marks a change made after the probe; §4 shows what it removes.

| setting                                     | value                                                                                                  | why, probe count                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| presets                                     | `js.recommended`, `tseslint.configs.strictTypeChecked` + `stylisticTypeChecked` (today: `strict`)       | enables the rules that need types                                    |
| parser                                      | `projectService: { allowDefaultProject: ['*.mts'] }`, `tsconfigRootDir: root`                           | `vitest.config.mts` (api, migrate) is in no tsconfig; 0 parse errors |
| last block, `**/*.{js,mjs,cjs}`             | `tseslint.configs.disableTypeChecked`                                                                  | eslint and jest configs, tools/scripts `.mjs`                        |
| `linterOptions`                             | `reportUnusedDisableDirectives: 'error'` (new)                                                         | 1, `students.mapper.ts:45`, deleted in PR 1                          |
| kept                                        | `max-lines` 150, `max-params` 3, `no-explicit-any`, `no-non-null-assertion`, `no-extraneous-class` (decorators allowed) | 0, except 3 in tools/scripts (linted for the first time) |
| `complexity`                                | 10, warn → **error**                                                                                   | 239                                                                  |
| `max-depth`                                 | 3                                                                                                      | 14                                                                   |
| `no-console`                                | error (off in tools/\*, e2e)                                                                           | 2 (mobile)                                                           |
| `eqeqeq`                                    | `always`, `{ null: 'ignore' }`                                                                         | 0                                                                    |
| `restrict-template-expressions`             | `allowNumber` only                                                                                     | 63                                                                   |
| `prefer-nullish-coalescing`                 | `ignorePrimitives: { string: true }`                                                                   | `name \|\| 'fallback'` is meant for `''`                             |
| `no-confusing-void-expression`              | `ignoreArrowShorthand: true`                                                                           | 116                                                                  |
| `switch-exhaustiveness-check`               | `requireDefaultForNonUnion: true`                                                                      | a new student status or state-machine member must be handled         |
| `consistent-type-imports`                   | `prefer: 'type-imports'`, `fixStyle: 'separate-type-imports'`, plus `no-import-type-side-effects`, `consistent-type-exports` | 45 / 10 / 8                                  |
| `no-unused-vars`                            | `^_` for args and vars, `caughtErrors: 'all'`, `ignoreRestSiblings`                                    | removes the only `eslint-disable` for it                             |
| `no-floating-promises`                      | `allowForKnownSafeCalls`: `node:test` `test`, `describe`, `it`, `suite` (new)                          | the 15 tools/scripts hits are top-level `test()` calls               |
| `non-nullable-type-assertion-style`         | **off** (new)                                                                                          | its fix writes `x!`, which `no-non-null-assertion` bans; 97          |
| tests (`TESTS` glob, now exported from `eslint-boundaries.js`) | off: `require-await` (new), `unbound-method`, `no-unsafe-assignment`, `-member-access`, `-call`, `-argument`, `-return`. Still on: `no-floating-promises`, `no-misused-promises` | fakes implement async interfaces with no `await` (1,776 hits); Fastify inject `.json()` is untyped |

### 3.2 React (web, mobile)

| setting                                       | value                                                                                         | probe count            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------- |
| `react-hooks` `recommended-latest`            | as today: `rules-of-hooks` and the React Compiler rules are errors                            | 0                      |
| `react-hooks/exhaustive-deps`                 | warn → **error**                                                                              | 0                      |
| `react-hooks/no-deriving-state-in-effects`    | error (off in the plugin preset)                                                              | 0, rule not yet proven to fire |
| `no-misused-promises`                         | `checksVoidReturn: { attributes: false }`                                                     | async `onPress`/`onClick` allowed |
| `noRawEffect(files)` (new helper)             | `no-restricted-syntax` on `useEffect`/`useLayoutEffect` calls, bare or `React.`; allowed in `use-*.ts(x)` and `hooks/` | web 41, mobile 25 |

`noRawEffect` uses `no-restricted-syntax` on purpose. Flat config replaces rule options per block, so a second
`no-restricted-imports` block would silently drop mobile's `AppText` and feature-index options and api's settings-reader option.

PR 1 also adds the owner's «avoid before React 19 practices» (2026-10-30) to the same `no-restricted-syntax` list
(`reactRestrictions` in `packages/config/eslint-react.js`, which replaces `noRawEffect`; one list per file, the
effect block repeats the others so neither drops them). All of them count under one key, `no-restricted-syntax`.

| rule                                                       | web (React 18.3)                         | mobile (React 19.2) |
| ---------------------------------------------------------- | ---------------------------------------- | ------------------- |
| no `useMemo` / `useCallback` / `memo` (import or `React.x`) | error; React Compiler on (`reactCompilerPreset({ target: '18' })` + `react-compiler-runtime`) | error; React Compiler on (`app.json` `experiments.reactCompiler`, Babel only, OTA-safe) |
| no `forwardRef` (ref is a prop)                            | after the React 19 upgrade               | error               |
| `use(Context)`, not `useContext`                           | after the React 19 upgrade               | error               |
| `<Context value>`, not `<Context.Provider>`                | after the React 19 upgrade               | error               |
| raw `useEffect` / `useLayoutEffect` outside `use-*.ts(x)` and `hooks/` | error (`.tsx`)               | error (`.tsx`)      |

### 3.3 Per package

| package                       | on top of the factory                                                                                                   | off              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------- |
| api                           | boundaries, settings-reader restriction, `parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true }` | n/a              |
| web                           | `reactConfig`, boundaries, `jsx-a11y` `flatConfigs.recommended` on `src/**/*.tsx` with `aria-role: { ignoreNonDOM: true }` (new), `noRawEffect` | n/a |
| mobile                        | `reactConfig`, boundaries, `AppText` + feature-index restrictions, `noRawEffect` on `src/` and `app/`                   | n/a              |
| shared, client-core, db       | boundaries (not db), `explicit-module-boundary-types` on `src/` outside `TESTS`; db keeps `src/types.ts` out of lint (still type-checked) | n/a |
| migrate, wa-stub, google-stub | factory                                                                                                                 | `no-console`     |
| tools/scripts                 | factory; first lint ever: `eslint.config.js`, a `lint` script, devDeps `@ab/config` + `eslint`                          | `no-console`     |
| e2e                           | factory; `no-floating-promises` catches a Playwright call without `await`                                               | `no-console`     |

The api `parserOptions` stop `consistent-type-imports` from turning an injected class into `import type`. That change
would make TypeScript emit `Object` in `design:paramtypes`, and Nest would fail at bootstrap, not at typecheck.
`explicit-module-boundary-types` checks functions only, so the 177 exported zod schemas need no annotation.
Every package's `lint` script becomes `eslint . --max-warnings 0`.

## 4. Measured violations (probe)

`n (mt)` = n errors, m of them in test files. `c-core` = client-core, `g-stub` = google-stub. PR 1 is the estimated
count PR 1 records after the "new" settings of §3. Fix lane: L0 `--fix` sweep, L1 rule suggestion with review, L2 by hand (§6).

| rule                                      | total | api        | web        | mobile     | shared   | c-core   | migrate   | wa-stub | g-stub | scripts  | e2e      | PR 1   | fix     |
| ----------------------------------------- | ----- | ---------- | ---------- | ---------- | -------- | -------- | --------- | ------- | ------ | -------- | -------- | ------ | ------- |
| require-await                             | 1887  | 955 (912t) | 214 (208t) | 618 (598t) | 7 (7t)   | 28 (28t) | 34 (23t)  | 17      | 14     | -        | -        | 111    | L2      |
| dot-notation                              | 757   | 129 (86t)  | 133 (31t)  | 86 (27t)   | 35 (6t)  | 1        | 239 (43t) | 60 (1t) | 1      | -        | 73 (54t) | 757    | L0      |
| consistent-type-definitions               | 668   | 354 (46t)  | 210 (6t)   | 40 (6t)    | 16       | 3        | 2 (1t)    | 7 (6t)  | 1      | -        | 35 (17t) | 668    | L0      |
| complexity                                | 239   | 43         | 97 (1t)    | 52         | 6        | 5        | 10        | 3 (1t)  | 1      | 13 (1t)  | 9 (8t)   | 239    | L2      |
| no-unnecessary-type-assertion             | 204   | 37 (23t)   | 121 (110t) | 26 (16t)   | 15 (12t) | 2 (2t)   | 1         | -       | -      | -        | 2 (2t)   | 204    | L0      |
| no-unnecessary-condition                  | 168   | 76 (10t)   | 52 (21t)   | 30 (3t)    | 3 (1t)   | -        | 4 (1t)    | -       | -      | -        | 3 (1t)   | 168    | L2      |
| no-confusing-void-expression              | 116   | 14 (2t)    | 46 (5t)    | 52 (10t)   | -        | 3        | -         | -       | -      | -        | 1        | 116    | L1      |
| non-nullable-type-assertion-style         | 97    | 5 (4t)     | 62 (62t)   | 24 (24t)   | 2        | -        | 1 (1t)    | 1       | 1      | -        | 1 (1t)   | 0, off | n/a     |
| use-unknown-in-catch-callback-variable    | 81    | 43 (43t)   | -          | -          | -        | -        | -         | -       | -      | -        | 38 (36t) | 81     | L1      |
| no-floating-promises                      | 74    | 0          | 29 (29t)   | 30 (27t)   | -        | -        | -         | -       | -      | 15 (15t) | 0        | 59     | L2 first |
| raw `useEffect` (no-restricted-syntax)    | 66    | -          | 41         | 25         | -        | -        | -         | -       | -      | -        | -        | 66     | L2      |
| restrict-template-expressions             | 63    | 13 (7t)    | 10 (9t)    | 16 (11t)   | 3        | -        | 8 (1t)    | 1       | 1 (1t) | -        | 11 (9t)  | 63     | L2      |
| no-unnecessary-type-conversion            | 58    | 53 (1t)    | 1 (1t)     | -          | 2        | -        | 1         | -       | -      | -        | 1 (1t)   | 58     | L1      |
| no-base-to-string                         | 49    | 5 (5t)     | 14 (7t)    | 3          | 1 (1t)   | 2 (2t)   | 9         | 15      | -      | -        | -        | 49     | L2      |
| consistent-type-imports                   | 45    | 29 (26t)   | 2 (2t)     | 13 (11t)   | -        | -        | -         | -       | -      | -        | 1        | 45     | L0      |
| jsx-a11y/\* (10 rules, aria-role 19)      | 39    | -          | 39 (9t)    | -          | -        | -        | -         | -       | -      | -        | -        | ≈20    | L2      |
| prefer-optional-chain                     | 36    | 17 (1t)    | 8          | 4          | 2        | 1        | 2         | 1       | -      | 1        | -        | 36     | L0      |
| no-deprecated                             | 31    | 9 (3t)     | 8 (1t)     | 10 (6t)    | 4        | -        | -         | -       | -      | -        | -        | 31     | L2/keep |
| no-meaningless-void-operator              | 30    | 10 (2t)    | 5          | 13 (11t)   | -        | 2        | -         | -       | -      | -        | -        | 30     | L1      |
| no-unnecessary-boolean-literal-compare    | 26    | 14         | 1          | 7 (4t)     | 2        | -        | 2         | -       | -      | -        | -        | 26     | L0      |
| no-unsafe-\* (assignment 23, member-access 16, argument 15, return 11, call 5) | 70 | 20 | 13 | 32 | 1 | -  | -         | -       | -      | 2        | 2        | 70     | L2      |
| explicit-module-boundary-types            | 15    | -          | -          | -          | 3        | 12       | -         | -       | -      | -        | -        | 15     | L2      |
| no-empty-function                         | 15    | 4 (3t)     | 4 (4t)     | 4 (3t)     | -        | -        | 3 (2t)    | -       | -      | -        | -        | 15     | L2      |
| no-useless-default-assignment             | 15    | -          | -          | 15         | -        | -        | -         | -       | -      | -        | -        | 15     | L1      |
| unbound-method                            | 15    | -          | 5          | 10         | -        | -        | -         | -       | -      | -        | -        | 15     | L2      |
| max-depth                                 | 14    | 3          | -          | -          | -        | -        | -         | -       | -      | 11 (1t)  | -        | 14     | L2      |
| only-throw-error                          | 13    | 1          | 12         | -          | -        | -        | -         | -       | -      | -        | -        | 13     | L2 first |
| no-misused-spread                         | 12    | 1          | 4 (4t)     | -          | 3        | -        | 2         | -       | 1      | -        | 1        | 12     | L2      |
| prefer-nullish-coalescing                 | 10    | 1          | 9          | -          | -        | -        | -         | -       | -      | -        | -        | 10     | L1      |
| no-import-type-side-effects               | 10    | 7 (2t)     | 3          | -          | -        | -        | -         | -       | -      | -        | -        | 10     | L0      |
| 24 rules under 10 hits each (below)       | 77    |            |            |            |          |          |           |         |        |          |          | 77     | mixed   |
| **total**                                 | **5000** | 1865    | 1150       | 1125       | 115      | 60       | 328       | 108     | 20     | 50       | 179      | **≈3,093** |     |
| **PR 1, per package**                     |       | 948        | 861        | 503        | 106      | 32       | 304       | 107     | 19     | 35       | 178      |        |         |

Under 10 hits: consistent-type-exports 8 (shared), no-unsafe-enum-assignment 7, switch-exhaustiveness-check 6 (api 2,
web 2, shared 1, migrate 1, L2 first), no-redundant-type-constituents 6, prefer-includes 6, consistent-indexed-object-style 6,
prefer-string-starts-ends-with 5, no-unnecessary-template-expression 5, no-misused-promises 5 (L2 first), restrict-plus-operands 3,
no-console 2 (mobile `i18n/locale-switch.ts`, `push/registerPush.ts`), no-regex-spaces 2, max-params 2 (scripts `.mjs`),
no-unnecessary-type-parameters 2, prefer-promise-reject-errors 2, prefer-regexp-exec 2, max-lines 1 (scripts
`compose.test.mjs`), and 1 each: no-unused-expressions, no-dynamic-delete, prefer-find, no-implied-eval,
no-unsafe-enum-comparison, prefer-return-this-type, return-await.

- 0 hits: `eqeqeq`, `exhaustive-deps`, `no-deriving-state-in-effects`, parse errors, stale suppressions. 1 warning: the
  unused `eslint-disable` in `students.mapper.ts:45`.
- `no-floating-promises` found nothing in api app code. Jobs, the outbox and WhatsApp sends already await or `void` every promise.
- aria-role: every sampled hit is our own component's `role="admin"` / `role="teacher"` prop
  (`StudentProfilePage.tsx:115`, `ReportFormPage.test.tsx:17`). `ignoreNonDOM` skips those, hence ≈20.
- ESLint marked 1,816 of the 5,000 as `--fix`-able. 97 of those were `non-nullable-type-assertion-style`, which is now off.
- The probe's lint job took about 5 minutes with `NODE_OPTIONS=--max-old-space-size=6144` and turbo `--concurrency=3`.

## 5. Rollout

### 5.1 PR 1: every rule on as an error, today's violations recorded

| file(s)                                                       | change                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/config/eslint.js`, `eslint-boundaries.js`           | §3.1 and §3.2; export `TESTS`; `noRawEffect`                                               |
| `packages/config/tsconfig/{base,nest}.json`, `apps/mobile/tsconfig.json`, `tools/scripts/tsconfig.json` | §2                                               |
| every `eslint.config.*` (12) and every `lint` script          | pass `import.meta.dirname`, §3.3 blocks, `--max-warnings 0`                                |
| `tools/scripts/{eslint.config.js,package.json}`               | first lint config, `lint` script, devDeps                                                  |
| `apps/web/package.json`, `pnpm-lock.yaml`                     | `eslint-plugin-jsx-a11y` 6.10.2; lockfile written by a CI job or cloud routine. Its peer range stops at ESLint 9; it loaded and reported under 10.11 in the probe. Add a `peerDependencyRules.allowedVersions` entry if pnpm warns |
| `crm-body.test.ts:34`, `send-file.ts:30`, `students.mapper.ts:45` | the 2 tsc fixes; delete the unused directive                                           |
| `*/eslint-suppressions.json` (4 today, 6 new: client-core, migrate, wa-stub, google-stub, scripts, e2e) | `eslint . --suppress-all` per package, run in CI |
| `refactor/guards/lint.json`, `tools/scripts/ci-checks/lint/lint-gate.mjs` (+ test; own folder: `ci-checks/` is at the 12-file cap), root `guard:lint`, `guards` job | per-rule totals summed over every suppressions file. Fails when a total grows, a rule is missing, or the baseline is stale (then `pnpm guard:lint -- --write`). Same shape as `jscpd-gate` and `knip-gate`. `ab/module-boundaries` (2,031) gets the same check |
| `.github/workflows/ci.yml`                                    | the lint row gets `NODE_OPTIONS=--max-old-space-size=6144` and `--concurrency=3`           |

PR 1 changes every tsconfig, so its CI runs the full e2e set, including the api boot. In-flight branches rebase onto it
and fix the violations they add; that is the point of PR 1.

The gate counts per rule across the repo, not per file. ESLint already enforces per-file counts, and a per-file gate
would fail on every file move. The known gap: a PR can fix one violation and add another of the same rule elsewhere,
and the totals stay equal. Review catches that.

### 5.2 Order

| step | PR                     | contents                                                                                                   | lands when                                   |
| ---- | ---------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1    | PR 1                   | §5.1                                                                                                       | CI green                                     |
| 2    | suppressions follow moves | `move-module` renames the moved files' keys in `eslint-suppressions.json` (a cross-package move moves the entry to the other package's file); `pure-move-check` accepts those hunks; unit tests | before the next docs/31 move PR. Without it, a moved file's suppressed violations come back as new errors and its old keys fail as stale |
| 3    | L0 `--fix` sweep       | one PR per package, api last                                                                               | no docs/31 lane branch open on that package  |
| 4    | L1 + L2                | inside the docs/31 lanes                                                                                   | with each lane                               |
| 5    | queued                 | import-cycle guard, `jsx-no-leaked-render` (§7)                                                            | after a probe measures them                  |

### 5.3 How a count shrinks

```
eslint . --fix                    # L0 only
eslint . --prune-suppressions     # drop the entries this PR fixed; ESLint fails on stale entries anyway
pnpm guard:lint -- --write        # lower refactor/guards/lint.json; the gate fails if this is skipped
```

A conflict in an `eslint-suppressions.json`: take develop's side, then re-run `--prune-suppressions` on the merge result.

## 6. Fix lanes

| lane | rules                                                                                                                                                                              | how                                                                                                                       | where                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| L0   | dot-notation 757, consistent-type-definitions 668, no-unnecessary-type-assertion 204, consistent-type-imports 45, prefer-optional-chain 36, no-unnecessary-boolean-literal-compare 26, no-import-type-side-effects 10, consistent-type-exports 8, the small fixable ones (≈1.7k in all) | `eslint --fix`, then typecheck. An `interface` has no implicit index signature, so a type passed as `Json` or `Record<string, unknown>` stays a `type` and keeps its suppression. The api PR must pass e2e (Nest boot, decorator metadata) | one sweep PR per package (step 3)               |
| L1   | no-confusing-void-expression 116, use-unknown-in-catch-callback-variable 81, no-unnecessary-type-conversion 58, no-meaningless-void-operator 30, no-useless-default-assignment 15, prefer-nullish-coalescing 10 | ESLint suggestions, applied file by file and reviewed (`??` changes behaviour for `0` and `false`)                       | the docs/31 lane that owns the folder            |
| L2 first | no-floating-promises 59 (unawaited `act`/`userEvent` in web and mobile tests, a flake source), only-throw-error 13, switch-exhaustiveness-check 6, no-misused-promises 5, prefer-promise-reject-errors 2, no-implied-eval 1 | by hand; these are bug classes                                                                                          | first PRs of each lane                           |
| L2   | complexity 239, no-unnecessary-condition 168, require-await 111, no-unsafe-\* 70, raw `useEffect` 66, restrict-template-expressions 63, no-base-to-string 49, no-deprecated 31, jsx-a11y ≈20, explicit-module-boundary-types 15, unbound-method 15, max-depth 14, the rest | by hand: split functions; `unknown` + zod parse at the boundary for no-unsafe-\*; move effects into named hooks; `String()` or a format helper in messages. Never fix no-unnecessary-condition by deleting a `?.` on database or API data: RLS can hide an embedded row the generated types call non-null, so make the row type nullable instead | the lane's non-move PRs (`pure-move-check` rejects any other hunk in a move PR) |
| keep | no-deprecated where the replacement needs a native rebuild (mobile, APK runtime 0.3.0, so OTA cannot ship it); `type` aliases that need an index signature                         | the suppression stays until the next native build                                                                        | n/a                                              |

## 7. Not adopted

| rule / flag                                         | why                                                                                                                                                 |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exactOptionalPropertyTypes`                        | about 4.5k `?:`. Supabase Insert/Update types are `field?: T \| null` without `\| undefined`, so every conditional `undefined` in an insert fails, and so do `prop={c ? v : undefined}` and TanStack search params. tsc has no baseline, so it is all or nothing |
| `noPropertyAccessFromIndexSignature`                | forces `process.env['X']` (36 reads), bracket access on Supabase `Json` and `z.record` values, and fights `dot-notation`. A typed env module is the real fix |
| `noUnusedLocals`, `noUnusedParameters`              | duplicate `no-unused-vars` and knip, and would block typecheck with no baseline                                                                     |
| `isolatedDeclarations`                              | each of the 177 exported zod schemas would need an explicit `ZodObject<...>` type, which breaks `z.infer`. `explicit-module-boundary-types` covers functions |
| `verbatimModuleSyntax`, `erasableSyntaxOnly` on api | §2                                                                                                                                                  |
| `non-nullable-type-assertion-style`                 | its fix writes `x!` (CLAUDE.md rule 3)                                                                                                              |
| `strict-boolean-expressions`                        | too many hits for its value; `jsx-no-leaked-render` (queued) covers the one crash it would catch, `{count && <View/>}` on React Native             |
| `explicit-function-return-type`                     | components and Nest handlers infer their return types                                                                                              |
| `max-lines-per-function`, `max-statements`, `max-nested-callbacks` | `max-lines` 150 + `complexity` 10 + `max-depth` 3 already bound functions; deep nesting only happens in tests                       |
| `no-unsafe-type-assertion`                          | about 1.6k `as` casts (api 825, web 488, mobile 262). Revisit when no-unsafe-\* is at 0                                                             |
| an import-order rule                                | it rewrites every file. If wanted, one `--fix` run with no branches open, not a rule with a baseline                                                |
| `eslint-plugin-react-native`                        | the `AppText` restriction already covers raw `Text` and RTL                                                                                        |
| Playwright / Vitest lint plugins                    | Playwright `forbidOnly` and Vitest in CI already refuse `.only`                                                                                    |
| `checkJs` for tools/scripts `.mjs`                  | the scripts have no JSDoc types; they get lint without types                                                                                       |

Queued, not in PR 1, not measured yet:

| item                                   | plan                                                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| import-cycle guard                     | madge or dpdm, baseline `refactor/guards/cycles.json` like jscpd and knip. Nest circular DI is the main reason       |
| `react/jsx-no-leaked-render` (mobile)  | needs `eslint-plugin-react`, whose peer range also stops at ESLint 9; probe it first                                 |
| `no-deriving-state-in-effects`         | in PR 1 at error with 0 hits. If it gives false positives, turn it off, not to warn (warnings fail CI now)          |

## 8. Risks

| risk                                                                 | guard                                                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| a rule with 0 hits is not wired (`exhaustive-deps`, `no-deriving-state-in-effects`) | PR 1's description shows `eslint --print-config <file>.tsx` for web and mobile with both at error |
| type-aware lint is slower and needs more memory                      | §5.1 CI settings; turbo cache replays unchanged packages; lint already depends on `^build`             |
| `projectService` cannot find a file                                  | `allowDefaultProject: ['*.mts']` and the `disableTypeChecked` block for JS (0 parse errors in the probe) |
| L0 and step 2 touch hundreds of files                                | one package per PR, only when no lane branch is open on it                                             |
| `switch-exhaustiveness-check` on a status mapper that defaults on purpose | list the cases; do not suppress new ones                                                            |
| a suppression becomes permanent                                      | `refactor/guards/lint.json` makes every total visible in review; L2 work lands lane by lane            |

## 9. Follow-ups outside this doc

PR 1 also updates docs/04 §8 (rules and the new guard row), CLAUDE.md hard rule 3 (points here) and `refactor/README.md`
(`guard:lint`). This doc PR adds only this file.
