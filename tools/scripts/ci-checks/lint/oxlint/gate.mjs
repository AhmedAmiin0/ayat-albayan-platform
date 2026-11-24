// `pnpm guard:lint -- --oxlint <report.json> [--prune]`: Oxlint's report against every package's
// oxlint-suppressions.json (baseline.mjs). `--prune` lowers the counts the report no longer
// reaches; nothing ever writes a new entry or a higher count (docs/31b §4).
import { existsSync, globSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { readJson } from '../json-file.mjs';
import { compare, countsOf, pruned } from './baseline.mjs';
import { baselineFile, oxlintReport } from './schemas.mjs';
import { scoped } from './scope.mjs';

export const BASELINE = 'oxlint-suppressions.json';
const DIRS = ['apps/*', 'packages/*', 'tools/*', 'e2e', 'docs/design/brand/tools'];

/**
 * The packages Oxlint lints: every folder with a lint.blocks.mjs (oxlint.config.ts), kept
 * by LINT_SCOPE (scope.mjs; unset = all).
 */
export const packageDirs = (root) =>
  scoped(
    globSync(
      DIRS.map((dir) => `${dir}/lint.blocks.mjs`),
      { cwd: root },
    )
      .map(dirname)
      .sort(),
    process.env.LINT_SCOPE,
  );

const readBaseline = (path) => (existsSync(path) ? readJson(path, baselineFile) : {});
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

/** What each mode writes for a package: the pruned baseline, or nothing. */
const WRITES = {
  prune: (now, base) => pruned(now, base),
  check: () => undefined,
};

/** Runs the gate; returns the failure lines (none: the report matches every baseline). */
export function oxlintGate({ root, report, mode = 'check' }) {
  if (!Object.hasOwn(WRITES, mode)) throw new Error(`unknown mode: ${mode}`);
  const dirs = packageDirs(root);
  const now = countsOf(readJson(report, oxlintReport).diagnostics, dirs);
  const outside = Object.keys(now[''] ?? {}).map((file) => `outside any package: ${file}`);
  const lines = dirs.flatMap((dir) => {
    const path = join(root, dir, BASELINE);
    const written = WRITES[mode](now[dir] ?? {}, readBaseline(path));
    if (written) writeJson(path, written);
    const { above, below } = compare(dir, now[dir] ?? {}, readBaseline(path));
    return [
      ...above.map((line) => `new violation: ${line} (fix it)`),
      ...below.map((line) => `fixed: ${line} (pnpm lint:prune, commit ${BASELINE})`),
    ];
  });
  return [...outside, ...lines];
}

/** The `--oxlint <report>` command line: prints the failures, exits 1 on any. */
export function oxlintCli(root, args) {
  const report = args[args.indexOf('--oxlint') + 1] ?? '';
  const mode = args.includes('--prune') ? 'prune' : 'check';
  const lines = oxlintGate({ root, report, mode });
  console.log(`oxlint: ${report} against every package's ${BASELINE} (${mode})`);
  for (const line of lines) console.log(`  ${line}`);
  if (lines.length > 0) process.exit(1);
}
