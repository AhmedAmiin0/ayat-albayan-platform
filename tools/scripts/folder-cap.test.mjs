import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { check, crowded, measure } from './folder-cap.mjs';

function tree() {
  const root = mkdtempSync(join(tmpdir(), 'folder-cap-'));
  const put = (f) => {
    mkdirSync(join(root, f, '..'), { recursive: true });
    writeFileSync(join(root, f), '');
  };
  for (let i = 0; i < 13; i += 1) put(`src/big/f${i}.ts`);
  for (let i = 0; i < 20; i += 1) put(`src/ok/f${i}.test.ts`);
  put('src/ok/a.tsx');
  put('src/ok/__snapshots__/a.test.tsx.snap');
  put('src/ok/node_modules/x.js');
  for (let i = 0; i < 13; i += 1) put(`src/wide/d${i}/x.ts`);
  return root;
}

test('counts code files without tests, and sub-folders without snapshots or node_modules', () => {
  const counts = measure(tree(), 'src');
  assert.deepEqual(counts['src/big'], { files: 13, dirs: 0 });
  assert.deepEqual(counts['src/ok'], { files: 1, dirs: 0 });
  assert.deepEqual(counts['src/wide'], { files: 0, dirs: 13 });
  assert.deepEqual(Object.keys(crowded(counts)), ['src/big', 'src/wide']);
});

test('reports new, grown and stale folders only', () => {
  const counts = measure(tree(), 'src');
  assert.deepEqual(check(counts, { 'src/big': { files: 13, dirs: 0 }, 'src/wide': { files: 0, dirs: 13 } }), []);
  assert.deepEqual(check(counts, { 'src/wide': { files: 0, dirs: 13 } }), [
    'new: src/big has 13 code files, 0 folders (max 12)',
  ]);
  assert.deepEqual(check(counts, { 'src/big': { files: 12, dirs: 0 }, 'src/wide': { files: 0, dirs: 13 } }), [
    'grew: src/big 12/0 → 13/0',
  ]);
  assert.deepEqual(check(counts, { 'src/big': { files: 13, dirs: 0 }, 'src/wide': { files: 0, dirs: 13 }, 'src/ok': { files: 30, dirs: 0 } }), [
    'stale: src/ok is within the cap; remove it from the allow-list',
  ]);
});
