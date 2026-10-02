import type { QuickReplyIntent } from '@ab/shared';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { LessonStatusService } from '../lessons/lesson-status.service';
import type { InboundEvent } from './webhook.events';
import { payloadLesson } from './webhook.inbound';
import { WebhookQueries, type Contact } from './webhook.queries';

/** Audit trail marker for what the webhook does on a guardian's / lead's behalf. */
export const WHATSAPP_ACTOR = 'system:whatsapp';

export interface ReplyAction {
  intent: QuickReplyIntent | null;
  m: InboundEvent;
  lessonId: string | null;
  leadId: string | null;
}

/**
 * Quick replies (R-MSG-04, R-SCH-03): «نعم» confirms the lesson, «وقف الرسايل» pauses a lead's
 * follow-ups. A reschedule is the admin's job: the inbound push carries it (docs/12 §3.5).
 */
@Injectable()
export class QuickReplies {
  private readonly log = new Logger(QuickReplies.name);

  constructor(
    private readonly queries: WebhookQueries,
    private readonly lessons: LessonStatusService,
    private readonly audit: AuditService,
  ) {}

  /**
   * The lesson a reply is about: our button payload, else the lesson of the outbound message it
   * answers (Meta's context.id), else the guardian's next lesson still `scheduled`.
   */
  async lessonFor(input: { m: InboundEvent; phone: string; who: Contact }): Promise<string | null> {
    const { m, phone, who } = input;
    const fromPayload = payloadLesson(m);
    if (fromPayload) return fromPayload;
    if (m.replyTo) {
      const answered = await this.queries.outboundByWaId(m.replyTo);
      if (answered?.lesson_id && answered.phone_e164 === phone) return answered.lesson_id;
    }
    return who.guardian ? this.queries.nextScheduledLesson(who.guardian.id, m.at) : null;
  }

  async act({ intent, m, lessonId, leadId }: ReplyAction): Promise<void> {
    if (intent === 'confirm' && lessonId) await this.confirm(lessonId, m);
    if (intent === 'stop' && leadId) await this.stop(leadId, m);
  }

  /**
   * scheduled → confirmed through the lesson state machine (confirmed_by null = the guardian by
   * WhatsApp). A lesson that can't be confirmed any more (cancelled, gone) is just logged: the
   * message is stored and the admin sees it in the inbox.
   */
  private async confirm(lessonId: string, m: InboundEvent): Promise<void> {
    try {
      await this.lessons.confirm({ lessonId, actor: null });
    } catch (e) {
      if (!(e instanceof HttpException)) throw e;
      this.log.warn(`whatsapp confirm of lesson ${lessonId} skipped: ${JSON.stringify(e.getResponse())}`);
      return;
    }
    await this.audit.record({
      actorId: null,
      entity: 'lessons',
      entityId: lessonId,
      action: 'confirm_by_whatsapp',
      after: { status: 'confirmed', actor: WHATSAPP_ACTOR, wa_message_id: m.waMessageId },
    });
  }

  /**
   * «وقف الرسايل»: no more follow-ups to this lead. follow_up_slots is the only marketing template
   * and goes to leads only, so this flag is the marketing opt-out; utility messages continue.
   */
  private async stop(leadId: string, m: InboundEvent): Promise<void> {
    await this.queries.updateLead(leadId, { follow_up_paused: true });
    await this.audit.record({
      actorId: null,
      entity: 'leads',
      entityId: leadId,
      action: 'follow_up_paused',
      after: { follow_up_paused: true, actor: WHATSAPP_ACTOR, wa_message_id: m.waMessageId },
    });
  }
}
