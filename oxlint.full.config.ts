// Every ESLint rule of every package, under Oxlint (docs/31b-oxlint-mapping.md): the .oxlintrc.json
// rules plus, per package, the base rules of @ab/config and its own lint.blocks.mjs, scoped to its
// folder. `pnpm lint:oxfull` runs it; `pnpm lint:parity` checks it misses nothing ESLint finds.
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
const oxlintrc = JSON.parse(readFileSync(`${root}/.oxlintrc.json`, 'utf8'));

export default compose({ oxlintrc, packages });
