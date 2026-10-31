import { counted } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService } from '@/common/push/push.service';
import type { KapsoNumber } from '@/modules/messaging/webhook/external/kapso-numbers';

/** The UTC day of `now`: one alert per number per day. */
const dayOf = (now: Date): string => now.toISOString().slice(0, 10);

/**
 * The admins' alert that Kapso's webhook is not delivering (the catch-up stored messages older than
 * LATE_MS): ONE per chat number (= per line) per UTC day. PushService's dedup key
 * (`new_message:kapso-webhook:<number>:<day>:<profile>`) holds across runs and restarts; the set
 * below only spares the database the repeat. Kind new_message (no new push kind, no migration): the
 * bell row and the push open the inbox, titled with the alert instead of a family's name.
 */
@Injectable()
export class InboundGapAlert {
  private readonly log = new Logger(InboundGapAlert.name);
  private readonly raised = new Set<string>();

  constructor(private readonly push: PushService) {}

  async raise(n: KapsoNumber, late: { count: number; now: Date }): Promise<void> {
    const subject = `kapso-webhook:${n.numberId ?? n.line}:${dayOf(late.now)}`;
    if (this.raised.has(subject)) return;
    this.raised.add(subject);
    const text = ar.notifications.kapso_webhook_gap;
    const body = counted(text.body, late.count);
    await this.push.notifyAdmins('new_message', {
      subject,
      title: text.title,
      vars: { name: 'Kapso', text: body },
    });
    this.log.warn(`kapso webhook gap on ${n.line}: ${late.count} late messages, admins alerted`);
  }
}
