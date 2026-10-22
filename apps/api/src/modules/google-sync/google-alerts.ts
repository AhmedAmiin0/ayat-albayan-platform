import { Injectable } from '@nestjs/common';
import { ar } from '../../common/i18n/server-text';
import { PushService } from '../../common/push/push.service';

/**
 * The Google sync's admin alerts (docs/24 §3): a bell row only, never WhatsApp or a push. One row
 * per subject (PushService dedups `google_sync_alert:<subject>:<profile>`), so a dead link or an
 * unmapped teacher is told once, not on every pass. Never throws.
 */
@Injectable()
export class GoogleAlerts {
  constructor(private readonly push: PushService) {}

  /** invalid_grant: the refresh token is dead; the subject carries the day so a later expiry is told again. */
  disconnected(now = new Date()): Promise<void> {
    const reason = ar.googleSync.alerts.disconnected;
    return this.push.notifyAdmins('google_sync_alert', { subject: `disconnected:${now.toISOString().slice(0, 10)}`, vars: { reason }, bellOnly: true });
  }

  /** A teacher's lessons go to the main calendar only until a calendar is confirmed for them. */
  teacherUnmapped(input: { teacherId: string; name: string }): Promise<void> {
    const reason = ar.googleSync.alerts.teacherUnmapped.replace('{name}', input.name);
    return this.push.notifyAdmins('google_sync_alert', { subject: `teacher:${input.teacherId}`, vars: { reason }, bellOnly: true });
  }
}
