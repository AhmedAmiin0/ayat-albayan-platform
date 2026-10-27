import { RATING_TEMPLATE, type QuickReplyIntent } from '@ab/shared';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { LessonStatusService } from '../../../teaching/lessons/status/lesson-status.service';
import type { InboundEvent } from '../webhook.events';
import { payloadLesson } from './webhook.inbound';
import { WebhookQueries, type Contact } from '../webhook.queries';

/** Audit trail marker for what the webhook does on a guardian's / lead's behalf. */
const WHATSAPP_ACTOR = 'system:whatsapp';

interface ReplyAction {
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
   * The lesson a guardian's reply is about (docs/12 §3.5): our button payload (only if that lesson
   * is theirs), else the lesson of the outbound message it answers (Meta's context.id, same phone),
   * else the latest lesson-linked message we sent them within settings.quick_reply_window_hours whose lesson is still open.
   * Anyone else, or nothing found → null: the message is only stored and the admin reads it.
   * A rating tap (lesson_rating, migration 195) takes only the first two: its payload, or the
   * lesson_rating message it answers.
   */
  async lessonFor(input: { m: InboundEvent; phone: string; who: Contact; rating?: boolean }): Promise<string | null> {
    const { m, phone, who, rating = false } = input;
    if (!who.guardian) return null;
    const fromPayload = payloadLesson(m);
    if (fromPayload) {
      const theirs = await this.queries.guardianLesson({ lessonId: fromPayload, guardianId: who.guardian.id });
      return theirs ? fromPayload : null;
    }
    const answered = await this.answeredLesson({ m, phone, rating });
    if (answered || rating) return answered; // a rating only ever answers our lesson_rating message, never a guess
    // A typed «نعم» counts only for a lesson we messaged them about this recently (docs/12 §3.5).
    const windowMs = await this.queries.replyWindowMs();
    return this.queries.recentLessonOutbound({ phone, since: new Date(m.at.getTime() - windowMs) });
  }

  /** The lesson of the outbound message this replies to (same phone; a rating: only lesson_rating). */
  private async answeredLesson(input: { m: InboundEvent; phone: string; rating: boolean }): Promise<string | null> {
    if (!input.m.replyTo) return null;
    const answered = await this.queries.outboundByWaId(input.m.replyTo);
    if (!answered?.lesson_id || answered.phone_e164 !== input.phone) return null;
    return !input.rating || answered.template_key === RATING_TEMPLATE ? answered.lesson_id : null;
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
    await this.queries.updateLead(leadId, { follow_up_paused: true, follow_up_paused_by: 'lead' });
    await this.audit.record({
      actorId: null,
      entity: 'leads',
      entityId: leadId,
      action: 'follow_up_paused',
      after: { follow_up_paused: true, actor: WHATSAPP_ACTOR, wa_message_id: m.waMessageId },
    });
  }
}
