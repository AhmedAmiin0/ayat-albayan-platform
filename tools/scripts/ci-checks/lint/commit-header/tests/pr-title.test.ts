import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { titleProblems } from '../pr-title.ts';

const cli = fileURLToPath(new URL('../pr-title.ts', import.meta.url));
const run = (env: Record<string, string>) =>
  spawnSync(process.execPath, [cli], { encoding: 'utf8', env: { PATH: process.env.PATH, ...env } });

test('a good title passes; its squash subject is checked too', () => {
  assert.deepEqual(titleProblems({ number: 930, title: 'ci(repo): enforce angular commit messages' }), []);
  const title = `fix(api): ${'a'.repeat(90)}`;
  assert.deepEqual(titleProblems({ number: 930, title }), [
    `squash subject: header is ${String(title.length + 7)} characters, at most 100`,
  ]);
});

test('the command passes a good title and exits 0', () => {
  const out = run({ PR_TITLE: 'fix(api/booking): keep the slot', PR_NUMBER: '12' });
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /follows the angular convention/);
});

test('the command fails a bad title with an annotation naming the rule', () => {
  const out = run({ PR_TITLE: 'Guard: no Arabic in code comments', PR_NUMBER: '928' });
  assert.equal(out.status, 1);
  assert.match(out.stdout, /::error title=PR title::.*<type>\(<scope>\): <subject>/);
});

test('missing or broken input fails instead of passing', () => {
  assert.notEqual(run({ PR_NUMBER: '12' }).status, 0);
  assert.notEqual(run({ PR_TITLE: 'fix(api): x', PR_NUMBER: 'abc' }).status, 0);
});
