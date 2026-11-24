// The one lint config (docs/31b-oxlint-mapping.md): @ab/config's core rules, then per package the
// base rules of @ab/config and its own lint.blocks.mjs, scoped to its folder. `pnpm lint` runs it
// type-aware and holds the report to each package's oxlint-suppressions.json.
import { globSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compose } from '@ab/config/oxlint';

const DIRS = ['apps/*', 'packages/*', 'tools/*', 'e2e', 'docs/design/brand/tools'];
const root = import.meta.dirname;
const files = globSync(
  DIRS.map((dir) => `${dir}/lint.blocks.mjs`),
  { cwd: root },
).sort();
const packages = await Promise.all(
  files.map(async (file) => {
    const { default: lint } = await import(`./${file}`);
    return { dir: dirname(file), ...lint };
  }),
);
const core = `${root}/packages/config/oxlint/core-rules.json`;
const oxlintrc = JSON.parse(readFileSync(core, 'utf8'));

export default compose({ oxlintrc, packages });
