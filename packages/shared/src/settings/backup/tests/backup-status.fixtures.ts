import type { BackupStatusView } from '..';

export const aBackupView = (): BackupStatusView => ({
  enabled: true,
  ready: { minio: true, google: true },
  last: {
    label: '2026-11-26',
    finished_at: '2026-11-26T23:40:00.000+00:00',
    objects: 120,
    skipped: 1,
    bytes_raw: 5_000_000,
    bytes_compressed: 3_000_000,
  },
  last_run_at: '2026-11-26T23:00:00.000+00:00',
  last_error: null,
  quota: {
    limit: 16_106_127_360,
    usage: 4_000_000_000,
    free: 12_106_127_360,
    at: '2026-11-26T23:41:00Z',
  },
  low_quota: false,
  skipped: { count: 1, items: [{ id: 'reports/a.pdf', size: 9_000_000, reason: 'too_large' }] },
  waiting: 0,
});
