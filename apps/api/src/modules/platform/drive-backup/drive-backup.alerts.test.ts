import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { ar } from '@/common/infra/i18n/server-text';
import { DriveBackupAlerts } from './drive-backup.alerts';

const now = new Date('2026-11-10T01:00:00Z');

function setup() {
  const notifyAdmins = vi.fn().mockResolvedValue(undefined);
  const alerts = new DriveBackupAlerts({ notifyAdmins } as unknown as PushService);
  const said = (): { subject: string; vars: { reason: string } } => notifyAdmins.mock.calls[0]?.[1];
  return { alerts, said };
}

describe('the backup’s alerts (bell only, once a day per subject)', () => {
  it('too large: counted in Arabic forms, the first names given', async () => {
    const t = setup();
    const names = ['reports/a', 'reports/b', 'reports/c', 'reports/d', 'reports/e', 'reports/f'];
    await t.alerts.tooLarge({ names, now });
    expect(t.said().subject).toBe('drive_backup:too_large:2026-11-10');
    expect(t.said().vars.reason).toContain('reports/e');
    expect(t.said().vars.reason).not.toContain('reports/f');
    expect(t.said().vars.reason).toContain('6');
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
