import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grown, measures } from '../shrink.mjs';

const same = (path) => path;

test('measures: list lines count 1, numbers count themselves, objects per numeric field', () => {
  assert.deepEqual(measures(['apps/a.ts exports A', 'apps/b.ts']), [
    { path: 'apps/a.ts', rest: ' exports A', n: 1 },
    { path: 'apps/b.ts', rest: '', n: 1 },
  ]);
  assert.deepEqual(measures({ 'apps/api/src/x': 2 }), [{ path: 'apps/api/src/x', rest: '', n: 2 }]);
  assert.deepEqual(measures({ 'apps/m/src': { files: 1, dirs: 33 } }), [
    { path: 'apps/m/src', rest: ' files', n: 1 },
    { path: 'apps/m/src', rest: ' dirs', n: 33 },
  ]);
});

test('grown: an entry may only shrink or go', () => {
  const base = { 'apps/m/src': { files: 1, dirs: 33 }, 'packages/s/src': { files: 1, dirs: 13 } };
  assert.deepEqual(grown('cap.json', { base, head: { 'apps/m/src': { files: 1, dirs: 30 } } }, same), []);
  assert.deepEqual(grown('cap.json', { base, head: { 'apps/m/src': { files: 2, dirs: 33 } } }, same), [
    'raised: cap.json apps/m/src files 1 -> 2 (fix the code, never raise a baseline)',
  ]);
});

test('grown: a new entry fails, in a list or in a map', () => {
  const lines = grown('knip.json', { base: ['a.ts types A'], head: ['a.ts types A', 'b.ts types B'] }, same);
  assert.deepEqual(lines, ['new entry: knip.json b.ts types B (fix the code, never add to a baseline)']);
  assert.equal(grown('units.json', { base: {}, head: { 'apps/x': 1 } }, same).length, 1);
});

test('grown: an entry follows its moved file or folder', () => {
  const move = (path) => path.replace('apps/old', 'apps/new');
  const files = { base: ['apps/old/a.ts exports A'], head: ['apps/new/a.ts exports A'] };
  assert.deepEqual(grown('knip.json', files, move), []);
  assert.deepEqual(grown('units.json', { base: { 'apps/old': 2 }, head: { 'apps/new': 2 } }, move), []);
});

test('grown: a baseline file the base lacks fails as a whole', () => {
  assert.deepEqual(grown('refactor/guards/new.json', { base: undefined, head: [] }, same), [
    'new baseline file: refactor/guards/new.json (fix the code, never add a baseline)',
  ]);
});
