import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo } from './fixture.test-util.ts';
import { expandMap, type MoveMap } from './map.ts';

const root = makeRepo({
  'src/a/meta-client.ts': '',
  'src/a/meta-client.test.ts': '',
  'src/a/__snapshots__/meta-client.test.ts.snap': '',
  'src/a/meta-graph.ts': '',
  'src/a/kapso.ts': '',
  'src/a/kapso.extra.test.ts': '',
  'src/env.ts': '',
  'src/env.test.ts': '',
  'src/env.blank.ts': '',
  'src/b/x.ts': '',
  'src/b/deep/y.ts': '',
});
const m = (moves: MoveMap['moves']): MoveMap => ({ id: 't', seq: 1, moves });

test('a glob moves the matching files of one folder with their tests and snapshots', () => {
  assert.deepEqual(expandMap(root, m([{ from: 'src/a/meta-*', to: 'src/a/drivers/meta' }])), [
    ['src/a/__snapshots__/meta-client.test.ts.snap', 'src/a/drivers/meta/__snapshots__/meta-client.test.ts.snap'],
    ['src/a/meta-client.test.ts', 'src/a/drivers/meta/meta-client.test.ts'],
    ['src/a/meta-client.ts', 'src/a/drivers/meta/meta-client.ts'],
    ['src/a/meta-graph.ts', 'src/a/drivers/meta/meta-graph.ts'],
  ]);
});

test('a file brings only its own test, not the tests of a longer name', () => {
  assert.deepEqual(expandMap(root, m([{ from: 'src/env.ts', to: 'src/config/' }])), [
    ['src/env.test.ts', 'src/config/env.test.ts'],
    ['src/env.ts', 'src/config/env.ts'],
  ]);
  assert.deepEqual(expandMap(root, m([{ from: 'src/a/kapso.ts', to: 'src/k/kapso.ts' }])), [
    ['src/a/kapso.ts', 'src/k/kapso.ts'],
  ]);
});

test('a dir/ entry moves the folder whole, sub-folders included', () => {
  assert.deepEqual(expandMap(root, m([{ from: 'src/b/', to: 'src/c' }])), [
    ['src/b/deep/y.ts', 'src/c/deep/y.ts'],
    ['src/b/x.ts', 'src/c/x.ts'],
  ]);
});

test('refuses two targets for one file and two files for one target', () => {
  assert.throws(() => expandMap(root, m([{ from: 'src/b/x.ts', to: 'src/1.ts' }, { from: 'src/b/x.ts', to: 'src/2.ts' }])), /moved twice/);
  assert.throws(() => expandMap(root, m([{ from: 'src/b/x.ts', to: 'src/1.ts' }, { from: 'src/env.blank.ts', to: 'src/1.ts' }])), /two files/);
});

test('sources that no longer exist are left out', () => {
  assert.deepEqual(expandMap(root, m([{ from: 'src/gone.ts', to: 'src/x.ts' }, { from: 'src/none/*', to: 'src/y' }])), []);
});
