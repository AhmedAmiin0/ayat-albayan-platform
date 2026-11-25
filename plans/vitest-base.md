# @ab/testing: one shared vitest config

**Basis:** I read origin/develop at f90abe03c, plus the installed vite 8.3.2, vitest 5.0.3 and turbo 2.11.6 docs. Nothing was run or edited.

## 1. The package

**Name, place and files**

The package is `@ab/testing` at `packages/testing/` and holds only the vitest base. Its lint files come from `packages/i18n`, which is one flat module with no suppression files. `packages/time` is the wrong template: its `lint.blocks.mjs` turns `no-restricted-properties` off for the date-fns facade and sets per-folder module boundaries.

| File | Content |
|---|---|
| `package.json` | below |
| `tsconfig.json` | `{ "extends": "../../tsconfig.base.json", "compilerOptions": { "types": [] }, "include": ["src"] }`. It keeps the base's Bundler resolution, so the test imports `./vitest` with no extension. |
| `eslint.config.js`, `lint.blocks.mjs` | copied from `packages/i18n` |
| `src/vitest.ts` | the base (§3) |
| `src/vitest.test.ts` | its unit test |

**No `vitest.config.mts` in this package.**
- Its one test runs on vitest's defaults. The default include `**/*.{test,spec}.?(c|m)[jt]s?(x)` finds it, and there is no config file above the package for vitest to pick up.
- A config that imports `./src/vitest` would load, because the bundle step resolves it. But Vite 8.3's `vite:native-config-compat-check` flags any relative import without an extension and prints the «unsupported by `configLoader: 'native'`» warning on every run (`node.js`, `classifyImportRef` and `analyzeConfigModuleReferences`).
- A self-import of `@ab/testing/vitest` cannot resolve either. `tryNodeResolve` looks only in `node_modules/<name>`, and pnpm does not link a package into its own `node_modules`.

```json
{
  "name": "@ab/testing",
  "private": true,
  "type": "module",
  "exports": { "./vitest": "./src/vitest.ts" },
  "scripts": { "lint": "eslint . --max-warnings 0", "typecheck": "tsgo --noEmit", "test": "vitest run" },
  "devDependencies": {
    "@ab/config": "workspace:*", "@typescript/native-preview": "7.0.0-dev.20260707.2",
    "eslint": "^10.0.0", "typescript": "~6.0.3", "vitest": "^5.0.3"
  }
}
```

There is no `peerDependencies`: the base imports only types from vitest, and every consumer already has vitest.

**How vitest loads a `.ts` file from a workspace package**

1. Vite 8's default `configLoader: 'bundle'` bundles each workspace's own config file with rolldown.
2. Its `externalize-deps` plugin marks every bare import that resolves as `external: true` (`node_modules/.pnpm/vite@8.3.2…/dist/node/chunks/node.js`, lines 37799–37830).
3. `nodeResolveWithVite` passes `preserveSymlinks: false`, and `resolvePackageData` takes the realpath with `safeRealpathSync` (around line 3203).
4. So Node imports `@ab/testing/vitest` directly from `file:///…/packages/testing/src/vitest.ts`, a path outside `node_modules`.
5. Node 24.15 (`.nvmrc`; the Dockerfile uses `node:24.15.0-slim`) strips the types natively. The repo already relies on this: `node tools/scripts/units/guard.ts`, wa-stub's `node src/server.ts`, and `@ab/db` exporting `./src/index.ts`.

**What that means for the package**

- **No build and no `dist`.** The package ships TS source.
- **turbo:** `@ab/testing` has no `build` script, so it is a transit node in every dependent's `test.dependsOn: ['^build']`.
  - An edit to it still changes the dependents' task hashes (turbo docs `core-concepts/package-and-task-graph.mdx` «Transit Nodes», `crafting-your-repository/configuring-tasks.mdx:364-379`).
  - This is the same mechanism that tracks `packages/config/vite.js` today.
  - `turbo.json` does not change.
- **Not in root devDependencies.** That would put the package in the global hash, and every edit would miss every task's cache (`caching.mdx:250-256`).
- **No runtime imports at all.**
  - The base uses only `import type … from 'vitest/config'` and returns a plain object. `defineConfig` returns its argument unchanged, so it is not needed.
  - Node therefore loads one self-contained file. Nothing has to resolve from `packages/testing` at run time, and the no-extension rule never comes up.
  - The types still carry vitest's `declare module 'vite'` additions (`test`, `configureVitest`).
