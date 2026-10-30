import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renameTable } from './pure-move-paths.mjs';
import { classify, isBarrel, onlyPathsChanged, parseNameStatus } from './pure-move-check.mjs';

const BEFORE = `import { a, b } from '../teachers/http';
import type { T } from "./t";
import './side';
export { c } from './c';
export * from './d';
vi.mock('../teachers/http', () => ({ a: vi.fn() }));
export function f(x: T) {
  return a(x) + (await import('./lazy')).n;
}
`;

test('a path-only change passes, also when an import wraps differently', () => {
  const after = BEFORE.replaceAll('../teachers/http', '../../common/http/http')
    .replace("import { a, b } from '../../common/http/http';", "import {\n  a,\n  b,\n} from '../../common/http/http';")
    .replace("'./lazy'", "'../x/lazy'");
  const ctx = { from: 'apps/api/src/modules/x/a.ts', to: 'apps/api/src/modules/x/a.ts', table: renameTable([['apps/api/src/modules/teachers/http.ts', 'apps/api/src/common/http/http.ts']]) };
  assert.equal(onlyPathsChanged(BEFORE, after, ctx), true);
});

test('any logic, symbol or string edit fails', () => {
  assert.equal(onlyPathsChanged(BEFORE, BEFORE.replace('a(x) +', 'a(x) -')), false);
  assert.equal(onlyPathsChanged(BEFORE, BEFORE.replace('import { a, b }', 'import { a, b as z }')), false);
  assert.equal(onlyPathsChanged(BEFORE, BEFORE.replace("export { c }", "export { c, e }")), false);
  assert.equal(onlyPathsChanged(BEFORE, `${BEFORE}const route = '/admin';\n`), false);
  assert.equal(onlyPathsChanged(BEFORE, BEFORE.replace("import './side';\n", '')), false);
  assert.equal(onlyPathsChanged("const k = ['a'];", "const k = ['b'];"), false);
});

test('only index.ts files made of export-from lines are barrels', () => {
  assert.equal(isBarrel('a/index.ts', "export { a, type B } from './a';\nexport {\n  c,\n} from './c';\n"), true);
  assert.equal(isBarrel('a/index.ts', "export * from './a';\nexport const x = 1;\n"), false);
  assert.equal(isBarrel('a/index.ts', "import { a } from './a';\n"), false);
  assert.equal(isBarrel('a/other.ts', "export { a } from './a';\n"), false);
});

test('classifies renames, path rewrites, barrels, config and the rest', () => {
  const files = { 'base:a.ts': BEFORE, 'head:b/a.ts': BEFORE.replace("'./t'", "'../t'"), 'head:x/index.ts': "export { a } from './a';\n", 'head:new.ts': 'export const n = 1;\n' };
  const read = (side, f) => files[`${side}:${f}`] ?? '';
  assert.equal(classify({ status: 'R100', from: 'a', to: 'b' }, read).kind, 'rename');
  assert.equal(classify({ status: 'R091', from: 'a.ts', to: 'b/a.ts' }, read).kind, 'paths');
  assert.equal(classify({ status: 'A', from: 'x/index.ts', to: 'x/index.ts' }, read).kind, 'barrel');
  assert.equal(classify({ status: 'A', from: 'new.ts', to: 'new.ts' }, read).kind, 'bad');
  assert.equal(classify({ status: 'D', from: 'a.ts', to: 'a.ts' }, read).kind, 'bad');
  assert.equal(classify({ status: 'M', from: 'docs/x.md', to: 'docs/x.md' }, read).kind, 'paths');
  assert.equal(classify({ status: 'M', from: '.github/workflows/ci.yml', to: '.github/workflows/ci.yml' }, read).kind, 'config');
  assert.equal(classify({ status: 'M', from: 'apps/web/vitest.config.ts', to: 'apps/web/vitest.config.ts' }, read).kind, 'config');
  assert.equal(classify({ status: 'M', from: 'packages/db/x.sql', to: 'packages/db/x.sql' }, read).kind, 'bad');
});

test('parses git name-status lines', () => {
  assert.deepEqual(parseNameStatus('R100\ta.ts\tb.ts\nM\tc.ts\n'), [
    { status: 'R100', from: 'a.ts', to: 'b.ts' },
    { status: 'M', from: 'c.ts', to: 'c.ts' },
  ]);
});

