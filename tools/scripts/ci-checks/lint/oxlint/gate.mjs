// `pnpm guard:lint -- --oxlint <report.json> [--prune]`: Oxlint's report against every package's
// oxlint-suppressions.json (baseline.mjs). `--prune` lowers the counts the report no longer
// reaches and deletes a baseline left empty; nothing writes a new one (docs/59: no suppressions).
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { lintDirs } from '@ab/config/oxlint';
import { readJson } from '../json-file.mjs';
import { compare, countsOf, pruned } from './baseline.mjs';
import { baselineFile, oxlintReport } from './schemas.mjs';

export const BASELINE = 'oxlint-suppressions.json';

const readBaseline = (path) => (existsSync(path) ? readJson(path, baselineFile) : {});

/** Writes the pruned baseline of a package that has one; deletes it when no entry is left. */
function prune(path, now) {
  if (!existsSync(path)) return;
  const kept = pruned(now, readBaseline(path));
  const write = () => writeFileSync(path, `${JSON.stringify(kept, null, 2)}\n`);
  const save = Object.keys(kept).length === 0 ? () => rmSync(path) : write;
  save();
}

const WRITES = { prune, check: () => undefined };

/** Runs the gate; returns the failure lines (none: the report matches every baseline). */
export function oxlintGate({ root, report, mode = 'check' }) {
  if (!Object.hasOwn(WRITES, mode)) throw new Error(`unknown mode: ${mode}`);
  const writes = WRITES[mode];
  const dirs = lintDirs(root);
  const now = countsOf(readJson(report, oxlintReport).diagnostics, dirs);
  const outside = Object.keys(now[''] ?? {}).map((file) => `outside any package: ${file}`);
  const lines = dirs.flatMap((dir) => {
    const path = join(root, dir, BASELINE);
    writes(path, now[dir] ?? {});
    const { above, below } = compare(dir, now[dir] ?? {}, readBaseline(path));
    return [
      ...above.map((line) => `new violation: ${line} (fix it)`),
      ...below.map((line) => `fixed: ${line} (pnpm lint:prune, commit ${BASELINE})`),
    ];
  });
  return [...outside, ...lines];
}

const MODES = ['prune'];

/** The `--oxlint <report>` command line: prints the failures, exits 1 on any. */
export function oxlintCli(root, args) {
  const report = args[args.indexOf('--oxlint') + 1] ?? '';
  const mode = MODES.find((name) => args.includes(`--${name}`)) ?? 'check';
  const lines = oxlintGate({ root, report, mode });
  console.log(`oxlint: ${report} against every package's ${BASELINE} (${mode})`);
  for (const line of lines) console.log(`  ${line}`);
  if (lines.length > 0) process.exit(1);
}
