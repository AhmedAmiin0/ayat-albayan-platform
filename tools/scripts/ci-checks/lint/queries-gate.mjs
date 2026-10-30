// Repositories, not queries (docs/32 R8, D2, correction 14): no new `*queries.ts(x)` file and no new
// `class XQueries` in apps/, packages/ or e2e/. refactor/guards/queries.json lists the ones that predate
// the rule; lane R renames them to `x.repo.ts` / `XRepo`. A listed file that is gone or no longer
// qualifies fails too until it leaves the list (--write), so the list only shrinks.
// Usage: node tools/scripts/ci-checks/lint/queries-gate.mjs [--write]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOTS = ['apps', 'packages', 'e2e'];
const NAME = /queries\.tsx?$/;
const CLASS = /\bclass \w+Queries\b/;

/** True when `path` (with its `read()` text) is a queries file: by name, or by a `class XQueries`. */
export function isQueries(path, read) {
  if (!/\.tsx?$/.test(path)) return false;
  return NAME.test(path) || CLASS.test(read());
}

/** `{ added, fixed }`: queries files not in the list, and listed files that are not queries files now. */
export function compare(now, listed) {
  const is = new Set(now);
  const was = new Set(listed);
  return { added: now.filter((f) => !was.has(f)), fixed: listed.filter((f) => !is.has(f)) };
}

function main(args) {
  const root = fileURLToPath(new URL('../../../..', import.meta.url));
  const tracked = execFileSync('git', ['ls-files', '--', ...ROOTS], { cwd: root, encoding: 'utf8' });
  const paths = tracked.split('\n').filter((p) => p !== '' && existsSync(join(root, p)));
  const now = paths.filter((p) => isQueries(p, () => readFileSync(join(root, p), 'utf8'))).sort();
  const file = join(root, 'refactor', 'guards', 'queries.json');
  if (args.includes('--write')) writeFileSync(file, `${JSON.stringify(now, null, 2)}\n`);
  const listed = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  const { added, fixed } = compare(now, listed);
  console.log(`queries: ${now.length} files, listed ${listed.length}, new ${added.length}, gone ${fixed.length}`);
  for (const f of added) console.log(`  new: ${f} (a repository: x.repo.ts with class XRepo)`);
  for (const f of fixed) console.log(`  gone: ${f} (pnpm guard:queries -- --write)`);
  if (added.length + fixed.length > 0) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