- **Erasable syntax only.** `tsconfig.base.json` already sets `erasableSyntaxOnly` and `verbatimModuleSyntax`.
- **The options type stays local and is not exported.** This keeps rule 15. The unit has 2 files, so it needs no folder and no `index.ts`.
- **No plugin imports in the base.** Anything it imports would load in all 16 workspaces. So swc stays in the api, and the React, Tailwind and router plugins stay in `webConfig`.

## 2. Avoiding a dependency cycle: config only, builders stay with their owners

**The cycle.** If `@ab/testing` held builders, it would depend on domain packages: `@ab/shared/testing` imports `@ab/money`. Every package from L0 to L2 would then devDepend on `@ab/testing` for its config, which gives `@ab/core` → (dev) `@ab/testing` → `@ab/money` → `@ab/core`. turbo builds its graph from devDependencies too, so it rejects this.

**The split: one package at the bottom with no workspace runtime dependencies.**
- **`@ab/testing`** holds the vitest base only. Its only workspace edge is a devDependency on `@ab/config` for lint, which sits in the same layer.
- **Data builders and render helpers stay with their owners (rule 18):**
  - `@ab/shared/testing`
  - `@ab/web-kit/testing/query-render`, and the kit's `src/testing/test-setup.ts`, which imports `@ab/client-core` and `@ab/time`
  - `@ab/mobile-kit/testing/*`
  - the apps' own `testing/` and `test/` folders
- **Shared fakes (fetch, clock) wait until one is actually shared.** None is today. One may join `@ab/testing` later only if it has no workspace imports.
- **docs/32 needs correcting.** Its planned row (docs/32-refactor-v2.md:278, «shared `testing/`, the docs/27 E7 fixtures… deps —») would create exactly this cycle.

**Second cycle to avoid.** `@ab/testing` devDepends on `@ab/config`, so `@ab/config/vite` must never import `@ab/testing`. Web workspaces combine the two in their own `vite.config.ts` (§4).

**`refactor/guards/packages.json`:**
```json
{ "name": "T", "packages": ["@ab/config", "@ab/testing"] },
…
"allowed": { "@ab/core": [], "@ab/db": [], "@ab/config": [], "@ab/testing": [], …
```

**Rule change in `tools/scripts/ci-checks/lint/packages-rules.mjs`.** Today only edges to `@ab/config` are exempt (lines 5 and 15). Without a change, the 16 manifest devDependencies on `@ab/testing` and the 16 config-file imports of it are "new extras" and fail the PR. Exempt edges into all of layer T instead, and drop `CONFIG`:
```js
const tooling = (t) => t.layers.find((l) => l.name === 'T')?.packages ?? [];
const EXEMPT = [
  (t, e) => e.to === e.from || tooling(t).includes(e.to),
  …
```
- `allowed['@ab/testing']` is `[]`, so an edge from `@ab/testing` to any domain package is still an extra and fails.
- Add both cases to `packages-rules.test.mjs`.
- The layer list changes, so `widened()` prints the «owner's go» warning.

## 3. The base config API (`packages/testing/src/vitest.ts`)

