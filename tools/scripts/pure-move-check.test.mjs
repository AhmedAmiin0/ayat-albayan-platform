import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
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
  assert.equal(onlyPathsChanged(BEFORE, after), true);
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
  assert.equal(classify({ status: 'M', from: 'docs/x.md', to: 'docs/x.md' }, read).kind, 'config');
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
