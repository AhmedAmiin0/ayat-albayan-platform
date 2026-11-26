import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { groupsOf } from './durations-reporter';
import type { ProjectSuiteLike, TestLike } from './shard-groups';

const at = (file: string, hash?: string): TestLike => ({
  location: { file: join(process.cwd(), file) },
  ...(hash === undefined ? {} : { _workerHash: hash }),
});

const suite = (name: string, tests: TestLike[]): ProjectSuiteLike => ({
  project: () => ({ name }),
  allTests: () => tests,
});

test('groupsOf groups each project by worker hash, then by file, in first-seen order', () => {
  const root = {
    suites: [
      suite('chromium', [
        at('tests/a.spec.ts', 'h1'),
        at('tests/b.spec.ts', 'h2'),
        at('tests/a.spec.ts', 'h1'),
      ]),
      suite('mobile', [at('tests/a.spec.ts', 'h3')]),
    ],
  };
  assert.deepEqual(groupsOf(root), [
    { project: 'chromium', file: 'tests/a.spec.ts', tests: 2 },
    { project: 'chromium', file: 'tests/b.spec.ts', tests: 1 },
    { project: 'mobile', file: 'tests/a.spec.ts', tests: 1 },
  ]);
});

test('groupsOf keeps one file apart under two worker hashes', () => {
  const root = {
    suites: [suite('chromium', [at('tests/a.spec.ts', 'h1'), at('tests/a.spec.ts', 'h2')])],
  };
  assert.deepEqual(groupsOf(root), [
    { project: 'chromium', file: 'tests/a.spec.ts', tests: 1 },
    { project: 'chromium', file: 'tests/a.spec.ts', tests: 1 },
  ]);
});

test('groupsOf skips the setup project, even when its tests carry no hash', () => {
  const root = { suites: [suite('setup', [at('tests/auth.setup.ts')]), suite('chromium', [])] };
  assert.deepEqual(groupsOf(root), []);
});

test('groupsOf gives null when a test carries no worker hash', () => {
  const root = {
    suites: [suite('chromium', [at('tests/a.spec.ts', 'h1'), at('tests/b.spec.ts')])],
  };
  assert.equal(groupsOf(root), null);
});

test('groupsOf names a suite without a project as the empty project', () => {
  const root = {
    suites: [{ project: () => undefined, allTests: () => [at('tests/a.spec.ts', 'h1')] }],
  };
  assert.deepEqual(groupsOf(root), [{ project: '', file: 'tests/a.spec.ts', tests: 1 }]);
});
