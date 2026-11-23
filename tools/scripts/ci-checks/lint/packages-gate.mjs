// Package boundaries (CLAUDE.md rule 23): apps never depend on each other and packages depend only
// on lower layers, as refactor/guards/packages.json lists them. On a PR, CI checks the base branch
// out beside the head (GUARD_BASE); both sides are scanned with the head's table, and only what the
// head adds fails: a new extra edge, more cross-workspace re-exports, `@ab/db` imports outside
// the api's repositories or files naming an owner-held name through '@ab/shared'. Edges into an
// app, a table error and `@/` in a package fail everywhere.
// Usage: [GUARD_BASE=<base checkout>] node tools/scripts/ci-checks/lint/packages-gate.mjs
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withFacade } from './packages-facade.mjs';
import { decide } from './packages-rules.mjs';
import { scan } from './packages-scan.mjs';
import { readTable, readTableIfAny } from './packages-table.mjs';

const TABLE = join('refactor', 'guards', 'packages.json');

function timed(label, root) {
  const start = performance.now();
  const facts = withFacade(root, scan(root));
  const seconds = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`packages: ${label} scanned ${facts.files} code files in ${seconds}s`);
  return facts;
}

function main() {
  const root = fileURLToPath(new URL('../../../..', import.meta.url));
  const dir = process.env.GUARD_BASE;
  const table = readTable(join(root, TABLE));
  const head = timed('head', root);
  const base = dir === undefined || dir === '' ? undefined : timed('base', dir);
  const baseTable = base === undefined ? undefined : readTableIfAny(join(dir ?? '', TABLE));
  const { lines, warnings, failed } = decide({ table, baseTable, head, base });
  for (const line of [...warnings, ...lines]) console.log(line);
  if (failed) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
