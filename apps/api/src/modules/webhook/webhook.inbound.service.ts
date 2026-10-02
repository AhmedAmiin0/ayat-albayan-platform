import { waIdToE164 } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../../common/push/push.service';
import type { InboundEvent } from './webhook.events';
import { inboundPush, intentOf } from './webhook.inbound';
import { InboundStore } from './webhook.inbound.store';
import { QuickReplies } from './webhook.quick-reply';

/**
 * One inbound WhatsApp message (R-MSG-04, R-LEAD-01): lead upsert, the stored row, quick reply
 * and the admin push. Replay-safe: Meta re-sends a wamid until it gets a 200, and a wamid already
 * stored stops here before any side effect (no second confirm, no second push).
 */
@Injectable()
export class InboundService {
  private readonly log = new Logger(InboundService.name);

  constructor(
    private readonly store: InboundStore,
    private readonly replies: QuickReplies,
    private readonly push: PushService,
  ) {}

  async handle(m: InboundEvent): Promise<void> {
    const phone = waIdToE164(m.from);
    if (!phone) return void this.log.warn(`inbound ${m.waMessageId}: wa_id ${m.from} is not a phone`);
    const { who, lead } = await this.store.sender({ m, phone });
    const intent = intentOf(m);
    const lessonId =
      intent === 'confirm' || intent === 'reschedule' ? await this.replies.lessonFor({ m, phone, who }) : null;
    const stored = await this.store.save({ m, phone, who, leadId: lead.id, lessonId, stage: lead.stage });
    if (!stored) return; // replay of a wamid we already handled
    await this.replies.act({ intent, m, lessonId, leadId: lead.id });
    const { kind, event } = inboundPush({ m, phone, who, newLeadId: lead.created, intent });
    await this.push.notifyAdmins(kind, event);
  }
}
