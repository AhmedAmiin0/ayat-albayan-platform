import { waIdToE164 } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../../common/push/push.service';
import type { InboundEvent } from './webhook.events';
import { inboundPush, intentOf } from './webhook.inbound';
import { InboundStore } from './webhook.inbound.store';
import { QuickReplies } from './webhook.quick-reply';

/** Time an undo (one DELETE) gets before the controller's 200 goes out. */
const UNDO_MARGIN_MS = 500;

export interface InboundOptions {
  /** Epoch ms when Meta gets its 200 regardless (WebhookService); none = it waits for us. */
  deadline?: number;
}

/**
 * One inbound WhatsApp message (R-MSG-04, R-LEAD-01): lead upsert, the stored row, quick reply
 * and the admin push. Replay-safe: Meta re-sends a wamid until it gets a 200, and a wamid already
 * stored stops here before any side effect (no second confirm, no second push). If the quick
 * reply fails (DB down) while Meta still waits for our answer, the row just stored is removed and
 * the error goes up (500): Meta's re-send then finds no row and does it all again. Past the
 * deadline Meta already has its 200 and will not re-send, so the row stays (the message is in the
 * inbox; only the confirm / pause and the push are lost) and the error is only logged.
 * ponytail: a pending flag on the row + a sweeper would retry those too; add it if logs show any.
 */
@Injectable()
export class InboundService {
  private readonly log = new Logger(InboundService.name);

  constructor(
    private readonly store: InboundStore,
    private readonly replies: QuickReplies,
    private readonly push: PushService,
  ) {}

  async handle(m: InboundEvent, opts: InboundOptions = {}): Promise<void> {
    const phone = waIdToE164(m.from);
    if (!phone) return void this.log.warn(`inbound ${m.waMessageId}: wa_id ${m.from} is not a phone`);
    const { who, lead } = await this.store.sender({ m, phone });
    const intent = intentOf(m);
    const lessonId =
      intent === 'confirm' || intent === 'reschedule' ? await this.replies.lessonFor({ m, phone, who }) : null;
    const stored = await this.store.save({ m, phone, who, leadId: lead.id, lessonId, stage: lead.stage });
    if (!stored) return; // replay of a wamid we already handled
    try {
      await this.replies.act({ intent, m, lessonId, leadId: lead.id });
    } catch (e) {
      await this.undo(m.waMessageId, opts.deadline);
      throw e;
    }
    const { kind, event } = inboundPush({ m, phone, who, newLeadId: lead.created, intent });
    await this.push.notifyAdmins(kind, event);
  }

  /** Unstores the row so Meta's re-send runs the reply again, only while Meta still waits. */
  private async undo(waMessageId: string, deadline: number | undefined): Promise<void> {
    if (deadline !== undefined && Date.now() > deadline - UNDO_MARGIN_MS) {
      return void this.log.error(`inbound ${waMessageId}: quick reply failed after the 200; row kept`);
    }
    try {
      await this.store.forget(waMessageId);
    } catch (e) {
      this.log.error(`inbound ${waMessageId}: could not unstore: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
