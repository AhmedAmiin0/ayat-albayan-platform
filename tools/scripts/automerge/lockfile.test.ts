import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alreadyAsked, staleComment, staleLockBase, touchesLock } from './lockfile.ts';
import { DEVELOP, HEAD } from './testing/facts.builder.ts';

const files = (...names: string[]) => names.map((filename) => ({ filename }));
const OLD = 'b'.repeat(40);

test('any package.json or pnpm-lock.yaml counts as a lockfile change', () => {
  assert.equal(touchesLock(files('pnpm-lock.yaml')), true);
  assert.equal(touchesLock(files('a.ts', 'packages/time/package.json')), true);
  assert.equal(touchesLock(files('package.json')), true);
  assert.equal(touchesLock(files('docs/package.json.md', 'a/my-package.json5', 'x.ts')), false);
  assert.equal(touchesLock(files('apps/x/pnpm-lock.yaml.bak')), false);
  assert.equal(touchesLock([]), false);
});

test('a lockfile PR is stale unless its merge-base is the develop head', () => {
  const fresh = { base_commit: { sha: DEVELOP }, merge_base_commit: { sha: DEVELOP } };
  const stale = { base_commit: { sha: DEVELOP }, merge_base_commit: { sha: OLD } };
  assert.equal(staleLockBase(files('pnpm-lock.yaml'), fresh), false);
  assert.equal(staleLockBase(files('pnpm-lock.yaml'), stale), true);
  assert.equal(staleLockBase(files('a.ts'), stale), false);
});

test('the stale comment is posted once per head commit', () => {
  const body = staleComment(HEAD);
  assert.match(body, /needs update from develop/);
  assert.equal(alreadyAsked([{ body }], HEAD), true);
  assert.equal(alreadyAsked([{ body: 'needs update from develop' }], HEAD), false);
  assert.equal(alreadyAsked([{ body: staleComment(OLD) }], HEAD), false);
  assert.equal(alreadyAsked([], HEAD), false);
});
