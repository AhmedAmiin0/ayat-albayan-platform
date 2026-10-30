// End to end on a git repo: a move of a file with ESLint bulk suppressions (keyed package-relative).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./pure-move-check.mjs', import.meta.url));
const SUPP = 'apps/web/eslint-suppressions.json';
const suppressions = (moved, count = 2) =>
  `${JSON.stringify({ 'src/a.ts': { 'ab/module-boundaries': { count: 1 } }, [moved]: { 'ab/module-boundaries': { count } } }, null, 2)}\n`;

/** A repo whose head moves apps/web/src/lib/api.ts to src/core/ with the suppressions file as `edit` writes it. */
function repo(edit) {
  const dir = mkdtempSync(join(tmpdir(), 'pure-move-supp-'));
  const git = (...a) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: dir, encoding: 'utf8' });
  const write = (f, text) => {
    mkdirSync(join(dir, f, '..'), { recursive: true });
    writeFileSync(join(dir, f), text);
  };
  git('init', '-q', '-b', 'base');
  write('apps/web/src/lib/api.ts', 'export const api = 1;\n'.repeat(20));
  write('apps/web/src/a.ts', 'export const a = 1;\n');
  write(SUPP, suppressions('src/lib/api.ts'));
  git('add', '.');
  git('commit', '-qm', 'base');
  git('checkout', '-qb', 'head');
  mkdirSync(join(dir, 'apps/web/src/core'));
  renameSync(join(dir, 'apps/web/src/lib/api.ts'), join(dir, 'apps/web/src/core/api.ts'));
  write(SUPP, edit);
  git('add', '-A');
  git('commit', '-qm', 'move');
  try {
    return { code: 0, out: execFileSync('node', [script, 'base'], { cwd: dir, encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout) };
  }
}

test('a moved suppressed file whose key follows it with the same counts is pure', () => {
  const r = repo(suppressions('src/core/api.ts'));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /0 not pure/);
});

test('a suppressions count change in a move fails', () => {
  const r = repo(suppressions('src/core/api.ts', 3));
  assert.equal(r.code, 1);
  assert.match(r.out, /eslint-suppressions\.json: suppressions: changes more than/);
});

test('a suppressions key renamed without a matching move fails', () => {
  const r = repo(suppressions('src/core/http.ts'));
  assert.equal(r.code, 1);
  assert.match(r.out, /eslint-suppressions\.json/);
});
