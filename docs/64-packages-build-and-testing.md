# 64 · Packages as TypeScript source, one api bundle, one testing and lint base

Plan for how the workspace packages are built, imported and tested. Today every package compiles to `dist/` with its own `tsconfig.json` + `tsconfig.build.json`, imports its own files as `./x.js`, and every workspace carries its own vitest, oxlint and babel pieces. These five PRs make packages plain TypeScript source that the apps compile, with one base for each tool. They land before the docs/62 and docs/63 lanes; those lanes' drivers wait for every PR in «Order». Counts below were read on develop `7316f4cd4`; every PR recounts on current develop.

## Decisions (owner, 2026-11-25)

Owner directives:

- **Packages are Just-in-Time:** «just export ./src and make dev script and build script for all the packages». Every package's `exports` points at `./src` TypeScript; every package still has a real `dev` and `build` script.
- **No extension in imports:** «inside the packages why are we using .js», «i dont want to import .js files». No `./x.js`, `./x.ts` or `/index` in any specifier, packages included; no `#` imports; packages never use `@/`.
- **One-line tsconfig per package:** first «no need for tsconfig and ts.config.build in all the packages set the common in the base»; then, after seeing a script that generated each package's config, «i dont like this wierd scripts you added in jit» and the choice «One-line tsconfig per package». The root `tsconfig.base.json` holds every common setting; one root config per package kind (`tsconfig.node.json`, `tsconfig.web.json`, `tsconfig.native.json`) extends it with only that kind's differences and `"include": ["${configDir}/src"]`; each package's `tsconfig.json` is exactly `{ "extends": "../../tsconfig.<kind>.json" }`; no `tsconfig.build.json`, no root `tsconfig.json`, and no script or CLI that writes a tsconfig.
- **Plain package scripts:** `"build": "tsgo --noEmit"`, `"dev": "tsgo --noEmit --watch"`, plus the package's own typecheck, test and lint scripts.
- **One testing package:** «also create a seperate package for testing if you need to share something for testing», «make the vitest config in one base package for testing».
- **One oxc base:** «same for oxc».
- **Solid kits:** about mobile-kit's 30-line exports map, «then this package is not solid»; «if you need to create a package for babel create it».
- **Defaults:** «use defaults for all and start the builders». Every choice the design notes offer takes its recommended default (below).

Defaults taken:

- **Api build first.** The api image runs compiled `dist/` today, so packages cannot ship source until the api stops needing package `dist/`. PR 1 bundles the api; PR 2 then switches the packages.
- **Bundler: rolldown with swc.** rolldown is already in the lockfile (through vite); swc already compiles the api's tests and emits the decorator metadata Nest's injection reads, which oxc's transform does not emit the same way.
- **Externals:** node built-ins and the api's own `dependencies` stay in `node_modules`; the workspace packages and their own dependencies are inlined, because `apps/api/node_modules` does not link a package's dependencies.
- **Same entry paths:** each file the image or the deploy runs (`dist/main.js`, the PDF sandbox, the operator scripts in `dist/scripts/`) stays at its path, one file each, so no compose file, deploy workflow or runbook changes.
- **`@ab/testing` is test-only and at the bottom layer** (vitest-base notes): no workspace dependencies, no builders; data builders stay in their owning packages (rule 18), which avoids a dev-dependency cycle.
- **No coverage thresholds in the testing PR:** it stays behaviour-neutral; the rule 14 lane adds them to the one base.
- **`@ab/testing`, not an `@ab/config/vitest` subpath**, as the owner asked; the packages guard's «widened» warning is expected for its new layer.
- **oxc base:** keep one root `oxlint.config.ts` (oxlint resolves ignores and overrides relative to the config file, so the file that covers every workspace sits at the root) and move its body into `@ab/config` as `repoConfig(root)`; no per-workspace native config (option A: no); the format config stays the root `.oxfmtrc.json`.
- **Babel:** the shared preset moves into `@ab/config`, or into a new small package if a dependency makes `@ab/config` wrong (owner allows it).
- **Every codemod is a committed script with fixture tests first**, and a codemod commit holds codemod output only, so a conflict is solved by re-running it on fresh develop.

## PR 1 · Bundle the api (`build/api-bundle`)

**Scope.** `apps/api` builds with `rolldown -c rolldown.config.mjs` into one CommonJS file per entry:

