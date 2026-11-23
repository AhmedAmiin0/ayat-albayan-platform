import assert from 'node:assert/strict';
import { test } from 'node:test';
import { laneOf } from './lanes.ts';

const CASES: readonly [string, string | null][] = [
  ['cut/shared-db', 'cut/'],
  ['chore/comments-web-1', 'chore/comments-'],
  ['move/facade-sweep', 'move/'],
  ['chore/comment-typo', null],
  ['ci/lane-automerge', null],
  ['feature/cut/x', null],
  ['Cut/x', null],
  ['', null],
];

test('only the allow-listed branch prefixes are auto-merge lanes', () => {
  for (const [branch, lane] of CASES) assert.equal(laneOf(branch), lane, branch);
});
