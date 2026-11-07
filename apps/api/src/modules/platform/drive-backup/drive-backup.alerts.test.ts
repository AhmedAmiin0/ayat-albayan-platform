import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { ar } from '@/common/infra/i18n/server-text';
import { DriveBackupAlerts } from './drive-backup.alerts';
import type { SkippedItem } from './run/summary';

const now = new Date('2026-11-10T01:00:00Z');
const why = ar.integrations.driveBackup.skipReasons;

function setup() {
  const notifyAdmins = vi.fn().mockResolvedValue(undefined);
  const alerts = new DriveBackupAlerts({ notifyAdmins } as unknown as PushService);
  const said = (): { subject: string; vars: { reason: string } } => notifyAdmins.mock.calls[0]?.[1];
  return { alerts, said };
}

describe('the backup’s alerts (bell only, once a day per subject)', () => {
  it('skipped: counted in Arabic forms, the first names given with size and why', async () => {
    const t = setup();
    const keys = ['reports/a', 'reports/b', 'reports/c', 'reports/d', 'reports/e', 'reports/f'];
    const items: SkippedItem[] = keys.map((id) => ({ id, size: 3 * 1024 ** 2, reason: 'changed' }));
    items[0] = { id: 'recordings/r.mp4', size: 5 * 1024 ** 3, reason: 'too_large' };
    await t.alerts.skipped({ items, now });
    expect(t.said().subject).toBe('drive_backup:skipped:2026-11-10');
    const text = t.said().vars.reason;
    expect(text).toContain(`recordings/r.mp4 (5.0 GB، ${why.too_large})`);
    expect(text).toContain(`reports/e (3.0 MB، ${why.changed})`);
    expect(text).not.toContain('reports/f');
    expect(text).toContain('6');
  });

  it('Drive nearly full: says to delete old archives by hand', async () => {
    const t = setup();
    await t.alerts.driveFull({ now });
    expect(t.said().subject).toBe('drive_backup:drive_full:2026-11-10');
    expect(t.said().vars.reason).toBe(ar.googleSync.alerts.backupDriveFull);
  });
});
