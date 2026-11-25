import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aboveFile, emptyFiles, entriesOf, newFiles } from '../compare.mjs';

const same = (path) => path;

test('entriesOf: every package file keyed by its repo path', () => {
  const api = { 'src/a.ts': { complexity: { count: 2 } } };
  const web = { 'src/a.ts': { 'max-len': { count: 1 } } };
  const paths = ['apps/api/oxlint-suppressions.json', 'apps/staff-web/oxlint-suppressions.json'];
  assert.deepEqual(entriesOf({ paths, files: [api, web] }), {
    'apps/api/src/a.ts': { complexity: 2 },
    'apps/staff-web/src/a.ts': { 'max-len': 1 },
  });
});

test('aboveFile: a count may only fall; equal or lower passes', () => {
  const base = { 'e2e/a.ts': { complexity: 2, 'max-len': 3 } };
  assert.deepEqual(aboveFile(base, base, same), []);
  assert.deepEqual(aboveFile({ 'e2e/a.ts': { complexity: 1 } }, base, same), []);
  assert.deepEqual(aboveFile({ 'e2e/a.ts': { complexity: 3, 'max-len': 3 } }, base, same), [
    'above the base branch: e2e/a.ts complexity 2 -> 3 (fix it, never suppress it)',
  ]);
});

test('aboveFile: a file or a rule entry the base lacks fails, even when a total falls', () => {
  const base = { 'e2e/a.ts': { complexity: 5 } };
  const now = { 'e2e/a.ts': { complexity: 1, eqeqeq: 1 }, 'e2e/b.ts': { complexity: 1 } };
  assert.deepEqual(aboveFile(now, base, same), [
    'above the base branch: e2e/a.ts eqeqeq 0 -> 1 (fix it, never suppress it)',
    'above the base branch: e2e/b.ts complexity 0 -> 1 (fix it, never suppress it)',
  ]);
});

test('aboveFile: an entry follows its renamed file; two files moved into one add up', () => {
  const base = { 'e2e/old.ts': { complexity: 2 }, 'e2e/x.ts': { complexity: 1 } };
  const move = (path) => (path === 'e2e/x.ts' ? 'e2e/new.ts' : path.replace('old', 'new'));
  assert.deepEqual(aboveFile({ 'e2e/new.ts': { complexity: 3 } }, base, move), []);
  assert.equal(aboveFile({ 'e2e/new.ts': { complexity: 4 } }, base, move).length, 1);
});

test('newFiles: a workspace whose suppressions file the base lacks may not add one', () => {
  const base = ['apps/api/oxlint-suppressions.json'];
  const head = ['apps/api/oxlint-suppressions.json', 'apps/family-web/oxlint-suppressions.json'];
  assert.deepEqual(newFiles(head, base), [
    'new suppressions file: apps/family-web/oxlint-suppressions.json (fix the violations instead)',
  ]);
  assert.deepEqual(newFiles(base, head), []);
});

test('emptyFiles: a suppressions file with no entry left is deleted, never kept as {}', () => {
  const paths = ['e2e/oxlint-suppressions.json', 'packages/db/oxlint-suppressions.json'];
  assert.deepEqual(emptyFiles({ paths, files: [{ 'a.ts': { x: { count: 1 } } }, {}] }), [
    'empty: packages/db/oxlint-suppressions.json (delete it: the workspace is clean)',
  ]);
});
