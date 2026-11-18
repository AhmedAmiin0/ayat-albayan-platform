import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseScope, scoped } from './scope.mjs';

const DIRS = ['apps/api', 'apps/staff-web', 'e2e', 'packages/shared'];

test('no scope: every package', () => {
  assert.deepEqual(scoped(DIRS), DIRS);
  assert.deepEqual(scoped(DIRS, ''), DIRS);
});

test('`apps/api` keeps that package only; `!apps/api` every other one', () => {
  assert.deepEqual(scoped(DIRS, 'apps/api'), ['apps/api']);
  assert.deepEqual(scoped(DIRS, '!apps/api'), ['apps/staff-web', 'e2e', 'packages/shared']);
});

test('a scope and its negation together cover every package exactly once', () => {
  const both = [...scoped(DIRS, 'e2e'), ...scoped(DIRS, '!e2e')].sort();
  assert.deepEqual(both, [...DIRS].sort());
});

test('a scope naming no package fails instead of checking nothing', () => {
  assert.throws(() => scoped(DIRS, 'apps/apii'), /LINT_SCOPE apps\/apii: no package apps\/apii/);
  assert.throws(() => scoped(DIRS, '!apps/apii'), /no package apps\/apii/);
});

test('parseScope: all, one package, or every other', () => {
  assert.deepEqual(parseScope(), { kind: 'all', name: '' });
  assert.deepEqual(parseScope('apps/api'), { kind: 'only', name: 'apps/api' });
  assert.deepEqual(parseScope('!apps/api'), { kind: 'except', name: 'apps/api' });
});
