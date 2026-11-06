import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '@/common/push/push.service';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { EVOLUTION_SEND_ERROR, NumbersEvolution } from '@/modules/messaging/numbers';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { WebhookRepo } from '@/modules/messaging/webhook/webhook.repo';

// Too many WhatsApp ERRORs on an Evolution number (review fix 3, docs/19 «Evolution driver»): an
// ERROR status on one of OUR sends (key.id = the row's wa_message_id) fails only that row; the
// number's `limits.error_trip` of them (default 3) within 15 min switch it off at once (only an
// admin turns it back on), its queued rows fail so staff resend them, and the admins' bell rings
// once. A 401 / 403 from Evolution is an auth problem (the queue is held) and never lands here.

const WORDS = 'رفض واتساب عدة رسائل من هذا الرقم خلال 15 دقيقة فأُوقف تلقائيًا. لا يُعاد تشغيله إلا يدويًا';

const sendError = (e: StatusEvent): boolean => e.errorCode === EVOLUTION_SEND_ERROR;

@Injectable()
export class EvolutionRestriction {
  private readonly log = new Logger(EvolutionRestriction.name);

  constructor(
    private readonly numbers: NumbersEvolution,
    private readonly push: PushService,
    private readonly rows: WebhookRepo,
  ) {}

  /** After the statuses moved their rows: counts the number's ERRORs and maybe switches it off. */
  async check(events: readonly StatusEvent[], at: { numberId: string; now: Date }): Promise<void> {
    const sentAt = await this.sentAt(events);
    if (!sentAt) return;
    if (!(await this.numbers.tripOnErrors(at.numberId, { now: at.now, sentAt }))) return;
    await this.ring(at);
  }

  /** When our ERRORed message went out; null = no ERROR, or not one of our sends. */
  private async sentAt(events: readonly StatusEvent[]): Promise<string | null> {
    const event = events.find(sendError);
    if (!event) return null;
    return (await this.rows.outboundByWaId(event.waMessageId))?.sent_at ?? null;
  }

  private async ring(at: { numberId: string; now: Date }): Promise<void> {
    const label = overlayNumbers()?.find((n) => n.id === at.numberId)?.label ?? 'Evolution';
    this.log.error(`evolution number ${at.numberId}: too many WhatsApp errors, switched off`);
    await this.push.notifyAdmins('reminder_failed', {
      subject: `evolution_restricted:${at.numberId}:${at.now.toISOString().slice(0, 10)}`,
      vars: { template: WORDS, name: label },
      data: { numberId: at.numberId },
    });
  }
}
