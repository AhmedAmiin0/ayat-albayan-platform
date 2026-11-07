import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { ar } from '@/common/infra/i18n/server-text';
import { DriveBackupAlerts } from './drive-backup.alerts';
import type { TooLargeItem } from './run/summary';

const now = new Date('2026-11-10T01:00:00Z');

function setup() {
  const notifyAdmins = vi.fn().mockResolvedValue(undefined);
  const alerts = new DriveBackupAlerts({ notifyAdmins } as unknown as PushService);
  const said = (): { subject: string; vars: { reason: string } } => notifyAdmins.mock.calls[0]?.[1];
  return { alerts, said };
}

describe('the backup’s alerts (bell only, once a day per subject)', () => {
  it('too large: counted in Arabic forms, the first names given with size and why', async () => {
    const t = setup();
    const keys = ['reports/a', 'reports/b', 'reports/c', 'reports/d', 'reports/e', 'reports/f'];
    const items: TooLargeItem[] = keys.map((id) => ({ id, size: 1024 ** 3, why: 'room' }));
    items[0] = { id: 'recordings/r.mp4', size: 5 * 1024 ** 3, why: 'night' };
    await t.alerts.tooLarge({ items, now });
    expect(t.said().subject).toBe('drive_backup:too_large:2026-11-10');
    const text = t.said().vars.reason;
    expect(text).toContain('recordings/r.mp4 (5.0 GB، أكبر من حدّ الليلة)');
    expect(text).toContain(
      `reports/e (1.0 GB، ${ar.integrations.driveBackup.tooLargeReasons.room})`,
    );
    expect(text).not.toContain('reports/f');
    expect(text).toContain('6');
  });

  it('frozen: «النسخ الاحتياطي متوقف» with the day it started and the reason', async () => {
    const t = setup();
    await t.alerts.frozen({ reason: 'drive_full', since: '2026-11-06T01:00:00Z', now });
    const text = t.said().vars.reason;
    expect(text).toContain('النسخ الاحتياطي متوقف');
    expect(text).toContain('2026-11-06');
    expect(text).toContain(ar.integrations.driveBackup.frozenReasons.drive_full);
  });

  it('left 3 nights: counted, the oldest named with its day', async () => {
    const t = setup();
    await t.alerts.left({ count: 7, key: 'recordings/r.mp4', since: '2026-11-08T01:00:00Z', now });
    expect(t.said().subject).toBe('drive_backup:left:2026-11-10');
    const text = t.said().vars.reason;
    expect(text).toContain('recordings/r.mp4');
    expect(text).toContain('2026-11-08');
    expect(text).toContain('7');
  });
});
