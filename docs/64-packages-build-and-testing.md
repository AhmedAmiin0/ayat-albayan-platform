# 64 · Packages as TypeScript source, one api bundle, one testing and lint base

Plan for how the workspace packages are built, imported and tested. Today every package compiles to `dist/` with its own `tsconfig.json` + `tsconfig.build.json`, imports its own files as `./x.js`, and every workspace carries its own vitest, oxlint and babel pieces. These five PRs make packages plain TypeScript source that the apps compile, with one base for each tool. They land before the docs/62 and docs/63 lanes; those lanes' drivers wait for every PR in «Order». Counts below were read on develop `7316f4cd4`; every PR recounts on current develop.

## Decisions (owner, 2026-11-25)

Owner directives:

- **Packages are Just-in-Time:** «just export ./src and make dev script and build script for all the packages». Every package's `exports` points at `./src` TypeScript; every package still has a real `dev` and `build` script.
- **No extension in imports:** «inside the packages why are we using .js», «i dont want to import .js files». No `./x.js`, `./x.ts` or `/index` in any specifier, packages included; no `#` imports; packages never use `@/`.
- **No per-package tsconfig:** «no need for tsconfig and ts.config.build in all the packages set the common in the base». `packages/*` hold no tsconfig file; shared settings live in the root `tsconfig.base.json` plus one root `tsconfig.json` over `packages/*/src`.
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
- `packages/*/tsconfig.json` and `tsconfig.build.json` are deleted. Their shared settings move to the root `tsconfig.base.json`, plus one root `tsconfig.json` that covers `packages/*/src`.
- The per-package differences are expressed centrally without loosening anything: DOM lib for client-core and web-kit, jsx and `vite/client` for web-kit, Expo settings for mobile-kit, test types. A Node-only package must still fail on DOM globals; where one config cannot express that, a lint rule or a guard does.
- Every package gets a real `build` (a cached type check of the package, or the root check scoped to it) and `dev` (its watch).
- turbo.json, vitest, Metro and jest-expo, Playwright and every node-run tool script (e2e, `tools/migrate`, `tools/scripts`) keep resolving the packages.

**Proof (CI).** The codemod's fixture tests; typecheck, lint and every workspace's tests with the same counts; the mobile bundles; the api image; e2e; `guard:tsconfig` with no package tsconfig and the root `paths` as the only `paths`.

## PR 3 · One testing package (`build/testing-package`)

**Scope.** `packages/testing` (`@ab/testing`) per the vitest-base notes:

- `testConfig({ kind, setupFiles })` is the one vitest base; every workspace's `vitest.config.mts` becomes a call to it (merged with its own plugins where it has some: swc in the api, the React, Tailwind and router plugins on the web).
- No runtime imports in the base (types only), so it loads in every workspace without resolving anything.
- The jest-expo base and setup move out of mobile-kit into `@ab/testing` when they have no workspace dependency.
- `refactor/guards/packages.json` adds `@ab/testing` to the bottom tooling layer with no allowed edges; the packages rule exempts edges into that layer, as it does for `@ab/config`.

**Proof (CI).** The base's unit test; every workspace's test count unchanged apart from the PR's own tests; `guard:packages` shows only the new layer.

## PR 4 · One oxlint and oxfmt base (`build/oxc-base`)

**Scope.** Per the oxc-base notes, on top of #937 (merged as `7316f4cd4`): the root `oxlint.config.ts` becomes `export default await repoConfig(import.meta.dirname)` with the discovery of `lint.blocks.mjs` files and the core rules inside `@ab/config`; the format config stays the root `.oxfmtrc.json`, and every workspace's format and lint scripts use it.

**Proof.** The `repoConfig` unit test; the effective oxlint config (the JSON the binary receives) and the oxfmt config per workspace identical on the base and the head, dumped from one checkout in a cloud session; `guard:loosened` silent; lint and `format:check` green.

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
| 2 | `build/jit-packages` | `build(repo): ship packages as typescript source` | 1 | typecheck, lint, every workspace's tests, the mobile bundles, the api image and e2e with packages as source and no package tsconfig |
| 3 | `build/testing-package` | `build(repo): add the shared testing package and one vitest base` | 2 | every workspace's test count unchanged through the one base; `guard:packages` shows only the new layer |
| 4 | `build/oxc-base` | `build(repo): one oxlint and oxfmt base in @ab/config` | 3 | the effective lint and format config is identical; `guard:loosened` silent; lint and format green |
| 5 | `refactor/kits-solid` | `refactor(kits): give mobile-kit and web-kit a short public api` | 4 | every app import resolves; the mobile bundles and startup imports; e2e |

The docs/62 and docs/63 lanes start after PR 5 merges.
