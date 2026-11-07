import { counted } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService } from '@/common/push/push.service';
import { dayLabel } from '@/modules/platform/drive-backup/plan/labels';

/**
 * The backup's admin alerts: the Google sync's bell pattern (google_sync_alert, bell only, never
 * WhatsApp or a push), one row per subject and day, so a failing night is told once.
 */
@Injectable()
export class DriveBackupAlerts {
  constructor(private readonly push: PushService) {}

  private tell(subject: string, reason: string): Promise<void> {
    const event = { subject: `drive_backup:${subject}`, vars: { reason }, bellOnly: true };
    return this.push.notifyAdmins('google_sync_alert', event);
  }

  failed(input: { error: string; now: Date }): Promise<void> {
    const reason = ar.googleSync.alerts.backupFailed.replace('{error}', input.error);
    return this.tell(`failed:${dayLabel(input.now)}`, reason);
  }

  lowQuota(input: { free: string; now: Date }): Promise<void> {
    const reason = ar.googleSync.alerts.backupLowQuota.replace('{free}', input.free);
    return this.tell(`quota:${dayLabel(input.now)}`, reason);
  }

  skipped(input: { count: number; now: Date }): Promise<void> {
    const reason = counted(ar.googleSync.alerts.backupSkipped, input.count);
    return this.tell(`skipped:${dayLabel(input.now)}`, reason);
  }
}
