import assert from 'node:assert/strict';
import { test } from 'node:test';
import { facadeOwners, ownerNames, sharedOwnNames } from './owner-names.ts';
import { repo } from './unfacade/fixture.test-util.ts';

test('maps every domain export to its package, @ab/i18n included', () => {
  const owners = ownerNames(repo({}));
  assert.equal(owners.get('toE164'), '@ab/core');
  assert.equal(owners.get('Phone'), '@ab/core');
  assert.equal(owners.get('t'), '@ab/i18n');
  assert.equal(owners.get('Zone'), '@ab/time');
});

test('a name two domain packages export throws', () => {
  const root = repo({ 'packages/i18n/src/strings.ts': 'export const toE164 = 1;\n' });
  assert.throws(() => ownerNames(root), /toE164: @ab\/core and @ab\/i18n/);
});

test("shared's own names follow only its relative export lines", () => {
  assert.deepEqual([...sharedOwnNames(repo({}))].sort(), ['Kind', 'own', 'utc']);
});

test('a shared-own name shadows `export *`, so it is never rewritten', () => {
  const owners = facadeOwners(repo({}));
  assert.equal(owners.has('utc'), false);
  assert.equal(owners.get('toE164'), '@ab/core');
});
