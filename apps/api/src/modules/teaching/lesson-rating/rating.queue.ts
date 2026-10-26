import { Injectable } from '@nestjs/common';
import { ruleOf } from '../../../common/rules/rule-of';
import { MessageSender } from '../../messaging/whatsapp/sender/message.sender';
import { planRatings, type RatingLesson } from './rating.plan';
import { RatingQueries } from './rating.queries';
import { RatingReads } from './rating.reads';

/** Why nothing was queued (mode_link = the lesson_rating rule is off; rules_unread = fail closed), or how many rows were new. */
export type QueueResult = { queued: number; skipped: 'mode_link' | 'rules_unread' | 'auto_off' | 'not_approved' | null };

/**
 * The automatic lesson_rating (migration 195): only while its notification rule is on (legacy:
 * settings.feedback_mode 'buttons'; unreadable = nothing, retried by the next sweep), the
 * automatic messages switch is ON (docs/09 cut-over) and Meta approved the template. Only queues
 * (created_by null, so the sender also holds it while the switch is OFF); the sender owns the send
 * gate (settings.messaging_enabled + WhatsApp configured), which this never bypasses.
 */
@Injectable()
export class RatingQueue {
  constructor(
    private readonly queries: RatingQueries,
    private readonly reads: RatingReads,
    private readonly sender: MessageSender,
  ) {}

  async queue(read: () => Promise<RatingLesson[]>, now: Date): Promise<QueueResult> {
    const snap = await this.reads.policy.snapshot();
    if (!snap) return { queued: 0, skipped: 'rules_unread' };
    if (!ruleOf(snap, 'lesson_rating').enabled) return { queued: 0, skipped: 'mode_link' };
    const settings = await this.reads.settings.read();
    if (!settings.auto_messages_enabled) return { queued: 0, skipped: 'auto_off' };
    if (!(await this.queries.approved())) return { queued: 0, skipped: 'not_approved' };
    const queued = await this.queries.queue(planRatings({ lessons: await read(), now }));
    // Not awaited: a lesson's status change never waits for WhatsApp (the sender logs its own errors).
    if (queued > 0) void this.sender.kick();
    return { queued, skipped: null };
  }
}
