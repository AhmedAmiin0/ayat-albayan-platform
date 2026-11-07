import { describe, expect, it } from 'vitest';
import { parseRestoreArgs } from './args';

describe('minio-drive-restore arguments', () => {
  it('a dry run unless --apply; ifAbsent unless --overwrite', () => {
    expect(parseRestoreArgs(['--to', '2026-11-07'])).toEqual({
      to: '2026-11-07',
      apply: false,
      overwrite: false,
    });
    expect(parseRestoreArgs(['--to', '2026-11-07', '--apply', '--overwrite'])).toMatchObject({
      apply: true,
      overwrite: true,
    });
  });

  it('refuses a missing or odd --to and unknown words', () => {
    expect(() => parseRestoreArgs(['--apply'])).toThrow();
    expect(() => parseRestoreArgs(['--to', '7/11/2026'])).toThrow();
    expect(() => parseRestoreArgs(['--to', '2026-11-07', '--all'])).toThrow();
  });
});
