# One oxc base in `@ab/config`: design (on top of #937)


- **[1.90]**: the installed oxlint 1.90.0 package (`configuration_schema.json`, `dist/index.d.ts`, `dist/js_config.js`, strings in the win32 binding binary).
- **[web]**: the current oxc.rs docs. These may not match 0.80 or 1.95.
- **[unverified]**: neither of the above.

oxlint 1.95.0, tsgolint 7.0.2008 and oxfmt 0.80.0 are not installed. No oxfmt version is installed at all.

**Recommendation.** After #937, most of the base already sits in `@ab/config`. The PR should finish that move and leave the config's shape alone:

- One root config, still called with `-c`. Its loader moves into the package.
- Each workspace keeps its `lint.blocks.mjs`, holding only what it does differently. This is how a workspace "extends" the base: `compose()` lays its blocks over `baseBlocks(react)`.
- The composed config stays byte-identical.

Native nested `oxlint.config.ts` files per workspace, using `extends`, would be option A. I argue against it and leave it as owner question 1.

## 1. Where it lives

It stays in `packages/config` (`@ab/config`). No new package. Reasons:

- It is layer `T` in `refactor/guards/packages.json` with `"@ab/config": []`, so it sits at the bottom with no workspace dependencies.
- `tools/scripts/ci-checks/lint/packages-rules.mjs` never counts an edge to `@ab/config` as an extra («Edges that are never extras: … to @ab/config»).
- It already holds:
  - the `ab` plugin
  - `oxlint/*`, `lint.js`, `lint-web.js` and `vite.js`
  - the `./oxlint`, `./lint` and `./vite` exports
- 21 workspaces and the root list it as `workspace:*`.
- guard:loosened already watches `packages/config/([\w-]+/)?[^/]+\.[cm]?js` and `oxlint/core-rules.json`.
- A new package would add a layer entry, 20+ edges and a second home for the `ab` plugin. It would also split "one base package" away from the vitest base, which belongs in `@ab/config/vitest` too.

## 2. oxlint

**What the base holds.** All of this is already in `packages/config/oxlint/` and does not change:

- `config.js` `compose()`:
  - `plugins ['typescript','react','jsx-a11y']`
  - `jsPlugins`: `ab`, `stylistic` and `react-hooks-js`, as absolute specifiers
  - `env {builtin, node}`
  - `options.typeAware` and `reportUnusedDisableDirectives`
  - `IGNORES`: dist, coverage, `*.gen.ts`, .expo, playwright-report, test-results
- `core-rules.json`: categories, about 80 rules and one override for TS files only.
- `baseBlocks(react)`: `ALL+TYPED`, `PLAIN_TS`, `JS_ONLY`, test-off, `src/time/**`, then `REACT_BLOCK`. Last comes the "JS files lose TYPED" block.

**Env per workspace kind.** This documents what exists today. Adding a kind would change the effective config.

- Every file gets `node` and `builtin`.
- `react: true` adds `REACT_BLOCK`: `env.browser` (React Native included), the hooks rules and `no-misused-promises`.
- Test files (`TESTS`) turn off `TEST_OFF`, `TYPED_TEST_OFF` and `no-restricted-properties`. They have no globals env, because they import from vitest.

**What the PR changes:**

