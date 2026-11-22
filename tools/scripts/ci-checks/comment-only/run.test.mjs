import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { gate } from './run.mjs';

const BASE_FILES = {
  'src/a.ts': '// why\nexport const a = 1;\n',
  'src/b.ts': 'export const b = 2;\n',
  'package.json': '{ "name": "x" }\n',
  'ci.yml': 'on: push\n',
  'packages/db/supabase/migrations/0001.sql': 'select 1;\n',
};

/** A repo whose `develop` holds BASE_FILES and whose checked-out branch applies `edit`. */
function repo(edit) {
  const cwd = mkdtempSync(join(tmpdir(), 'comment-only-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  const write = (files) =>
    Object.entries(files).forEach(([path, text]) => {
      mkdirSync(dirname(join(cwd, path)), { recursive: true });
      writeFileSync(join(cwd, path), text);
    });
  git('init', '-q', '-b', 'develop');
  git('config', 'user.email', 'ci@example.test');
  git('config', 'user.name', 'ci');
  write(BASE_FILES);
  git('add', '-A');
  git('commit', '-qm', 'base');
  git('update-ref', 'refs/remotes/origin/develop', 'HEAD');
  git('checkout', '-qb', 'chore/comments-x');
  edit({ git, write, cwd });
  git('add', '-A');
  git('commit', '-qm', 'head', '--allow-empty');
  return cwd;
}

function run(edit, argv = ['--branch', 'chore/comments-x']) {
  const cwd = repo(edit);
  const lines = [];
  const code = gate({ argv, env: {}, cwd, log: (line) => lines.push(line) });
  rmSync(cwd, { recursive: true, force: true });
  return { code, out: lines.join('\n') };
}

test('removing a comment passes', () => {
  const { code, out } = run(({ write }) => write({ 'src/a.ts': 'export const a = 1;\n' }));
  assert.equal(code, 0, out);
});

const failing = {
  'a token change': ({ write }) => write({ 'src/a.ts': '// why\nexport const a = 2;\n' }),
  'an added file': ({ write }) => write({ 'src/c.ts': 'export const c = 3;\n' }),
  'a deleted file': ({ git }) => git('rm', '-q', 'src/b.ts'),
  'a renamed file': ({ git }) => git('mv', 'src/b.ts', 'src/c.ts'),
  'a JSON change': ({ write }) => write({ 'package.json': '{ "name": "y" }\n' }),
  'a YAML change': ({ write }) => write({ 'ci.yml': 'on: pull_request\n' }),
  'a migration edit': ({ write }) =>
    write({ 'packages/db/supabase/migrations/0001.sql': '-- x\nselect 1;\n' }),
};

for (const [name, edit] of Object.entries(failing)) {
  test(`${name} fails`, () => {
    const { code, out } = run(edit);
    assert.equal(code, 1);
    assert.match(out, /guard:comments/);
  });
}

test('a failing file is named with its reason', () => {
  const { out } = run(({ write }) => write({ 'src/a.ts': 'export const a = 2;\n' }));
  assert.match(out, /src\/a\.ts: .*NumericLiteral:1.*NumericLiteral:2/);
});

test('GUARD_BASE names the base checkout', () => {
  const cwd = repo(({ write }) => write({ 'src/b.ts': 'export const b = 3;\n' }));
  const base = mkdtempSync(join(tmpdir(), 'comment-only-base-'));
  execFileSync('git', ['worktree', 'add', '-q', '--detach', base, 'develop'], { cwd });
  const env = { GITHUB_HEAD_REF: 'chore/comments-x', GUARD_BASE: base };
  assert.equal(gate({ argv: [], env, cwd, log: () => undefined }), 1);
  rmSync(cwd, { recursive: true, force: true });
  rmSync(base, { recursive: true, force: true });
});

test('a branch not named chore/comments-* is skipped with one line', () => {
  const { code, out } = run(({ write }) => write({ 'src/c.ts': 'x;\n' }), ['--branch', 'feat/x']);
  assert.equal(code, 0);
  assert.equal(out.split('\n').length, 1);
  assert.match(out, /skipped/);
});
