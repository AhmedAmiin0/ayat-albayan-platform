import { counted } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService } from '@/common/push/push.service';
import { dayLabel } from '@/modules/platform/drive-backup/plan/labels';
import { sizeText } from '@/modules/platform/drive-backup/run/quota';
import type { SkippedItem } from '@/modules/platform/drive-backup/run/summary';

/** At most this many names in the skipped alert (the rest only counted). */
const NAMES_SHOWN = 5;

/** «bucket/key (size، why)». */
const itemText = (t: SkippedItem): string =>
  ar.googleSync.alerts.backupSkippedItem
    .replace('{name}', t.id)
    .replace('{size}', sizeText(t.size))
    .replace('{why}', ar.integrations.driveBackup.skipReasons[t.reason]);

/**
 * The backup's admin alerts: the Google sync's bell pattern (google_sync_alert, bell only, never
 * WhatsApp or a push), one row per subject and day, so a failing night is told once.
 */
@Injectable()
export class DriveBackupAlerts {
  // @Inject(Class): the class is a value here (DI), not only a type (docs/31b §3.2).
  constructor(@Inject(PushService) private readonly push: PushService) {}

  private tell(subject: string, reason: string): Promise<void> {
    const event = { subject: `drive_backup:${subject}`, vars: { reason }, bellOnly: true };
    return this.push.notifyAdmins('google_sync_alert', event);
  }

  failed(input: { error: string; now: Date }): Promise<void> {
    const reason = ar.googleSync.alerts.backupFailed.replace('{error}', input.error);
    return this.tell(`failed:${dayLabel(input.now)}`, reason);
  }

  /** Objects not backed up tonight, named (the first few): size and why; retried every night. */
  skipped(input: { items: readonly SkippedItem[]; now: Date }): Promise<void> {
    const names = input.items.slice(0, NAMES_SHOWN).map(itemText).join('، ');
    const text = counted(ar.googleSync.alerts.backupSkipped, input.items.length);
    return this.tell(`skipped:${dayLabel(input.now)}`, text.replace('{names}', names));
  }

  /** Drive's free space is under the 2 GB reserve: old archives must be deleted by hand. */
  driveFull(input: { now: Date }): Promise<void> {
    return this.tell(`drive_full:${dayLabel(input.now)}`, ar.googleSync.alerts.backupDriveFull);
  }
}
