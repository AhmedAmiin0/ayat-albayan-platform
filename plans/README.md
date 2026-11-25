# Plan inputs for docs/64 and docs/62

Finished design notes the cloud builders read while writing docs/64-packages-build-and-testing.md and the docs/62 «Deriving variants from one schema» section. This branch is never merged; the docs land inside the first infra PR and PR A.

- `vitest-base.md`: one shared vitest base in a new test-only package `@ab/testing` (TS source, no workspace dependencies; builders stay in their owning packages).
- `oxc-base.md`: one oxlint + oxfmt base in `@ab/config`, on top of #937 (merged as 7316f4cd4).
- `zod-variants.md`: helpers in `@ab/core/schemas` to derive full / partial (patch) / pick / omit variants from one shape plus refinements, and to resolve the object behind wrappers.

Owner directives (2026-11-25) that override these notes where they differ:
- «just export ./src and make dev script and build script for all the packages»: every package is Just-in-Time (exports point at ./src TypeScript), with a real dev and build script.
- «no need for tsconfig and ts.config.build in all the packages set the common in the base»: packages/* have no tsconfig.json and no tsconfig.build.json; shared settings live in the root tsconfig.base.json (plus a root tsconfig.json if needed).
  - UPDATED by the owner the same day, after seeing a generated-config script (`ab-ts-check`): «i dont like this wierd scripts you added in jit», then chose «One-line tsconfig per package». The final shape:
    - root: `tsconfig.base.json` (every common setting) plus one config per package kind, each extending the base and holding only that kind's differences and `"include": ["${configDir}/src"]`: `tsconfig.node.json` (Node-only packages: no DOM lib, `types: []`), `tsconfig.web.json` (DOM lib, jsx, `vite/client` where needed), `tsconfig.native.json` (the Expo settings mobile-kit uses today);
    - each package: a one-line `tsconfig.json`, exactly `{ "extends": "../../tsconfig.<kind>.json" }`, and NO tsconfig.build.json;
    - each package's scripts are plain: `"build": "tsgo --noEmit"`, `"dev": "tsgo --noEmit --watch"` (plus its test/lint scripts); no custom CLI, no generated config, no `packages/config/ts/check.js` or `kinds.js`, no root tsconfig.json for packages;
    - an app's tsconfig extends the base (or a kind config) only.
- «i dont want to import .js files»: no extension in any import specifier, packages included.
- «make the vitest config in one base package for testing», «same for oxc».
- About mobile-kit's 30-line exports map: «then this package is not solid»; «if you need to create a package for babel create it».
- «use defaults for all and start the builders».
