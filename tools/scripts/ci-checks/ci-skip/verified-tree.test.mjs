import assert from 'node:assert/strict';
import { test } from 'node:test';
import { artifactList, decide, PREFIX } from './verified-tree.mjs';

const tree = 'a'.repeat(40);
const repoId = 7;
const artifact = (over = {}) => ({
  name: `${PREFIX}${tree}`,
  expired: false,
  workflow_run: { repository_id: repoId, head_repository_id: repoId },
  ...over,
});
const verdict = (artifacts, files = ['apps/api/src/x.ts']) =>
  decide({ tree, repoId, files, list: artifactList.parse({ artifacts }) }).verified;

test('a green PR run of the same tree in this repository verifies it', () => {
  assert.equal(verdict([artifact()]), true);
});

test('no artifact, an expired one, another tree or a fork run never verify', () => {
  assert.equal(verdict([]), false);
  assert.equal(verdict([artifact({ expired: true })]), false);
  assert.equal(verdict([artifact({ name: `${PREFIX}${'b'.repeat(40)}` })]), false);
  const fork = { repository_id: repoId, head_repository_id: 99 };
  assert.equal(verdict([artifact({ workflow_run: fork })]), false);
  assert.equal(verdict([artifact({ workflow_run: null })]), false);
  assert.equal(verdict([artifact({ workflow_run: fork }), artifact()]), true, 'any own run is enough');
});

test('a push that changes a cache key file runs everything (develop writes the caches)', () => {
  for (const f of [
    'pnpm-lock.yaml',
    'apps/api/vitest.config.mts',
    'apps/staff-web/vite.config.ts',
    'apps/family-web/vite.config.ts',
    'packages/config/vite.js',
    'tsconfig.base.json',
    'apps/api/tsconfig.json',
    'apps/staff-mobile/babel.config.cjs',
    'apps/family-mobile/jest.config.cjs',
    'packages/config/expo/babel.js',
    'packages/mobile-kit/jest.cjs',
    'packages/testing/jest.cjs',
  ])
    assert.equal(verdict([artifact()], ['docs/x.md', f]), false, f);
  assert.equal(verdict([artifact()], ['apps/api/src/tsconfig-ish.ts']), true);
});

test('a malformed API answer throws (the caller turns it into verified=false)', () => {
  assert.throws(() => artifactList.parse({ artifacts: [{ name: 'x' }] }));
  assert.throws(() => artifactList.parse({ message: 'Bad credentials' }));
});
