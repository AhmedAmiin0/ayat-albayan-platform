import type { BackupStatusView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { BackupStatusService } from './backup-status.service';
import { BackupStatusController } from './backup-status.controller';

const view: BackupStatusView = {
  enabled: false,
  ready: { minio: true, google: false },
  last: null,
  last_run_at: null,
  last_error: null,
  quota: null,
  low_quota: false,
  skipped: { count: 0, items: [] },
  waiting: 0,
};
const serving = (answer: BackupStatusView) =>
  new BackupStatusController({ view: async () => answer } as unknown as BackupStatusService);

describe('GET /settings/integrations/storage-backup', () => {
  it('answers the status line in its data envelope', async () => {
    expect(await serving(view).view()).toEqual({ data: view });
  });

  it('a status line outside the shared view is a 500 response_invalid', async () => {
    const odd = serving({ ...view, last_run_at: '2026-11-27 10:00' });
    await expect(odd.view()).rejects.toMatchObject({ response: { code: 'response_invalid' } });
  });
});