```ts
import type { Plugin, ViteUserConfig } from 'vitest/config';

type Kind = 'node' | 'web';

interface Options {
  /** 'web': jsdom, the web test env and the stylesheet rules (default 'node'). */
  kind?: Kind;
  /** Run before every test file: workspace-relative or absolute. */
  setupFiles?: string[];
}

const STYLESHEET = /\.css($|\?)/;
// fsModuleCache keys a module by its own content; Tailwind builds a stylesheet from every source
// file, so stylesheets are always transformed afresh, never read from the cache.
const noStylesheetCache: Plugin = {
  name: 'ab:no-stylesheet-fs-cache',
  configureVitest: ({ defineCacheKeyGenerator }) => {
    defineCacheKeyGenerator(({ id }) => (STYLESHEET.test(id) ? false : undefined));
  },
};

const KINDS = {
  node: { plugins: [], test: {} },
  web: {
    plugins: [noStylesheetCache],
    test: {
      environment: 'jsdom',
      // Multi-step wizard/drawer flows take ~1.5s alone and >5s under parallel `turbo test` load.
      testTimeout: 20_000,
      // tokens / motion / avatar-tones tests read their raw sheets; every other one stays stubbed.
      css: { include: [/styles\/(tokens|motion|avatar-tones)\.css/, /src\/index\.css/] },
      env: {
        VITE_SUPABASE_URL: 'http://sb.test',
        VITE_SUPABASE_ANON_KEY: 'anon',
        VITE_API_URL: 'http://api.test',
      },
    },
  },
} satisfies Record<Kind, Pick<ViteUserConfig, 'plugins' | 'test'>>;

/** The config every vitest workspace starts from; its own extras go on with mergeConfig. */
export function testConfig(options: Options = {}): ViteUserConfig {
  const { kind = 'node', setupFiles = [] } = options;
  const { plugins, test } = KINDS[kind];
  return {
    plugins,
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      // Transforms persist across runs in <repo>/node_modules/.vitest-cache (ci.yml restores it).
      fsModuleCache: true,
      setupFiles,
      ...test,
    },
  };
}
```

**Defaults and why**

The defaults are exactly what runs today, so the PR changes no behaviour:
- **include `src/**/*.test.{ts,tsx}`.**
  - All 3837 vitest test files match it.
  - The packages use vitest's default include today and collect the same files. No test file sits outside `src/` and there are no `.spec` files.
  - The nine node packages have no `.test.tsx` files.
  - All nine `tsconfig.build.json` files exclude `src/**/*.test.ts`, so `dist/` holds no tests.
- **Environment:** `node` by default, `jsdom` for `web`.
- **No new runner defaults.** `restoreMocks` stays false; vitest 5's defaults are `clearMocks: true` and `restoreMocks: false`. Pool, `hookTimeout` and reporters stay as they are.
- **Coverage is not in this PR.** No provider is installed, and thresholds with no measurement would fail with no baseline allowed. When the rule-14 lane adds coverage, it is one `coverage` block in this file (§6, question 1).
- **Workspace-only settings stay in the workspace, added with `mergeConfig`.** Each has one user:
  - the api's swc plugin, its `@` alias and its Supabase env
  - the web React/Tailwind/router plugins, the `@/` alias, `dedupe` and `define`, all in `webConfig`, which the dev server and the build need anyway

  The base therefore holds no alias, and packages get no `@/`. `resolve.tsconfigPaths` is not used.
- **Every option has a caller today:**
  - `kind`: the 3 web workspaces
  - `setupFiles`: the 3 web workspaces and migrate

**Test.** `src/vitest.test.ts` covers two cases:
- the node defaults: include, `fsModuleCache`, empty `setupFiles`, no plugins, no environment
- the web kind: jsdom, the env, the stylesheet plugin, and `setupFiles` passed through

## 4. Each workspace's config

**Node packages and tools** (core, time, i18n, catalog, settings, schedule, money, shared, client-core, wa-stub, google-stub):
```ts
import { testConfig } from '@ab/testing/vitest';

export default testConfig();
```

**tools/migrate:**
```ts
import { testConfig } from '@ab/testing/vitest';

// Invented teacher directory for every test (real names live only in cache/teachers.json).
export default testConfig({ setupFiles: ['src/test-setup.ts'] });
```

**apps/api** (keeps `unplugin-swc` and `@swc/core`, its alias and its env; docs/04:196 and docs/58:598 stay true):
```ts
import { testConfig } from '@ab/testing/vitest';
import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { mergeConfig } from 'vitest/config';

// swc keeps Nest decorator metadata that esbuild/oxc would drop.
export default mergeConfig(testConfig(), {
  plugins: [swc.vite({ module: { type: 'es6' } })],
  // `@/x` → src/x, as the root tsconfig.base.json `paths` (the build rewrites it with tsc-alias).
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Dummy Supabase values so AppModule boots; createClient makes no network call on construction.
  // No database at boot: the integration-config tests cover that load on their own.
  test: {
    env: {
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      INTEGRATION_CONFIG_FROM_DB: 'false',
    },
  },
});
```

