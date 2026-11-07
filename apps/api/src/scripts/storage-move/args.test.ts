import { describe, expect, it } from 'vitest';
import { parseMoveArgs } from './args';

describe('storage-move command line (docs/45 §6)', () => {
  it('a dry run by default, with the safe defaults', () => {
    expect(parseMoveArgs([])).toEqual({
      apply: false,
      limit: Number.MAX_SAFE_INTEGER,
      batch: 100,
      maxBytes: 64 * 1024 * 1024,
      pauseMs: 500,
      sample: 5,
    });
  });

  it('--apply --table payments --limit 50 --after <id>', () => {
    const after = '00000000-0000-4000-8000-000000000001';
    const argv = ['--apply', '--table', 'payments', '--limit', '50', '--after', after];
    expect(parseMoveArgs(argv)).toMatchObject({ apply: true, table: 'payments', limit: 50, after });
  });

  it.each([
    [['--table', 'students']],
    [['--apply', '--dry-run']],
    [['--after', '00000000-0000-4000-8000-000000000001']],
    [['--limit', '0']],
    [['--batch', '5000']],
    [['--aply']],
    [['apply']],
    [['--apply', 'yes']],
  ])('refuses %j', (argv) => {
    expect(() => parseMoveArgs(argv)).toThrow();
  });
});
