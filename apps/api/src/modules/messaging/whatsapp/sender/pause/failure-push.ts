import type { PushService } from '@/common/push/push.service';
import { messageLabel } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';

/** reminder_failed to the admins; the subject is its dedup key (a hold's: per line and period). */
export function failurePush(push: PushService, row: DueMessage, subject: string): Promise<void> {
  return push.notifyAdmins('reminder_failed', {
    subject,
    vars: {
      template: messageLabel(row),
      name: row.guardian?.name ?? row.lead?.name ?? row.phone_e164,
    },
    data: { phone: row.phone_e164, messageId: row.id },
  });
}

/** Keyed per failed try: a row that fails again after the admin's retry pushes again. */
export const trySubject = (row: DueMessage, now: Date): string => `${row.id}:${now.getTime()}`;
