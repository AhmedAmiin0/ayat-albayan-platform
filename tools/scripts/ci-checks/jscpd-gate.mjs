// Duplicated-code gate (docs/27 §4 Wave F): on a PR, jscpd (.jscpd.json, --min-lines 8, tests
// ignored) may not report more clones, more duplicated lines or more cross-app clones than on the
// base branch's own tree (GUARD_BASE: CI checks it out beside the PR and runs jscpd there too).
// Fewer passes: the measure is never stored, so no PR edits a baseline and none conflict.
// Cross-app = the two copies sit in different apps/tools, or one in an app and one in packages/
// (all packages are one unit: lane K splits shared into many, docs/32 correction 10); fixtures and
// fakes not counted.
// Usage: jscpd && [GUARD_BASE=<base checkout>] node tools/scripts/ci-checks/jscpd-gate.mjs
//   (GUARD_BASE: jscpd has run in that checkout too; without it the measure is only printed)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FIXTURE = /fixture|\.fakes?\.|\/testing\/|\/test\//;
const unitOf = (f) => f.match(/^(apps\/[^/]+|packages|tools\/[^/]+|e2e)\//)?.[1] ?? f;

/** `{ clones, duplicatedLines, crossApp }` of a jscpd json report. */
export function measure(report) {
  const { clones, duplicatedLines } = report.statistics.total;
  const crossApp = report.duplicates.filter((d) => {
    const [a, b] = [d.firstFile.name, d.secondFile.name];
    return unitOf(a) !== unitOf(b) && !FIXTURE.test(a) && !FIXTURE.test(b);
  }).length;
  return { clones, duplicatedLines, crossApp };
}

/** One line per measure above the base branch's (new duplication); equal or below passes. */
export function check(now, base) {
  return Object.entries(now)
    .filter(([k, v]) => v > (base[k] ?? 0))
    .map(([k, v]) => `${k}: ${v} > the base branch's ${base[k] ?? 0}`);
}

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));

/** The measure of the jscpd report written in the tree at `dir` (its own .jscpd.json output). */
function measured(dir) {
  const { output } = read(join(dir, '.jscpd.json'));
  return measure(read(join(dir, output, 'jscpd-report.json')));
}

function main() {
  const now = measured(fileURLToPath(new URL('../../..', import.meta.url)));
  const dir = process.env.GUARD_BASE;
  const base = dir ? measured(dir) : now;
  console.log(`jscpd: ${JSON.stringify(now)} (base branch ${dir ? JSON.stringify(base) : 'not given'})`);
  const problems = check(now, base);
  const hint = ': move the shared code to a package (packages/shared, packages/client-core)';
  for (const p of problems) console.log(`  ${p}${hint}`);
  if (problems.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
