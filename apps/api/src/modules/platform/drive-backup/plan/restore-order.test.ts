import { describe, expect, it } from 'vitest';
import type { BackupFile } from '@/modules/platform/drive-backup/drive/drive-backup.port';
import { restoreOrder } from './restore-order';

const file = (
  id: string,
  props: Record<string, string>,
  createdTime = '2026-11-07',
): BackupFile => ({
  id,
  name: id,
  size: 1,
  createdTime,
  appProperties: { ab_backup: 'minio', ...props },
});

describe('the restore order (add-only)', () => {
  it('newest first by night then part (numeric, not by name); later than `to` left out', () => {
    const files = [
      file('d7p2', { label: '2026-11-07', part: '2' }),
      file('d7p10', { label: '2026-11-07', part: '10' }),
      file('d8p1', { label: '2026-11-08', part: '1' }),
      file('d9p1', { label: '2026-11-09', part: '1' }),
    ];
    expect(restoreOrder(files, '2026-11-08').map((f) => f.id)).toEqual(['d8p1', 'd7p10', 'd7p2']);
  });

  it('a duplicate (the same part name sent twice) is kept; foreign files are ignored', () => {
    const files = [
      file('first', { label: '2026-11-07', part: '1' }, '2026-11-07T01:00:00Z'),
      file('again', { label: '2026-11-07', part: '1' }, '2026-11-07T02:00:00Z'),
      { ...file('x', {}), appProperties: { other: '1' } },
    ];
    expect(restoreOrder(files, '2026-11-07').map((f) => f.id)).toEqual(['again', 'first']);
  });
});