**Web app** (`apps/staff-web/vite.config.ts`; family-web is the same plus `client` and `cacheDir`):
```ts
import { webConfig } from '@ab/config/vite';
import { testConfig } from '@ab/testing/vitest';
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

const kitDir = fileURLToPath(new URL('../../packages/web-kit', import.meta.url));

export default mergeConfig(
  webConfig({
    dir: import.meta.dirname,
    port: 5173,
    icons: 'staff',
    kitDir,
    brandDir: fileURLToPath(new URL('../../packages/catalog/brand', import.meta.url)),
  }),
  testConfig({ kind: 'web', setupFiles: [`${kitDir}/src/testing/test-setup.ts`] }),
);
```

**packages/web-kit/vite.config.ts:** the same, with `mergeConfig(webConfig({ …, routes: false, kitDir: import.meta.dirname }), testConfig({ kind: 'web', setupFiles: ['src/testing/test-setup.ts'] }))`. Vitest resolves `setupFiles` against the workspace root, the same file as today.

`mergeConfig` comes from `vite`, which all three web workspaces list directly. With the base free of runtime imports, `vite build` and the dev servers no longer load vitest at all.

**What changes in `@ab/config/vite`**

- `vite.js` loses its `test` block, `noStylesheetCache`, `TEST_ENV` and `kitSrc`. It takes `defineConfig` from `vite`, and its header comment becomes «The Vite config…».
- `vite.d.ts` returns vite's `UserConfig`. The `kitDir` doc drops «its src/ is aliased»: the kit's `src` is not aliased today; it only located the setup file.
- `packages/config/package.json` drops `vitest` from both its peer and dev dependencies. Nothing else in `@ab/config` imports vitest; its own tests use `node --test`.
- `mergeConfig` concatenates arrays. Only the base sets `include` and `setupFiles`, so nothing is doubled.

**Each workspace keeps `vitest` as a devDependency.** pnpm links the `vitest` binary only for direct dependencies, and each `test` script needs it.

**Mobile stays on jest-expo**, and its jest base stays in `@ab/mobile-kit`:
- **Moving to vitest is not realistic.** React Native ships untranspiled Flow source and native modules. The jest-expo preset handles them: the babel transform, `.ios`/`.android` platform resolution, the RN environment, and the native mocks in `jest-expo/src/preset/setup.js`. The setup files' `jest.mock` factories rely on babel-jest hoisting, and vitest has no maintained React Native preset. CLAUDE.md also fixes «jest-expo mobile».
- **The jest base is already one file.** `packages/mobile-kit/jest.base.cjs` serves all 3 mobile workspaces.
- **`jest.shared.cjs` cannot move to `@ab/testing`.** It mocks mobile-kit internals, `@ab/time` and `@ab/shared`, which would create a cycle.
- **Moving only `jest.base.cjs` is not worth it.** It would split mobile config across two packages and churn `ci-rows.test.mjs`, `CACHE_KEYS`, `knip.json` and the jest cache key, for no deduplication. It is left out.

## 5. Migration: one PR

**Title:** `refactor(testing): move every vitest config onto one base in @ab/testing`. This title is valid because the PR adds `testing` to `SCOPES`, and `pr-title.yml` runs on the `pull_request` merge commit.

**Files (about 52 files, about +230 / −190 lines):**

