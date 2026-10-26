// Folder cap (docs/27 §1 rule 4): ≈ 12 code files (tests not counted) and ≈ 12 sub-folders per folder.
// Usage: node tools/scripts/folder-cap.mjs [--strict] [--write <app>…]
//   default   report only (exit 0): new crowded folders, allow-listed folders that grew, stale entries
//   --strict  exit 1 on any of those (Wave F turns this on with empty allow-lists)
//   --write   rewrite refactor/folder-cap/<app>.json from today's tree (one file per app: lanes never share one)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const MAX = 12;
const CODE = /\.[cm]?[jt]sx?$/;
const TEST = /\.(test|spec)\.[cm]?[jt]sx?$/;
const SKIP = new Set(['node_modules', 'dist', 'build', 'coverage', '.turbo', '.expo', '__snapshots__']);

const dirs = (root, rel) =>
  existsSync(join(root, rel))
    ? readdirSync(join(root, rel), { withFileTypes: true }).filter((d) => d.isDirectory() && !SKIP.has(d.name))
    : [];

/** The scanned roots of each app; packages and tools are lane D. */
export function appRoots(root) {
  const under = (group, sub) => dirs(root, group).map((d) => join(group, d.name, sub).replace(/\/$/, ''));
  return {
    api: ['apps/api/src'],
    web: ['apps/web/src'],
    mobile: ['apps/mobile/src', 'apps/mobile/app'],
    packages: under('packages', 'src').filter((p) => existsSync(join(root, p))),
    tools: under('tools', ''),
  };
}

/** `{ folder: { files, dirs } }` for every folder under `rel`. */
export function measure(root, rel) {
  if (!existsSync(join(root, rel))) return {};
  const entries = readdirSync(join(root, rel), { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && CODE.test(e.name) && !TEST.test(e.name)).length;
  const subs = entries.filter((e) => e.isDirectory() && !SKIP.has(e.name));
  const out = { [rel]: { files, dirs: subs.length } };
  for (const s of subs) Object.assign(out, measure(root, join(rel, s.name)));
  return out;
}

export const crowded = (counts) =>
  Object.fromEntries(Object.entries(counts).filter(([, c]) => c.files > MAX || c.dirs > MAX).sort(([a], [b]) => a.localeCompare(b)));

/** New crowded folders, allow-listed folders that grew, and allow-list entries that are no longer needed. */
export function check(counts, allow) {
  const problems = [];
  for (const [folder, c] of Object.entries(crowded(counts))) {
    const ok = allow[folder];
    if (ok === undefined) problems.push(`new: ${folder} has ${c.files} code files, ${c.dirs} folders (max ${MAX})`);
    else if (c.files > ok.files || c.dirs > ok.dirs) problems.push(`grew: ${folder} ${ok.files}/${ok.dirs} → ${c.files}/${c.dirs}`);
  }
  for (const folder of Object.keys(allow)) {
    const c = counts[folder];
    if (c === undefined || (c.files <= MAX && c.dirs <= MAX)) problems.push(`stale: ${folder} is within the cap; remove it from the allow-list`);
  }
  return problems;
}

const allowFile = (root, app) => join(root, 'refactor', 'folder-cap', `${app}.json`);

function main(args) {
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  const roots = appRoots(root);
  const write = args.includes('--write') ? args.filter((a) => !a.startsWith('--')) : [];
  let total = 0;
  for (const [app, rels] of Object.entries(roots)) {
    const counts = Object.assign({}, ...rels.map((r) => measure(root, r)));
    if (write.includes(app)) writeFileSync(allowFile(root, app), `${JSON.stringify(crowded(counts), null, 2)}\n`);
    const file = allowFile(root, app);
    const allow = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    const problems = check(counts, allow);
    console.log(`folder-cap ${app}: ${Object.keys(crowded(counts)).length} crowded folders, ${Object.keys(allow).length} allow-listed`);
    for (const p of problems) console.log(`  ${p}`);
    total += problems.length;
  }
  if (total > 0 && args.includes('--strict')) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
