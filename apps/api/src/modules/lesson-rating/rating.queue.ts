import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import { MessageSender } from '../whatsapp/message.sender';
import { planRatings, type RatingLesson } from './rating.plan';
import { RatingQueries } from './rating.queries';

/** Why nothing was queued, or how many rows were new. */
export type QueueResult = { queued: number; skipped: 'mode_link' | 'auto_off' | 'not_approved' | null };

/**
 * The automatic lesson_rating (migration 195): only when settings.feedback_mode is 'buttons', the
 * automatic messages switch is ON (docs/09 cut-over) and Meta approved the template. Only queues
 * (created_by null, so the sender also holds it while the switch is OFF); the sender owns the send
 * gate (settings.messaging_enabled + WhatsApp configured), which this never bypasses.
 */
@Injectable()
export class RatingQueue {
  constructor(
    private readonly queries: RatingQueries,
    private readonly settings: SettingsService,
    private readonly sender: MessageSender,
  ) {}

  async queue(read: () => Promise<RatingLesson[]>, now: Date): Promise<QueueResult> {
    const settings = await this.settings.all();
    if (settings.feedback_mode !== 'buttons') return { queued: 0, skipped: 'mode_link' };
    if (!settings.auto_messages_enabled) return { queued: 0, skipped: 'auto_off' };
    if (!(await this.queries.approved())) return { queued: 0, skipped: 'not_approved' };
    const queued = await this.queries.queue(planRatings({ lessons: await read(), now }));
    // Not awaited: a lesson's status change never waits for WhatsApp (the sender logs its own errors).
    if (queued > 0) void this.sender.kick();
    return { queued, skipped: null };
  }
}