| Group | Files |
|---|---|
| New package (6) | `packages/testing/{package.json, tsconfig.json, eslint.config.js, lint.blocks.mjs, src/vitest.ts, src/vitest.test.ts}` |
| vitest configs (13) | `packages/{core,time,i18n,catalog,settings,schedule,money,shared,client-core}/vitest.config.mts`, `tools/{wa-stub,google-stub,migrate}/vitest.config.mts`, `apps/api/vitest.config.mts` |
| vite configs (3) | `apps/staff-web/vite.config.ts`, `apps/family-web/vite.config.ts`, `packages/web-kit/vite.config.ts` |
| `@ab/config` (3) | `packages/config/{vite.js, vite.d.ts, package.json}` |
| Manifests (16 + lockfile) | add `"@ab/testing": "workspace:*"` to the devDependencies of the 16 vitest workspaces. `pnpm-lock.yaml` is regenerated by `pnpm i` in a cloud session, because CI installs with `--frozen-lockfile`. |
| Package guard (3) | `refactor/guards/packages.json`, `tools/scripts/ci-checks/lint/packages-rules.mjs`, `packages-rules.test.mjs` |
| Commit scopes (1) | `tools/scripts/ci-checks/lint/commit-header/header.ts`: add `'testing'` to `SCOPES`. Without it, `header.test.ts` «every workspace folder has its scope» (which walks `packages/*`) fails in «test others», and so does the title. |
| Suppressions (2) | delete the `"vitest.config.mts"` entries (`max-len`, `stylistic/max-len`) in `apps/api/eslint-suppressions.json` and `apps/api/oxlint-suppressions.json`. The long comment line is gone, and an entry left behind fails lint as unpruned. |
| Docs (2) | `docs/51-family-web.md:47`: add `@ab/testing/vitest` beside `@ab/config/vite`. `docs/32-refactor-v2.md:204,278`: the `@ab/testing` row becomes config only, with builders staying with their owners (§2). |

**No CI cache-key edits.**
- Vitest's own transform-cache key already covers everything in the base that changes a transform. It is built from the resolved `resolve`, the plugin names, `css`, the environment and the config file dependencies (`vitest/dist/chunks/index.DpLw24bj.js:7306-7333`).
- The one piece of base logic outside that key is the stylesheet cache-key generator. It can only stop a file from being cached; it never serves a stale entry.
- `include`, `env`, `testTimeout` and `setupFiles` act at run time, not in transforms.
- So `ci.yml:246` and `verified-tree.mjs` `CACHE_KEYS` stay as they are. Add the base to both when it gains a transform plugin that takes options.

**No change needed:**
- **`turbo.json`:** see §1.
- **`ci.yml` matrix:** the package's own test lands in «test others».
- **`knip.json`:** new packages need no entry, as with `packages/time`; knip takes package.json `exports` targets as entry files.
- **`cycles-gate.mjs` and `e2e-areas/graph.mjs` `ROOTS`:** they list domain `src` roots. The base has no folders, and no app or package source imports it.
- **folder-cap:** it scans only `packages/*/src`.
- **`apps/api/Dockerfile`:** it copies every `packages/*/package.json`, and `--filter "api^..." build` skips a package with no build script.
- **Mobile files.**
- **docs/04:196, docs/31a:55, docs/58:598:** the api keeps its alias and env. docs/31a was already stale before this PR.

**How CI proves nothing changed.**

Every vitest workspace's config or manifest changes, and so does `@ab/config`, so every test row misses turbo's cache and really runs. That includes the mobile rows: client-core, shared and `@ab/config` are in staff-mobile's `^build` closure, and the lockfile change also empties the jest transform cache.

1. For each test row, compare the PR run with the newest develop CI run whose verify jobs ran (`gh run list -w ci.yml -b develop`). Run `gh run view --job <id> --log | grep -E '(Test Files|Tests) +[0-9]'` on both. turbo replays logs on cache hits, so a cached develop row still prints its totals.
2. «Test Files» and «Tests» must match per row. Vitest shards a fixed file set the same way every time, so each shard can be compared on its own.
3. The only allowed difference is «test others»: +1 file and +2 tests from `@ab/testing`, plus the scope test, whose count is unchanged.
4. The mobile rows re-run, and their totals must match develop's.

Expected test files per workspace (`git ls-tree`, `src/**/*.test.{ts,tsx}`, checked):

| Workspace | Files |
|---|---|
| api | 1883 |
| staff-web | 1030 |
| shared | 224 |
| client-core | 207 |
| web-kit | 198 |
| migrate | 63 |
| schedule | 46 |
| money | 46 |
| family-web | 29 |
| settings | 29 |
| core | 28 |
| catalog | 21 |
| time | 15 |
| wa-stub | 14 |
| i18n | 3 |
| google-stub | 1 |
| **Total** | **3837** |

## 6. Risks and questions

**Risks**

1. **Loading the TS base natively in Node** depends on:
   - Node 24 or later
   - pnpm symlinks, so the realpath is outside `node_modules`
   - erasable syntax only
   - a single file with no runtime imports

   If an install copies workspace packages into `node_modules` (`pnpm deploy`, `dependenciesMeta.injected`), Node refuses to strip the types. Today these configs load only after a full workspace `pnpm i`: in the CI test rows, the web builds (`deploy-staging.yml`), and the e2e dev servers.
