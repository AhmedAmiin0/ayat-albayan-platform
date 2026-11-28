import { isReactionEmoji, reactionRef } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import type { InboundEvent } from '@/modules/messaging/webhook/webhook.events';
import { ReactionsRepo } from './reactions.repo';

/** applied: set on its message; unknown: no such message yet (a marker); ignored: unusable. */
export type ReactionOutcome = 'applied' | 'unknown' | 'ignored';

/** No emoji (a clear) or a real one; any other text is no reaction. */
const usableEmoji = (emoji: string | null): boolean => emoji === null || isReactionEmoji(emoji);

/**
 * An inbound WhatsApp reaction (migration 900): {reaction: {message_id, emoji}} sets
 * their_reaction on the message it names, of the SAME phone (a wamid of another chat is never
 * touched); an empty emoji clears it. No row, no push, no unread. Never fails the webhook: an
 * unknown target is reported (the caller keeps a marker row, migration 992), a failed write only
 * logged (Meta would re-send the whole batch for one emoji).
 */
@Injectable()
export class InboundReactions {
  private readonly log = new Logger(InboundReactions.name);

  constructor(private readonly repo: ReactionsRepo) {}

  async apply(m: InboundEvent, phone: string): Promise<ReactionOutcome> {
    const ref = reactionRef(m.payload);
    if (!ref || !usableEmoji(ref.emoji)) {
      this.log.debug(`inbound reaction ${m.waMessageId}: no target or not an emoji, ignored`);
      return 'ignored';
    }
    try {
      const changed = await this.repo.setReaction({
        waMessageId: ref.messageId,
        phone,
        emoji: ref.emoji,
      });
      return changed === 0 ? 'unknown' : 'applied';
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      this.log.warn(`inbound reaction ${m.waMessageId} not stored: ${reason}`);
      return 'ignored';
    }
  }
}
