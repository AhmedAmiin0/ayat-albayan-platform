// `pnpm lint` (`pnpm lint:prune` adds --prune): Oxlint with every rule of every package
// (oxlint.config.ts, type-aware, warnings denied) over the folders that hold a lint.blocks.mjs.
// Writes its JSON report to oxlint-report.json, prints the time, then holds the report to the
// oxlint-suppressions.json baselines (gate.mjs). Type-aware rules read the packages' TypeScript
// source through each package's tsconfig.json.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readJson } from '../json-file.mjs';
import { lintDirs } from '@ab/config/oxlint';
import { oxlintCli } from './gate.mjs';
import { rootManifest } from './schemas.mjs';

/**
 * The root's `lint:report` script (oxlint.config.ts, type-aware, warnings denied, JSON), run with
 * the root's own binary: through pnpm, its warnings would land in the JSON on stdout.
 */
export function lintReport(root) {
  const [bin = '', ...args] = readJson(join(root, 'package.json'), rootManifest)
    .scripts['lint:report'].split(' ');
  return { bin: join(root, 'node_modules/.bin', bin), args };
}

/** Oxlint over `root`'s packages: its report (exit 0 or 1: clean or findings; else it failed). */
function runOxlint(root) {
  const started = performance.now();
  const { bin, args } = lintReport(root);
  const run = spawnSync(bin, [...args, ...lintDirs(root)], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 ** 3,
  });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  if (run.status !== 0 && run.status !== 1) throw new Error(`oxlint failed:\n${run.stderr}`);
  console.log(`oxlint: ${seconds} s`);
  return run.stdout;
}

function main(args) {
  const root = fileURLToPath(new URL('../../../../..', import.meta.url));
  const report = join(root, 'oxlint-report.json');
  writeFileSync(report, runOxlint(root));
  oxlintCli(root, ['--oxlint', report, ...args]);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