2. **`vite build` and the dev server now load the test base** through `vite.config.ts`. It is a plain object there: vite ignores the `test` key, and `configureVitest` runs only under vitest. Vitest itself is no longer loaded by the web build.
3. **The guard table widens**, so the PR merges only with the owner's go. The lockfile must be regenerated in a cloud session, never on the owner's PC.
4. **The first PR run starts with empty transform caches.** The lockfile hash and the config hashes change, so the api, web and mobile rows are slower once.
5. **Type-aware lint of the `*.mts` files is unverified.** It resolves `@ab/testing/vitest` to TS source through `allowDefaultProject`, including in the NodeNext packages. The api (NodeNext) already resolves `@ab/db`'s `./src/index.ts` export the same way, so I expect it to pass. The first CI lint run is the check.
6. **An edit to the base counts as an API change on deploy.** `tools/scripts/ci-checks/deploy/api-inputs.ts` follows devDependencies, so the staging API image rebuilds. This already happens today for `@ab/config` edits.

**Questions for the owner**

1. **Turn on coverage thresholds in this PR?** Recommended: no. Keep this PR behaviour-neutral. The rule-14 lane then adds `@vitest/coverage-v8` and a `coverage` block with per-package thresholds to this one file.
2. **A new `@ab/testing` package, or a `@ab/config/vitest` subpath?** The subpath needs no new package, no guard change, no scope and no 16 new edges. Recommended: `@ab/testing`, as you asked, with the guard warning approved.

One related note, outside this PR: the domain packages use NodeNext with `.js` relative imports, which goes against your no-`.js`-imports rule. This PR adds none.

---

**Changes from the original design, and why**

1. **Added `testing` to `SCOPES` in `commit-header/header.ts`.** Without it, `header.test.ts` «every workspace folder has its scope» fails in «test others», and the `refactor(testing)` title fails pr-title. This blocked the original design.
2. **`lint.blocks.mjs` and `eslint.config.js` now come from `packages/i18n`, not `packages/time`.** Time's file turns the date restrictions off for the date-fns facade and assumes per-folder modules.
3. **Removed the package's own `vitest.config.mts`.**
   - The «no extension needed» claim was wrong in practice: Vite 8.3's native-compat check warns about `./src/vitest` on every run.
   - A self-import cannot resolve, because `tryNodeResolve` only looks in `node_modules`.
   - The one test runs fine on vitest's defaults.
4. **Removed the `app` and `env` options.**
   - Each had one caller, the api, which already uses `mergeConfig` for swc. Its alias and env stay in its own file.
   - This removes the `'@'` key from a package and keeps docs/04:196 and docs/58:598 true.
   - It also drops `aliasOf` and one test case.
5. **The base imports types only.** There is no `defineConfig` and no `peerDependencies`, and the web configs take `mergeConfig` from `vite`. The base has zero runtime imports, and web build and dev no longer load vitest.
6. **Removed the CI cache-key edits** (`ci.yml:246`, `verified-tree.mjs` `CACHE_KEYS` and its test). Vitest's key already includes the resolved resolve, plugin names, css and environment, and the stylesheet generator can only stop caching, never serve a stale entry.
7. **Corrected the CI proof.** The mobile rows re-run, because client-core, shared, `@ab/config` and the lockfile change; they are not turbo cache hits. Their totals must still match. «test others» gains +1 file and +2 tests.
8. **§2: `@ab/shared/testing` imports only `@ab/money`**, not `@ab/settings`. The cycle argument is unchanged.
9. **Trimmed the doc edits to docs/32 and docs/51.** docs/04 stays true with the api keeping its alias, and docs/31a:55 was stale before this PR.
10. **Added risk 6.** `api-inputs.ts` follows devDependencies, so an edit to the base rebuilds the staging API image.
11. **Added evidence for claims that were cited but not shown:**
    - the vite realpath (`safeRealpathSync`, around line 3203)
    - knip, folder-cap, `cycles-gate` and the Dockerfile need no change
    - no `.test.tsx` files in the node packages
    - all nine build tsconfigs exclude tests
