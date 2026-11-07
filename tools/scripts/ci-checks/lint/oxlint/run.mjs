// `pnpm lint:oxfull [-- --prune | --suppress-all]`: Oxlint with every rule of every package
// (oxlint.full.config.ts, type-aware: build the workspace packages first, as turbo lint does) over
// the folders that hold a lint.blocks.mjs. Writes its JSON report to oxlint-report.json, prints
// the time, then holds the report to the oxlint-suppressions.json baselines (oxlint-gate.mjs).
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { oxlintCli, packageDirs } from './gate.mjs';

const ARGS = [
  '-c',
  'oxlint.full.config.ts',
  '--type-aware',
  '--report-unused-disable-directives-severity=error',
  '--format',
  'json',
];

// The root's own binary: `pnpm exec` would print its scope line into the JSON on stdout.
const oxlintBin = (root) => join(root, 'node_modules/.bin/oxlint');

/** Oxlint over `root`'s packages: its report (exit 0 or 1: clean or findings; else it failed). */
export function runOxlint(root) {
  const started = performance.now();
  const run = spawnSync(oxlintBin(root), [...ARGS, ...packageDirs(root)], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 ** 3,
  });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  if (run.status !== 0 && run.status !== 1) throw new Error(`oxlint failed:\n${run.stderr}`);
  console.log(`oxlint: ${seconds} s`);
  return run.stdout;
}

/** The files Oxlint lints with that config (`--debug=files`), repo-relative. */
export function oxlintFiles(root) {
  const args = ['-c', 'oxlint.full.config.ts', '--debug=files', ...packageDirs(root)];
  const run = spawnSync(oxlintBin(root), args, { cwd: root, encoding: 'utf8' });
  return run.stdout.split('\n').filter(Boolean);
}

function main(args) {
  const root = fileURLToPath(new URL('../../../../..', import.meta.url));
  const report = join(root, 'oxlint-report.json');
  writeFileSync(report, runOxlint(root));
  oxlintCli(root, ['--oxlint', report, ...args]);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
