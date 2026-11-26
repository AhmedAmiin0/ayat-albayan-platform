import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { repoFiles } from '../gate.mjs';

// The repo's file list passed the 1 MiB default buffer of execFileSync and the gate crashed.
test('repoFiles lists a repo whose file list is over 1 MiB', () => {
  const root = mkdtempSync(join(tmpdir(), 'tsconfig-files-'));
  const pad = 'f'.repeat(120);
  const names = Array.from({ length: 9000 }, (_, i) => `${pad}-${i}.ts`);
  names.forEach((name) => writeFileSync(join(root, name), ''));
  execFileSync('git', ['init', '-q'], { cwd: root });
  try {
    assert.equal(repoFiles(root).length, names.length);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