1. **The loader moves into `packages/config/oxlint/config.js`.** The workspace-dirs list then exists once instead of three times: root `oxlint.config.ts`, `oxlint/gate.mjs` and `lint-gate.mjs` each hold a copy on #937. `deploy/api-inputs.ts` `WORKSPACE` is about deploy, not lint, and stays. The core rules are still read with `readFileSync`, as the root file reads them today. That keeps it a pure move with no JSON import attribute.

   ```js
   const CORE = JSON.parse(readFileSync(new URL('./core-rules.json', import.meta.url), 'utf8'));
   // Mirrors pnpm-workspace.yaml `packages`.
   export const LINT_DIRS = ['apps/*', 'packages/*', 'tools/*', 'e2e', 'docs/design/brand/tools'];
   export const lintDirs = (root) =>
     globSync(LINT_DIRS.map((d) => `${d}/lint.blocks.mjs`), { cwd: root }).map(dirname).sort();
   const loadPackage = async (root, dir) => {
     const { default: lint } = await import(pathToFileURL(join(root, dir, 'lint.blocks.mjs')).href);
     return { dir, ...lint };
   };
   export async function repoConfig(root) {
     const packages = await Promise.all(lintDirs(root).map((dir) => loadPackage(root, dir)));
     return compose({ oxlintrc: CORE, packages });
   }
   ```

   The root `oxlint.config.ts` becomes:

   ```ts
   import { repoConfig } from '@ab/config/oxlint';

   export default await repoConfig(import.meta.dirname);
   ```

   The root file has to stay. [1.90] ignore patterns are «rooted at the directory containing the configuration file … patterns containing `..` are rejected», and override `files` «are matched against paths relative to the configuration file's directory». So the one config that covers every workspace must sit at the root, like the root `tsconfig.base.json`. The turbo oxc guide (`guides/tools/oxc.mdx`) also recommends root tasks for oxlint and oxfmt.

   `lintDirs` sorts folder names, as `gate.mjs` does today. The root file sorts file paths. For today's 24 folders both give the same order (checked against #937), so the override order does not change.

2. **The gates use the shared list.**
   - `oxlint/gate.mjs` and `oxlint/run.mjs` import `lintDirs` from `@ab/config/oxlint`. `packageDirs` and its pass-through are dropped.
   - `lint-gate.mjs` imports `LINT_DIRS` for its glob of suppression files.
   - The dead `LINT_SCOPE` path goes: `scope.mjs` and `scope.test.mjs` are deleted. On #937 no workflow and no doc sets `LINT_SCOPE`.
   - `tools/scripts` already lists `@ab/config` as a devDependency.

3. **Byte-identical dedupe only.** `lint.js` exports the `explicit-module-boundary-types` block as `exportTypes`. `libraryBlocks` uses it, and `packages/db/lint.blocks.mjs` and `packages/i18n/lint.blocks.mjs` replace their hand copies with it.
   - These are the only two copies in a `lint.blocks.mjs` (checked).
   - The object is the same in all three: `files: ['src/**/*.ts']`, `ignores: TESTS`, and the rule at `'error'`.
   - `convert.js` never mutates a block, so sharing one object is safe.

4. **`core-rules.json` drops its dead `"plugins"` key.** Only the root loader reads the file, and `compose()` never reads `plugins`.

5. **One oxlint version.** `oxlint` is the only tool pinned twice: in the root and in `packages/config` (for `oxlint/testing/lint-code.js`). It moves into the existing `catalog:` in `pnpm-workspace.yaml`, and both `package.json` files use `"catalog:"`.
   - `oxlint-tsgolint` and `oxfmt` have one consumer each, the root, and keep their plain pins.
   - The resolved version does not change.
   - Nothing in `tools/` or `.github/` reads the oxlint version from a `package.json`, and there is no dependabot config.

**What the PR leaves alone, on purpose:**

- **Mobile repeats.** The Text ban, the apiFetch ban and `reactRestrictions` appear in staff-mobile, family-mobile and mobile-kit. They differ in messages ("Use AppText from @ab/mobile-kit." / "Use the kit AppText." / "Use AppText (src/ui/primitives/AppText)."), in regexes and in ignores. Merging them would change option values. A later `mobileBlocks()` helper, like `webBlocks()`, can do it as a change to messages only, with the owner's OK.
- **The 6 `{ 'no-console': 'off' }` blocks** (brand tools, e2e, google-stub, migrate, scripts, wa-stub). Each one is that CLI workspace's real difference.
- **The ESLint-shaped blocks, the `convert.js` renames and the `eslint-*.js` file names.** Native oxlint keys would make guard:loosened read the renamed keys as new `off` entries. That would be its own PR.

**The type-aware config.** After #937, the single root `oxlint.config.ts`, run by `lint:report` with `--type-aware --deny-warnings --report-unused-disable-directives-severity=error`, is the full config. Nothing here touches it beyond the shim.

