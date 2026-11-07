import { counted } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService } from '@/common/push/push.service';
import type { FrozenReason } from '@/modules/platform/drive-backup/plan/frozen';
import { dayLabel } from '@/modules/platform/drive-backup/plan/labels';
import type { OldestLeft } from '@/modules/platform/drive-backup/plan/left';
import { gbText } from '@/modules/platform/drive-backup/run/quota';
import type { TooLargeItem } from '@/modules/platform/drive-backup/run/summary';

/** At most this many names in the too-large alert (the rest only counted). */
const NAMES_SHOWN = 5;

/** «bucket/key (size، why)»: why from the plan (larger than Drive's room or the night's cap). */
const itemText = (t: TooLargeItem): string =>
  ar.googleSync.alerts.backupTooLargeItem
    .replace('{name}', t.id)
    .replace('{size}', gbText(t.size))
    .replace('{why}', ar.integrations.driveBackup.tooLargeReasons[t.why]);

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

  lowQuota(input: { free: string; now: Date }): Promise<void> {
    const reason = ar.googleSync.alerts.backupLowQuota.replace('{free}', input.free);
    return this.tell(`quota:${dayLabel(input.now)}`, reason);
  }

  skipped(input: { count: number; now: Date }): Promise<void> {
    const reason = counted(ar.googleSync.alerts.backupSkipped, input.count);
    return this.tell(`skipped:${dayLabel(input.now)}`, reason);
  }

  /** Objects never sent (above Drive's room or the night's cap): the first few, size and why. */
  tooLarge(input: { items: readonly TooLargeItem[]; now: Date }): Promise<void> {
    const names = input.items.slice(0, NAMES_SHOWN).map(itemText).join('، ');
    const text = counted(ar.googleSync.alerts.backupTooLarge, input.items.length);
    return this.tell(`too_large:${dayLabel(input.now)}`, text.replace('{names}', names));
  }

  /** Objects the night's cap left 3 nights running: how many, the oldest by name and night. */
  left(input: OldestLeft & { now: Date }): Promise<void> {
    const text = counted(ar.googleSync.alerts.backupLeft, input.count)
      .replace('{name}', input.key)
      .replace('{since}', input.since.slice(0, 10));
    return this.tell(`left:${dayLabel(input.now)}`, text);
  }

  /** «النسخ الاحتياطي متوقف»: a full open for more than 3 nights, and why. */
  frozen(input: { reason: FrozenReason; since: string; now: Date }): Promise<void> {
    const why = ar.integrations.driveBackup.frozenReasons[input.reason];
    const text = ar.googleSync.alerts.backupFrozen
      .replace('{since}', input.since.slice(0, 10))
      .replace('{reason}', why);
    return this.tell(`frozen:${dayLabel(input.now)}`, text);
  }
}
