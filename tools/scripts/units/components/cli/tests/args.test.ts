import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseComponentArgs } from '../args.ts';

test('flags parse; --step defaults to all', () => {
  const a = parseComponentArgs([
    '--',
    '--dry-run',
    '--paths',
    'apps/a',
    'apps/b',
    '--exclude',
    'x.tsv',
    '--json',
  ]);
  assert.deepEqual(
    [a.dryRun, a.step, a.paths, a.exclude, a.json],
    [true, 'all', ['apps/a', 'apps/b'], 'x.tsv', true],
  );
  assert.equal(parseComponentArgs(['--write', '--step', 'hook', '--paths', 'a']).step, 'hook');
});

test('bad lists are refused', () => {
  for (const argv of [
    ['--paths', 'a'],
    ['--dry-run', '--write', '--paths', 'a'],
    ['--dry-run'],
    ['--dry-run', '--paths', 'a', '--step', 'nope'],
    ['--dry-run', '--paths', 'a', '--force'],
  ]) {
    assert.throws(() => parseComponentArgs(argv), argv.join(' '));
  }
});
