import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { escapesIn } from '../gate.mjs';

// The tracked list passed the 1 MiB default buffer of execFileSync and the gate crashed.
test('escapesIn reads a repo whose tracked list is over 1 MiB', () => {
  const root = mkdtempSync(join(tmpdir(), 'escapes-files-'));
  mkdirSync(join(root, 'apps'));
  const pad = 'e'.repeat(120);
  Array.from({ length: 9000 }, (_, i) => writeFileSync(join(root, 'apps', `${pad}-${i}.ts`), ''));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '-A'], { cwd: root });
  try {
    assert.deepEqual(escapesIn(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
