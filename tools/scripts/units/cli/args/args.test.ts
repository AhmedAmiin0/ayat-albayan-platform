import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFoldArgs } from './args.ts';

test('--dry-run alone plans every folder', () => {
  assert.deepEqual(parseFoldArgs(['--', '--dry-run']), {
    dryRun: true,
    write: false,
    skipOpenPrs: false,
    paths: [],
    unknown: [],
  });
});

test('--write takes the folders after --paths and may skip open PRs', () => {
  const args = parseFoldArgs(['--write', '--paths', 'apps/a', 'apps/b', '--skip-open-prs']);
  assert.deepEqual([args.write, args.paths, args.skipOpenPrs], [true, ['apps/a', 'apps/b'], true]);
});

const BAD: [string, string[]][] = [
  ['no mode', ['--paths', 'a']],
  ['both modes', ['--dry-run', '--write', '--paths', 'a']],
  ['write without paths', ['--write']],
  ['unknown flag', ['--dry-run', '--force']],
  ['stray word', ['--dry-run', 'a']],
];

test('bad argument lists are refused', () => {
  for (const [label, argv] of BAD) assert.throws(() => parseFoldArgs(argv), label);
});