**Suppressions and `lint.blocks.mjs`.** Both stay as they are:

- The 17 `oxlint-suppressions.json` files keep their package-relative paths. The PR adds no entry and prunes none.
- The gate still maps report filenames, which are relative to the repo root, onto `lintDirs`. `gate.test.mjs` already covers this with an `e2e/lint.blocks.mjs` fixture and needs no edit.
- These keep working with no edits: the `knip.json` entries, the `**/oxlint-suppressions.json` excludes in `deploy-staging.yml` and `pure-move/domains.mjs`.
- knip treats `@ab/config`'s `exports` as entry files and `includeEntryExports` is off, so `LINT_DIRS`, `compose` and `packageOverrides` are not reported as unused.

**guard:loosened.** `loosened/sources.mjs` adds root `oxlint\.config\.ts` and `\.oxfmtrc\.json` to `ROOT`; today it watches neither.

- In `.oxfmtrc.json`, a raised `printWidth` is then read as a raised limit and a new `ignorePatterns` entry as a new ignore.
- `configText` applies the head's paths to both revisions, so both sides include the new files.
- None of the moved text has an `off` or `warn` level, a bracketed `ignores` list or a raised number. I expect 0 annotations.

## 3. oxfmt

No change to the config. The root `.oxfmtrc.json` already is the one shared format config: `singleQuote`, `trailingComma: all`, `printWidth 100`, `sortPackageJson: false`, `ignorePatterns ["pnpm-lock.yaml"]`. No workspace has its own, and #932 (fc3543d6d) deliberately deleted `packages/config/prettier.json`. oxfmt is not installed here, so every claim below stays [web] or [unverified].

- **How workspaces get it.** [web] oxfmt looks for the config starting from the directory of the file being formatted and walking up the tree, and the nearest config wins. `pnpm format` runs from the root. `packages/db` `gen:types` (`… > src/types.ts && oxfmt src/types.ts`, run from `packages/db`) depends on that walk-up. For 0.80 this is [unverified].
- **Why it can't live in the package.** [unverified] for 0.80: oxfmt ignore patterns are probably rooted at the config's directory, as oxlint's are. If so, a copy in `packages/config` would apply only there, and `"pnpm-lock.yaml"` would no longer match the root lockfile. A package-held version would still need a root file that re-exports it, and [web] `oxfmt.config.ts` support in 0.80 is [unverified]. One more file, nothing gained.
- **The PR's only oxfmt change** is the guard:loosened watch from §2.
- **CI format check.** Still off, per docs/31b §9. It lands when `pnpm format:check` reaches zero.

## 4. Order, the PR, files and proof

**Order.** The PR lands after #937 merges, rebased on that develop. It only reshapes #937's result.

- If the vitest-base PR is not built yet, make it one PR, «build(config): one base for vitest and oxc», which saves a PR.
- Otherwise land them one after the other, because both touch `packages/config/package.json` and `pnpm-workspace.yaml`.
- The `test:all` fix below is a #937 regression: `turbo lint` has no task after #937, and `.ouroboros/mechanical.toml` runs `pnpm test:all`. Fold it into #937 if that has not merged yet; otherwise it goes here.

**PR.** Title `build(config): load the oxc config from @ab/config`. About 19 files, with a net loss of lines.