- `bundle/entries.mjs`: the entries the image and the deploy run, each kept at its `dist/` path.
- `bundle/workspace-source.mjs`: resolves `@ab/<name>[/<subpath>]` to the package's TypeScript source (a `./dist/<x>.js` export becomes `./src/<x>.ts`; a file export such as `./i18n/ar.json` stays), so the bundle needs no package `dist/`.
- `bundle/externals.mjs`: what stays in `node_modules` (above).
- swc (`unplugin-swc`) compiles every module, keeping `emitDecoratorMetadata` from the api's tsconfig.
- `pdf-assets.ts` finds the report logo through `require.resolve('@ab/catalog/brand/mark.png')` (a new `@ab/catalog` export) instead of a path relative to its own folder, which a bundle in `dist/` would break.
- The Dockerfile build stage runs `pnpm --filter api build` only; no package is built. `apps/api/tsconfig.build.json` and `tsc-alias` go.
- `dev` keeps its swc register run of `src/main.ts`.
- ci.yml `IMAGE_PATHS` adds the bundle config, so a change to it builds the image.

**Proof (CI).** The bundle helpers' unit tests; the pdf-assets logo test; `app.module.smoke.test.ts` and the rest of the api suite with the same test count plus the PR's own; job «api image» builds the image and runs the report PDF, the PDF sandbox and `/health` from the bundle; e2e runs the bundled `dist/main.js`.

## PR 2 · Packages as TypeScript source (`build/jit-packages`)

**Scope.**

- Every package's `exports` points at `./src` TypeScript, listing only the subpaths something imports.
- A committed codemod (fixture tests first) strips the extension from every relative specifier in `packages/*` (import, export-from, `import()`): 826 files use `./x.js` today.
- Every `tsconfig.build.json` in `packages/*` is deleted. Each package's `tsconfig.json` is one line naming its kind; the kind configs at the root hold the differences without loosening anything:
  - `tsconfig.node.json`: core, catalog, db, i18n, money, schedule, settings, shared, time. No DOM lib and `types: []`, so a Node-only package still fails on a DOM global.
  - `tsconfig.web.json`: client-core and web-kit. DOM lib and jsx; web-kit names `vite/client` in its own `src/vite-env.d.ts`, so client-core gets no Vite types.
  - `tsconfig.native.json`: mobile-kit. The Expo settings it used before; it names the jest types in `src/jest-env.d.ts`.
- Every package's `build` is `tsgo --noEmit` (a cached type check of its source) and `dev` is `tsgo --noEmit --watch`; turbo keeps `dependsOn: ["^build"]`, so an app's typecheck, tests and bundle re-run when a package they use changes. The kind configs are turbo global dependencies.
- `guard:tsconfig` enforces this shape: a package's only tsconfig is the one-line `tsconfig.json`; a kind config extends only the base and includes only `${configDir}/src`; there is no root `tsconfig.json`; an app extends the base or a kind config.
- Node-run TypeScript (the migration CLI, the seeds, the tool and e2e `node --test` runs) starts with `node --import tsx`, which resolves the packages' extensionless relative imports. Playwright, vitest, jest, Metro, Vite and rolldown resolve the source themselves; the api bundle drops its source resolver, since the exports already name the source. The api and `tools/migrate` drop `NodeNext` for the root base's `Bundler` resolution.
- turbo.json, vitest, Metro and jest-expo, Playwright and every node-run tool script (e2e, `tools/migrate`, `tools/scripts`) keep resolving the packages.

**Proof (CI).** The codemod's fixture tests; typecheck, lint and every workspace's tests with the same counts; the mobile bundles; the api image; e2e; `guard:tsconfig` with the one-line package tsconfigs, the three kind configs and the root `paths` as the only `paths`.

## PR 3 · One testing package (`build/testing-package`)

**Scope.** `packages/testing` (`@ab/testing`) per the vitest-base notes:

