// Dead-code gate (docs/27 §4 Wave F): knip (knip.json) may not report an issue that is not in
// refactor/guards/knip.json. The baseline lists what knip still reports on purpose (module barrels'
// public API, names kept by e8; see docs/27 §5a e8). Fixed entries only print a note: shrink the
// baseline with --write.
// Usage: knip --reporter json --no-exit-code | node tools/scripts/ci-checks/knip-gate.mjs [--write]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const nameOf = (item) => (Array.isArray(item) ? item.map(nameOf).join('|') : (item?.name ?? String(item)));

/** One sorted `<file> <kind> <name>` line per issue of a knip json report. */
export function flatten(report) {
  const out = (report.files ?? []).map((f) => `${f} files`);
  for (const { file, ...kinds } of report.issues ?? []) {
    for (const [kind, items] of Object.entries(kinds)) {
      const list = Array.isArray(items) ? items.map(nameOf) : Object.keys(items ?? {}).flatMap((k) => (items[k] ?? []).map((i) => `${k}.${nameOf(i)}`));
      for (const name of list) out.push(`${file} ${kind} ${name}`);
    }
  }
  return [...new Set(out)].sort();
}

/** `{ added, fixed }` against the baseline lines. */
export function compare(now, baseline) {
  const was = new Set(baseline);
  const is = new Set(now);
  return { added: now.filter((l) => !was.has(l)), fixed: baseline.filter((l) => !is.has(l)) };
}

function main(args) {
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  const now = flatten(JSON.parse(readFileSync(0, 'utf8')));
  const file = join(root, 'refactor', 'guards', 'knip.json');
  if (args.includes('--write')) writeFileSync(file, `${JSON.stringify(now, null, 2)}\n`);
  const baseline = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  const { added, fixed } = compare(now, baseline);
  console.log(`knip: ${now.length} issues, baseline ${baseline.length}, new ${added.length}, fixed ${fixed.length}`);
  for (const l of added) console.log(`  new: ${l}`);
  if (fixed.length > 0) console.log('  (fixed entries can leave the baseline: pnpm guard:knip -- --write)');
  if (added.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