test('end to end on a git repo: a move passes, a logic edit fails', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pure-move-'));
  const git = (...a) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: dir, encoding: 'utf8' });
  const script = fileURLToPath(new URL('./pure-move-check.mjs', import.meta.url));
  const run = () => {
    try {
      return { code: 0, out: execFileSync('node', [script, 'base'], { cwd: dir, encoding: 'utf8' }) };
    } catch (e) {
      return { code: e.status, out: String(e.stdout) };
    }
  };
  git('init', '-q', '-b', 'base');
  mkdirSync(join(dir, 'm'));
  writeFileSync(join(dir, 'm/http.ts'), 'export const a = 1;\n'.repeat(20));
  writeFileSync(join(dir, 'm/use.ts'), "import { a } from './http';\nexport const b = a + 1;\n".repeat(10));
  git('add', '.');
  git('commit', '-qm', 'base');
  git('checkout', '-qb', 'head');
  mkdirSync(join(dir, 'common'));
  renameSync(join(dir, 'm/http.ts'), join(dir, 'common/http.ts'));
  writeFileSync(join(dir, 'm/use.ts'), "import { a } from '../common/http';\nexport const b = a + 1;\n".repeat(10));
  git('add', '-A');
  git('commit', '-qm', 'move');
  assert.equal(run().code, 0);
  writeFileSync(join(dir, 'm/use.ts'), "import { a } from '../common/http';\nexport const b = a + 2;\n".repeat(10));
  git('commit', '-qam', 'edit');
  const bad = run();
  assert.equal(bad.code, 1);
  assert.match(bad.out, /m\/use\.ts: changes more than/);
});

test('a changed path must name the same file at its new place', () => {
  const ctx = { from: 'apps/api/src/m/use.ts', to: 'apps/api/src/m/use.ts', table: renameTable([['apps/api/src/m/http.ts', 'apps/api/src/common/http.ts']]) };
  const src = "import { a } from './http';\nimport { b } from './y';\nconst l = import('./http');\nvi.stubEnv('A', '1');\n";
  const ok = src.replaceAll("'./http'", "'../common/http'");
  assert.equal(onlyPathsChanged(src, ok, ctx), true);
  assert.equal(onlyPathsChanged(src, src.replace("'./y'", "'./z'"), ctx), false, 'a path to an unmoved file');
  assert.equal(onlyPathsChanged(src, ok.replace("import('../common/http')", "import('./y')"), ctx), false);
  assert.equal(onlyPathsChanged(src, src.replace("{ a } from './http';\nimport { b } from './y'", "{ b } from './http';\nimport { a } from './y'"), ctx), false, 'names swapped');
  assert.equal(onlyPathsChanged(src, src.replace("'A'", "'B'"), ctx), false, 'vi.stubEnv is not a path');
});

test('docs and JSON may change only by whole moved paths', () => {
  const files = { 'base:docs/a.json': '["apps/api/src/env.ts", "x"]', 'head:docs/a.json': '["apps/api/src/config/env/env.ts", "x"]' };
  const read = (side, f) => files[`${side}:${f}`] ?? '';
  const ctx = { renames: [['apps/api/src/env.ts', 'apps/api/src/config/env/env.ts']] };
  assert.equal(classify({ status: 'M', from: 'docs/a.json', to: 'docs/a.json' }, read, ctx).kind, 'paths');
  files['head:docs/a.json'] = '["apps/api/src/config/env/env.ts", "y"]';
  assert.equal(classify({ status: 'M', from: 'docs/a.json', to: 'docs/a.json' }, read, ctx).kind, 'bad');
});

test('a shrunk folder-cap allow-list is a baseline edit, a grown one fails, a new move map is config', () => {
  const cap = (n) => `{ "a": { "files": ${n}, "dirs": 0 }, "b": { "files": 14, "dirs": 0 } }`;
  const files = { 'base:refactor/folder-cap/web.json': cap(13), 'head:refactor/folder-cap/web.json': '{ "a": { "files": 13, "dirs": 0 } }' };
  const read = (side, f) => files[`${side}:${f}`] ?? '';
  const web = { status: 'M', from: 'refactor/folder-cap/web.json', to: 'refactor/folder-cap/web.json' };
  assert.equal(classify(web, read).kind, 'paths');
  files['head:refactor/folder-cap/web.json'] = cap(14);
  assert.equal(classify(web, read).kind, 'bad');
  assert.equal(classify({ status: 'A', from: 'refactor/moves/b1.json', to: 'refactor/moves/b1.json' }, read).kind, 'config');
});

test('an @/ path in a mobile route file (apps/mobile/app) resolves to the app src', () => {
  const file = 'apps/mobile/app/login.tsx';
  const ctx = { from: file, to: file, table: renameTable([['apps/mobile/src/ui/AppText.tsx', 'apps/mobile/src/core/ui/primitives/AppText.tsx']]) };
  const src = "import { AppText } from '@/ui/AppText';\n";
  assert.equal(onlyPathsChanged(src, src.replace('@/ui/AppText', '@/core/ui/primitives/AppText'), ctx), true);
  assert.equal(onlyPathsChanged(src, src.replace('@/ui/AppText', '@/core/ui/AppText'), ctx), false);
});
