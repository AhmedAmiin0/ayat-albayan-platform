// Duplicated-code gate (docs/27 §4 Wave F): jscpd (.jscpd.json, --min-lines 8, tests ignored) may not report
// more clones, more duplicated lines or more cross-app clones than refactor/guards/jscpd.json, and a
// measure below it fails too until the baseline is lowered with --write (the freed room is not reused). Cross-app = the two copies sit in different apps/packages/tools,
// fixtures and fakes not counted.
// Usage: node tools/scripts/ci-checks/jscpd-gate.mjs [--write]   (after `jscpd`, which writes the report)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FIXTURE = /fixture|\.fakes?\.|\/testing\/|\/test\//;
const unitOf = (f) => f.match(/^(apps\/[^/]+|packages\/[^/]+|tools\/[^/]+|e2e)\//)?.[1] ?? f;

/** `{ clones, duplicatedLines, crossApp }` of a jscpd json report. */
export function measure(report) {
  const { clones, duplicatedLines } = report.statistics.total;
  const crossApp = report.duplicates.filter((d) => {
    const [a, b] = [d.firstFile.name, d.secondFile.name];
    return unitOf(a) !== unitOf(b) && !FIXTURE.test(a) && !FIXTURE.test(b);
  }).length;
  return { clones, duplicatedLines, crossApp };
}

/** One line per measure that differs from its baseline: above it is new duplication, below it a stale baseline. */
export function check(now, baseline) {
  return Object.entries(now)
    .filter(([k, v]) => v !== (baseline[k] ?? 0))
    .map(([k, v]) => (v > (baseline[k] ?? 0) ? `${k}: ${v} > baseline ${baseline[k] ?? 0}` : `${k}: ${v} < baseline ${baseline[k]}, lower it: pnpm guard:dup -- --write`));
}

function main(args) {
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  const config = JSON.parse(readFileSync(join(root, '.jscpd.json'), 'utf8'));
  const now = measure(JSON.parse(readFileSync(join(root, config.output, 'jscpd-report.json'), 'utf8')));
  const file = join(root, 'refactor', 'guards', 'jscpd.json');
  if (args.includes('--write')) writeFileSync(file, `${JSON.stringify(now, null, 2)}\n`);
  const baseline = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  console.log(`jscpd: ${JSON.stringify(now)} (baseline ${JSON.stringify(baseline)})`);
  const problems = check(now, baseline);
  for (const p of problems) console.log(`  ${p}${p.includes(' > ') ? ': move the shared code to packages/shared or packages/client-core' : ''}`);
  if (problems.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
