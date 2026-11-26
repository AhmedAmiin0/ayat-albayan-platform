import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  alreadyAsked,
  staleComment,
  staleLockBase,
  touchesLock,
  unknownLockBase,
} from './lockfile.ts';
import { HEAD } from './testing/facts.builder.ts';

const files = (...names: string[]) => names.map((filename) => ({ filename }));
const gained = (...names: string[]) => ({ known: true, files: files(...names) });
const OLD = 'b'.repeat(40);

test('any package.json or pnpm-lock.yaml counts as a lockfile change', () => {
  assert.equal(touchesLock(files('pnpm-lock.yaml')), true);
  assert.equal(touchesLock(files('a.ts', 'packages/time/package.json')), true);
  assert.equal(touchesLock(files('package.json')), true);
  assert.equal(touchesLock(files('docs/package.json.md', 'a/my-package.json5', 'x.ts')), false);
  assert.equal(touchesLock(files('apps/x/pnpm-lock.yaml.bak')), false);
  assert.equal(touchesLock(files('a/my-package.json', 'x/old.npmrc', 'patches')), false);
  assert.equal(touchesLock([]), false);
});

test('pnpm-workspace.yaml, .npmrc, .pnpmfile.cjs and patches count too', () => {
  assert.equal(touchesLock(files('pnpm-workspace.yaml')), true);
  assert.equal(touchesLock(files('.npmrc')), true);
  assert.equal(touchesLock(files('.pnpmfile.cjs')), true);
  assert.equal(touchesLock(files('.pnpmfile.mjs')), true);
  assert.equal(touchesLock(files('patches/expo-sharing@57.0.24.patch')), true);
  assert.equal(touchesLock(files('docs/patches/a.md', 'apps/x/npmrc.md')), false);
});

test('a lockfile PR is stale only once develop changed a lockfile input since its base', () => {
  const lock = files('pnpm-lock.yaml');
  assert.equal(staleLockBase(lock, gained()), false);
  assert.equal(staleLockBase(lock, gained('apps/api/src/a.ts', 'docs/09-deployment.md')), false);
  assert.equal(staleLockBase(lock, gained('a.ts', 'tools/wa-stub/package.json')), true);
  assert.equal(staleLockBase(files('package.json'), gained('pnpm-workspace.yaml')), true);
  assert.equal(staleLockBase(files('a.ts'), gained('pnpm-lock.yaml')), false);
});

test('a lockfile input renamed away still counts, by its old path', () => {
  const moved = { filename: 'a/package.json.off', previous_filename: 'a/package.json' };
  assert.equal(touchesLock([moved]), true);
});

test('only a lockfile PR has to wait while what develop changed is not known', () => {
  const unknown = { known: false, files: [] };
  assert.equal(unknownLockBase(files('pnpm-lock.yaml'), unknown), true);
  assert.equal(unknownLockBase(files('a.ts'), unknown), false);
  assert.equal(unknownLockBase(files('pnpm-lock.yaml'), gained()), false);
  assert.equal(staleLockBase(files('pnpm-lock.yaml'), unknown), false);
});

test('the stale comment is posted once per head commit', () => {
  const body = staleComment(HEAD);
  assert.match(body, /needs update from develop/);
  assert.equal(alreadyAsked([{ body }], HEAD), true);
  assert.equal(alreadyAsked([{ body: 'needs update from develop' }], HEAD), false);
  assert.equal(alreadyAsked([{ body: staleComment(OLD) }], HEAD), false);
  assert.equal(alreadyAsked([], HEAD), false);
});