| File | Change |
|---|---|
| `packages/config/oxlint/config.js` | + `LINT_DIRS`, `lintDirs`, `repoConfig`, core rules read as today |
| `packages/config/oxlint/config.test.js` | + `repoConfig` on a tmp tree with two `lint.blocks.mjs` equals `compose()` (fixtures import nothing, like `gate.test.mjs`) |
| `packages/config/oxlint/core-rules.json` | − `plugins` |
| `packages/config/lint.js` | `exportTypes` exported, used by `libraryBlocks` |
| `packages/db/lint.blocks.mjs`, `packages/i18n/lint.blocks.mjs` | use `exportTypes` |
| `oxlint.config.ts` | 3-line shim |
| `tools/scripts/ci-checks/lint/oxlint/gate.mjs`, `run.mjs` | `lintDirs` from `@ab/config/oxlint`, no `LINT_SCOPE`, no `packageDirs` |
| `tools/scripts/ci-checks/lint/lint-gate.mjs` | `LINT_DIRS` from `@ab/config/oxlint` |
| `tools/scripts/ci-checks/lint/oxlint/scope.mjs`, `scope.test.mjs` | deleted |
| `tools/scripts/ci-checks/lint/loosened/sources.mjs` (+ `tests/sources.test.mjs`) | watch root `oxlint.config.ts` and `.oxfmtrc.json` |
| `package.json` | `oxlint: "catalog:"`; `test:all` → `pnpm lint && turbo typecheck test e2e --force` (unless folded into #937) |
| `packages/config/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | `catalog:` for oxlint |
| `docs/31b-oxlint-mapping.md` | short "one base" paragraph |

**What proves nothing got dropped or narrowed.** Two parts are in CI; the byte-identical check is not.

1. **Rules with findings (CI).** `pnpm lint` is green and the diff of the 17 `oxlint-suppressions.json` files is empty. `gate.mjs` fails both above and below an exact count per file per rule, and `guard:lint` fails any change against the base.
2. **The loader (CI, unit test).** `repoConfig` on a tmp tree deep-equals `compose()` on the same packages.
3. **Looser config (CI, warning).** guard:loosened shows 0 «lint rules loosened» annotations.
4. **Byte-identical config: one-off, not CI.** This is the check that covers rules with zero findings, ignores, env, plugins and options.
   - [1.90] `dist/js_config.js` loads the config with a native `import()` and hands `JSON.stringify(default)` to the binary. So a dump of the default export is exactly what oxlint receives.
   - Do the dump in a cloud session, in one checkout so the absolute `jsPlugins` paths match: check out the base, run `pnpm i --frozen-lockfile`, dump `JSON.stringify((await import('./oxlint.config.ts')).default)`; then check out the head, install, dump, and `diff`.
   - The PR body records «effective config identical» under «behaviour → test».
   - No permanent CI step: guard:loosened already covers later PRs.

## 5. Risks and owner questions

**Risks:**

- **The gates now load `config.js`.** `gate.mjs`, `run.mjs`, `lint-gate.mjs` and their `node --test` tests now import `config.js`, which calls `require.resolve` on `@stylistic/eslint-plugin` and `eslint-plugin-react-hooks` when it loads.
  - Every CI job that runs them does a full `pnpm i --frozen-lockfile`: the lint job, the guards job and «test others».
  - The only filtered install, `--filter @ab/scripts` at ci.yml:121, runs `verified-tree.mjs`, which imports none of them.
  - If a filtered job ever runs a lint gate, move `LINT_DIRS` and `lintDirs` into a file with no side effects.
- **Untested on 1.95.** None of this needs new oxlint behaviour: the same object, the same `-c` call and the same flags. 1.95 itself is checked only by #937's CI.
- **Base before #937.** If the PR is opened before #937 merges, the base has a different shape. Open it only after #937 is in develop.
- **oxfmt walk-up for `packages/db` `gen:types`.** This is [web] only. If 0.80 does not walk up, `src/types.ts` gets oxfmt's defaults (double quotes). That is develop's behaviour today, not something this PR introduces.
- **Merge conflicts with the vitest-base PR** on `packages/config/package.json` and `pnpm-workspace.yaml`.

**Questions (default in bold):**

1. Switch to native `oxlint.config.ts` files per workspace, with `extends: [base]` (option A)? **Default: no.** The reasons:
   - [web] `-c` "disables nested config lookup", so `lint:report` would have to drop `-c`. [1.90] the binary has `--disable-nested-config`.
   - [1.90] the binary rejects these outside the root config: `typeAware`, `typeCheck`, `denyWarnings`, `maxWarnings`, `reportUnusedDisableDirectives` and `respectEslintDisableDirectives` («The `options.X` option is only supported in the root config»). The schema marks only the last two.
   - [1.90] in `oxlint.config.ts`, `extends` takes config objects only: `index.d.ts` `extends?: OxlintConfig[]`, and `js_config.js` rejects strings. They are merged "from the first to the last".
   - `jsPlugins` do pass through `extends` but must be absolute. The binary says «Relative JS plugin specifiers are not supported in configs provided via `extends`», and `compose()` already uses absolute specifiers.
   - [unverified]: how `overrides`, `ignorePatterns` and `env` merge through `extends`, and which folder an extended config's globs are rooted at.
   - [1.90] nested discovery finds only `.oxlintrc.json(c)`, `oxlint.config.ts` and `.mts`. That means 24 TS files. The `staff-mobile`, `family-mobile`, `mobile-kit` and `e2e` tsconfigs include `**/*.ts`, so those files would need a `.d.ts` like `vite.d.ts`, and they would get type-aware rules that are off for `.mjs` today.
   - It also touches the deps of `tools/migrate` and the brand tools, 24 `knip.json` entries, the `deploy-staging.yml` excludes, `pure-move/domains.mjs` and guard:loosened's `SOURCE`.
   - The merge would happen inside oxlint, so the node-side dump could no longer show the effective config.
2. Keep the format config as the root `.oxfmtrc.json` instead of moving it into `@ab/config`? **Default: yes, keep it at the root.** Walk-up discovery needs a root file either way, and #932 removed the package copy on purpose.

---

**What I changed and why:**

1. **Removed `effective.mjs`, its test and the ci.yml step.** `continue-on-error` with no `::warning` meant the step neither failed the run nor warned, so "the merge waits for «identical»" could not work through checks. The offline base install was unverified: `allowBuilds` runs install scripts (supabase, esbuild, @swc/core), and the store may not hold the base lockfile's packages. "Later PRs get a diff" was speculative, since guard:loosened already covers them. In its place: the `repoConfig` unit test, guard:loosened, and a one-off dump in a cloud session from one checkout, stated plainly as not CI. The dump is exact because [1.90] `js_config.js` hands the binary `JSON.stringify(default)`.
2. **`lint-gate.mjs` added.** It holds a third copy of the dirs list, and the original design left it out. It now imports `LINT_DIRS`, which also gives the export a user.
3. **`run.mjs` added to the file table.** It imported `packageDirs` from `gate.mjs`; it now imports `lintDirs` directly, with no pass-through.
4. **Catalog only for `oxlint`.** It is the only tool pinned twice; `oxlint-tsgolint` and `oxfmt` have one consumer each.
5. **Core rules still read with `readFileSync`, not a JSON import attribute.** The move stays pure, with no new import form against the "no extensions in imports" rule. [1.90] oxlint loads the config with native `import()`, so either would work.
6. **Q1 corrected.** jsPlugins do pass through `extends`, as long as they are absolute (binary string). `extends` takes objects only (`index.d.ts`, `js_config.js`). The root-only options are now sourced to the binary's error strings, because the schema marks only `reportUnusedDisableDirectives` and `respectEslintDisableDirectives` as root-only.
7. **§3 now says oxfmt is not installed at all**, and every oxfmt claim stays [web] or [unverified].
8. **New coupling risk recorded.** The gates now load `config.js`, which resolves both JS plugins when it loads. Every job that runs a gate does a full install; the `--filter @ab/scripts` install at ci.yml:121 runs only `verified-tree.mjs`.
9. **`test:all` marked as a #937 regression** (`.ouroboros/mechanical.toml` runs `pnpm test:all`), to fold into #937 if it is still open.
10. **Claims I verified and kept:**
    - 6 `no-console` blocks; only db and i18n have a copy of the types block; the mobile blocks really differ.
    - 21 workspaces plus the root depend on `@ab/config`; 17 suppression files; 24 lint folders, in the same sort order either way.
    - `LINT_SCOPE` is dead on #937.
    - `@ab/config` is the never-extra edge in `packages-rules.mjs`.
    - knip does not report entry exports.
    - The globs are rooted at the config file's directory.
