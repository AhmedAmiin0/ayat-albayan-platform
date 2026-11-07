import { describe, expect, it } from 'vitest';
import type { RecentRow } from '@/modules/platform/drive-backup/db/archive-row.schema';
import { frozenView, lastArchive, lowQuota, quotaView } from './backup-view';

const GB = 1024 ** 3;
const r = (over: Partial<RecentRow>): RecentRow => ({
  id: 'a',
  kind: 'full',
  label: '2026-W45',
  part: 1,
  status: 'done',
  sealed: false,
  started_at: '2026-11-07T01:00:00Z',
  drive_file_id: 'f',
  objects: 10,
  skipped: 0,
  bytes_raw: 100,
  bytes_compressed: 40,
  finished_at: '2026-11-07T01:10:00Z',
  error: null,
  ...over,
});
const state = {
  folder_id: 'f',
  account_email: 'a@example.test',
  quota_at: '2026-11-07T01:00:00Z',
  last_run_at: null,
  last_error: null,
  frozen_since: null,
  frozen_reason: null,
};

describe('the status view', () => {
  it('the newest archive, its parts summed; failed rows ignored', () => {
    const rows = [
      r({ id: 'x', status: 'failed', label: '2026-11-09', kind: 'incr' }),
      r({ part: 2 }),
      r({ part: 1 }),
    ];
    expect(lastArchive(rows)).toMatchObject({
      kind: 'full',
      label: '2026-W45',
      objects: 20,
      bytes_raw: 200,
      bytes_compressed: 80,
    });
    expect(lastArchive([])).toBeNull();
  });

  it('quota: free space, the 2 GB warning, unlimited', () => {
    const q = quotaView({ ...state, quota_limit: 15 * GB, quota_usage: 14 * GB });
    expect(q).toMatchObject({ free: GB });
    expect(lowQuota(q)).toBe(true);
    expect(lowQuota(quotaView({ ...state, quota_limit: null, quota_usage: 99 * GB }))).toBe(false);
    expect(
      quotaView({ ...state, quota_at: null, quota_limit: null, quota_usage: null }),
    ).toBeNull();
  });

  it('frozen: since when and why, or null', () => {
    const since = '2026-11-03T01:00:00Z';
    const frozen = { ...state, quota_limit: null, quota_usage: null };
    expect(frozenView({ ...frozen, frozen_since: since, frozen_reason: 'too_large' })).toEqual({
      since,
      reason: 'too_large',
    });
    expect(frozenView(frozen)).toBeNull();
  });
});
