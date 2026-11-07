import { describe, expect, it } from 'vitest';
import type { BackupState } from '@/modules/platform/drive-backup/db/backup-state.repo';
import type { RecentRow } from '@/modules/platform/drive-backup/db/archive-row.schema';
import { lastArchive, lowQuota, quotaView, skippedView } from './backup-view';

const GB = 1024 ** 3;

const r = (over: Partial<RecentRow>): RecentRow => ({
  label: '2026-11-07',
  part: 1,
  status: 'done',
  objects: 10,
  skipped: 0,
  bytes_raw: 100,
  bytes_compressed: 40,
  finished_at: '2026-11-07T01:10:00Z',
  ...over,
});

const state: BackupState = {
  folder_id: 'f',
  account_email: 'a@example.test',
  quota_limit: null,
  quota_usage: null,
  quota_at: '2026-11-07T01:00:00Z',
  last_run_at: null,
  last_error: null,
  skipped: [],
  skipped_count: 0,
  waiting: 0,
};

describe('the status view', () => {
  it('the newest night, its parts summed; failed rows ignored', () => {
    const rows = [r({ status: 'failed', label: '2026-11-09' }), r({ part: 2 }), r({ part: 1 })];
    expect(lastArchive(rows)).toMatchObject({
      label: '2026-11-07',
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
    expect(lowQuota(quotaView({ ...state, quota_usage: 99 * GB }))).toBe(false);
    expect(quotaView({ ...state, quota_at: null })).toBeNull();
  });

  it('the skipped objects, named, with the full count', () => {
    const items = [{ id: 'reports/a', size: 5, reason: 'read_failed' as const }];
    expect(skippedView({ ...state, skipped: items, skipped_count: 70 })).toEqual({
      count: 70,
      items,
    });
  });
});