- `testConfig({ kind, setupFiles })` is the one vitest base; every workspace's `vitest.config.mts` becomes a call to it (merged with its own plugins where it has some: swc in the api, the React, Tailwind and router plugins on the web).
- No runtime imports in the base (types only), so it loads in every workspace without resolving anything.
- The jest-expo base (`jest.base.cjs`, no workspace dependency) moves out of mobile-kit as `@ab/testing/jest`; the shared jest setup (`jest.shared.cjs`) stays in mobile-kit, because it mocks the kit's own modules, `@ab/time` and `@ab/shared`, and moving it would make a cycle.
- `@ab/config/vite` drops its `test` block: the three web `vite.config.ts` files merge `webConfig(...)` with `testConfig({ kind: 'web', ... })`, so a web build no longer loads vitest.
- `refactor/guards/packages.json` adds `@ab/testing` to the bottom tooling layer with no allowed edges; the packages rule exempts edges into that layer, as it does for `@ab/config`.

**Proof (CI).** The base's unit test; every workspace's test count unchanged apart from the PR's own tests; `guard:packages` shows only the new layer.

## PR 4 · One oxlint and oxfmt base (`build/oxc-base`)

**Scope.** Per the oxc-base notes, on top of #937 (merged as `7316f4cd4`):

- The root `oxlint.config.ts` becomes `export default await repoConfig(import.meta.dirname)`; the discovery of `lint.blocks.mjs` files (`LINT_DIRS`, `lintDirs`) and the core rules live in `@ab/config/oxlint`.
- The lint gates (`oxlint/gate.mjs`, `oxlint/run.mjs`, `lint-gate.mjs`) read `LINT_DIRS`/`lintDirs` from there instead of three copies; the unused `LINT_SCOPE` filter goes.
- The `explicit-module-boundary-types` block is one shared `exportTypes` in `@ab/config/lint` (db, i18n and testing used hand copies); `core-rules.json` drops its unread `plugins` key.
- `oxlint` is pinned once, in the pnpm `catalog:`; `test:all` runs `pnpm lint` (turbo has no lint task).
- The format config stays the root `.oxfmtrc.json` (oxfmt walks up to it; no workspace has its own or a format script). `guard:loosened` now watches it and the root `oxlint.config.ts`.

**Proof.** The `repoConfig` and `lintDirs` unit tests; the effective oxlint config (the JSON the binary receives) byte-identical on the base and the head, dumped from one checkout in a cloud session; `.oxfmtrc.json` unchanged; `guard:loosened` silent; lint green. The CI format check stays off until the format sweep reaches zero (docs/31b §9).

## PR 5 · Short kit public api (`refactor/kits-solid`)

**Scope.** Audit `packages/mobile-kit` (31 exports) and `packages/web-kit` (23 exports) first, then:

- A short deliberate exports list: `.` plus only the entries that keep side-effect or native-heavy modules out of the app's start on Metro.
- Build config out: the babel preset into `@ab/config`, or a small babel package if a dependency makes `@ab/config` wrong.
- Test helpers out to `@ab/testing` when they depend only on external libraries; otherwise kept and exported only to tests.
- Non-UI logic (api client, session, i18n bootstrap, query client) moves to client-core where the layers allow.
- The apps' imports rewritten by a committed codemod (fixture tests first).

**Proof (CI).** Every app import still resolves (typecheck, the mobile bundles, the web build); the mobile startup imports no module the old root entry kept out; test counts unchanged apart from the PR's own; e2e.

## Order

One PR at a time; each starts from the develop that holds the one before it.

| # | Branch | Title | Waits for | CI proves |
|---|---|---|---|---|
| 1 | `build/api-bundle` | `build(api): bundle the api into one file for the image` | #937 | the api boots from the bundle: app.module smoke test, job «api image» (`/health`, PDF sandbox, report PDF), e2e |
| 2 | `build/jit-packages` | `build(repo): ship packages as typescript source` | 1 | typecheck, lint, every workspace's tests, the mobile bundles, the api image and e2e with packages as source and one-line package tsconfigs |
| 3 | `build/testing-package` | `build(repo): add the shared testing package and one vitest base` | 2 | every workspace's test count unchanged through the one base; `guard:packages` shows only the new layer |
| 4 | `build/oxc-base` | `build(repo): one oxlint and oxfmt base in @ab/config` | 3 | the effective lint and format config is identical; `guard:loosened` silent; lint green |
| 5 | `refactor/kits-solid` | `refactor(kits): give mobile-kit and web-kit a short public api` | 4 | every app import resolves; the mobile bundles and startup imports; e2e |

The docs/62 and docs/63 lanes start after PR 5 merges.
