import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compare, isQueries, trackedFiles } from './queries-gate.mjs';

const text = (body) => () => body;

test('isQueries: a *queries.ts(x) name or a class XQueries, in TypeScript only', () => {
  assert.equal(isQueries('apps/api/src/a/leads.queries.ts', text('')), true);
  assert.equal(isQueries('apps/staff-mobile/src/inbox/use-thread-queries.tsx', text('')), true);
  assert.equal(isQueries('apps/api/src/a/calls.fakes.ts', text('export class FakeCallsQueries {}')), true);
  assert.equal(isQueries('apps/api/src/a/leads.repo.ts', text('export class LeadsRepo {}')), false);
  assert.equal(isQueries('apps/api/src/a/leads.queries.test.ts', text('')), false);
  assert.equal(isQueries('apps/api/src/a/notes.md', text('class XQueries')), false);
  assert.equal(isQueries('apps/api/src/a/b.ts', text('// QueriesClient, class XQueriesLike')), false);
});

test('compare: a new queries file is added (fails); a listed one that is gone is fixed (passes)', () => {
  const listed = ['a.queries.ts', 'b.queries.ts'];
  assert.deepEqual(compare(['a.queries.ts', 'c.queries.ts'], listed), {
    added: ['c.queries.ts'],
    fixed: ['b.queries.ts'],
  });
  assert.deepEqual(compare(listed, listed), { added: [], fixed: [] });
});

test('trackedFiles: lists the roots with room for a file list past the 1 MiB default buffer', () => {
  const calls = [];
  const run = (cmd, args, options) => {
    calls.push({ cmd, args, options });
    return 'apps/a.ts\n\npackages/b.ts\n';
  };
  assert.deepEqual(trackedFiles('/repo', run), ['apps/a.ts', 'packages/b.ts']);
  assert.deepEqual(calls[0].args, ['ls-files', '--', 'apps', 'packages', 'e2e']);
  assert.equal(calls[0].options.cwd, '/repo');
  assert.ok(calls[0].options.maxBuffer >= 1 << 28);
});
