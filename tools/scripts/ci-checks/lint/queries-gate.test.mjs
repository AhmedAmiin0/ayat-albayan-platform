import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compare, isQueries } from './queries-gate.mjs';

const text = (body) => () => body;

test('isQueries: a *queries.ts(x) name or a class XQueries, in TypeScript only', () => {
  assert.equal(isQueries('apps/api/src/a/leads.queries.ts', text('')), true);
  assert.equal(isQueries('apps/mobile/src/inbox/use-thread-queries.tsx', text('')), true);
  assert.equal(isQueries('apps/api/src/a/calls.fakes.ts', text('export class FakeCallsQueries {}')), true);
  assert.equal(isQueries('apps/api/src/a/leads.repo.ts', text('export class LeadsRepo {}')), false);
  assert.equal(isQueries('apps/api/src/a/leads.queries.test.ts', text('')), false);
  assert.equal(isQueries('apps/api/src/a/notes.md', text('class XQueries')), false);
  assert.equal(isQueries('apps/api/src/a/b.ts', text('// QueriesClient, class XQueriesLike')), false);
});

test('compare: a new queries file and a listed one that is gone both count', () => {
  const listed = ['a.queries.ts', 'b.queries.ts'];
  assert.deepEqual(compare(['a.queries.ts', 'c.queries.ts'], listed), {
    added: ['c.queries.ts'],
    fixed: ['b.queries.ts'],
  });
  assert.deepEqual(compare(listed, listed), { added: [], fixed: [] });
});
