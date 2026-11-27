import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseApiOneArgs } from '../args.ts';

test('a dry run by default; --write and --exclude <file> read', () => {
  assert.deepEqual(parseApiOneArgs([]), { write: false, unknown: [] });
  assert.deepEqual(parseApiOneArgs(['--', '--write', '--exclude', 'x.tsv']), {
    write: true,
    exclude: 'x.tsv',
    unknown: [],
  });
});

test('an unknown argument or a missing exclude file name is refused', () => {
  assert.throws(() => parseApiOneArgs(['--dry']), /unknown argument/);
  assert.throws(() => parseApiOneArgs(['--exclude']));
});
