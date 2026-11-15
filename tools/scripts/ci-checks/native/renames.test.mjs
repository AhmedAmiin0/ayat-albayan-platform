import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blobs, changedPaths, currentPath, currentRefs, dirsOf, withLegacy } from './renames.mjs';

test('a pre-move path is named by its current folder; others stay', () => {
  assert.equal(currentPath('apps/mobile/assets/icon.png'), 'apps/staff-mobile/assets/icon.png');
  assert.equal(currentPath('apps/family/eas.json'), 'apps/family-mobile/eas.json');
  assert.equal(currentPath('apps/mobile-x/a.ts'), 'apps/mobile-x/a.ts');
  assert.equal(currentPath('patches/a.patch'), 'patches/a.patch');
});

test('pathspecs get their pre-move twins', () => {
  assert.deepEqual(withLegacy(['apps/staff-mobile/assets', 'patches']), ['apps/staff-mobile/assets', 'patches', 'apps/mobile/assets']);
  assert.deepEqual(dirsOf('apps/family-mobile'), ['apps/family-mobile', 'apps/family']);
  assert.deepEqual(dirsOf('apps/other'), ['apps/other']);
});

test('the family app.json reference to ../mobile/assets reads as ../staff-mobile/assets', () => {
  assert.equal(currentRefs('{"icon":"../mobile/assets/icon.png"}'), '{"icon":"../staff-mobile/assets/icon.png"}');
  assert.equal(currentRefs('{"icon":"../staff-mobile/assets/icon.png"}'), '{"icon":"../staff-mobile/assets/icon.png"}');
});

const line = (blob, path) => `100644 blob ${blob}\t${path}`;

test('a pure folder move (same blobs, new paths) is no change', () => {
  const before = blobs([line('aaa', 'apps/mobile/assets/icon.png'), line('bbb', 'apps/mobile/eas.json')].join('\0'));
  const after = blobs([line('aaa', 'apps/staff-mobile/assets/icon.png'), line('bbb', 'apps/staff-mobile/eas.json')].join('\0') + '\0');
  assert.deepEqual(changedPaths(before, after), []);
});

test('an edited, added or removed file is listed under its current path', () => {
  const before = blobs([line('aaa', 'apps/mobile/assets/icon.png'), line('ccc', 'apps/mobile/plugins/x.ts')].join('\0'));
  const after = blobs([line('abc', 'apps/staff-mobile/assets/icon.png'), line('ddd', 'patches/p.patch')].join('\0'));
  assert.deepEqual(changedPaths(before, after), [
    'apps/staff-mobile/assets/icon.png',
    'apps/staff-mobile/plugins/x.ts',
    'patches/p.patch',
  ]);
});
