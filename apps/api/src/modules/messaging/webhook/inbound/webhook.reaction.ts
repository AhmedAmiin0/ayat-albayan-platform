import { isReactionEmoji, reactionRef } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { InboundEvent } from '@/modules/messaging/webhook/webhook.events';

/** applied: set on its message; unknown: no such message yet (a marker); ignored: unusable. */
export type ReactionOutcome = 'applied' | 'unknown' | 'ignored';

/**
 * An inbound WhatsApp reaction (owner 2026-10-27, migration 900): {reaction: {message_id, emoji}} sets
 * their_reaction on the message it names, of the SAME phone (a wamid of another chat is never touched);
 * an empty emoji clears it. No row, no push, no unread. Never fails the webhook: an unknown target is
 * reported (the caller keeps a marker row, migration 985), a failed write only logged (Meta would
 * re-send the whole batch for one emoji).
 */
@Injectable()
export class InboundReactions {
  private readonly log = new Logger(InboundReactions.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async apply(m: InboundEvent, phone: string): Promise<ReactionOutcome> {
    const ref = reactionRef(m.payload);
    if (!ref || (ref.emoji !== null && !isReactionEmoji(ref.emoji))) {
      this.log.debug(`inbound reaction ${m.waMessageId}: no target or not an emoji, ignored`);
      return 'ignored';
    }
    try {
      const { data, error } = await this.db
        .from('messages')
        .update({ their_reaction: ref.emoji })
        .eq('wa_message_id', ref.messageId)
        .eq('phone_e164', phone)
        .select('id');
      if (error) throw new Error(error.message);
      return (data ?? []).length === 0 ? 'unknown' : 'applied';
    } catch (e) {
      this.log.warn(`inbound reaction ${m.waMessageId} not stored: ${e instanceof Error ? e.message : String(e)}`);
      return 'ignored';
    }
  }
}
