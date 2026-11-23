import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isCommentBranch, parseArgs } from './args.mjs';

test('the --branch flag wins over GITHUB_HEAD_REF', () => {
  const args = parseArgs(['--branch', 'chore/comments-a'], { GITHUB_HEAD_REF: 'feat/x' });
  assert.equal(args.branch, 'chore/comments-a');
});

test('GITHUB_HEAD_REF and GUARD_BASE come from the environment', () => {
  const env = { GITHUB_HEAD_REF: 'chore/comments-b', GUARD_BASE: '/tmp/base' };
  assert.deepEqual(parseArgs([], env), { branch: 'chore/comments-b', guardBase: '/tmp/base' });
});

test('no branch at all is an empty branch', () => {
  assert.deepEqual(parseArgs([], {}), { branch: '', guardBase: undefined });
});

test('an empty GUARD_BASE counts as unset', () => {
  assert.equal(parseArgs([], { GUARD_BASE: '' }).guardBase, undefined);
});

test('an unknown flag or a flag without a value throws', () => {
  assert.throws(() => parseArgs(['--base', 'x'], {}));
  assert.throws(() => parseArgs(['--branch'], {}));
});

test('only chore/comments-* branches are checked', () => {
  assert.equal(isCommentBranch('chore/comments-api'), true);
  assert.equal(isCommentBranch('chore/comment-api'), false);
  assert.equal(isCommentBranch('ci/comment-only-gate'), false);
  assert.equal(isCommentBranch('feat/chore/comments-x'), false);
  assert.equal(isCommentBranch(''), false);
});
