import type { Json } from '@ab/db';
import { isReactionPayload, reactionTooOld } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { notFound } from '../../../../common/http/errors';
import { waHttpError } from '../../whatsapp';

/** The message a reaction targets, as the guard and the payload read it. */
export interface ReactionTarget {
  id: string;
  wa_message_id: string | null;
  created_at: string;
  line: string | null;
  number_id: string | null;
  interactive_payload: Json | null;
  our_reaction: string | null;
  our_reaction_by: string | null;
  our_reaction_at: string | null;
}

/** Ours on the target: what it is now, or what it goes back to (the revert of migration 900). */
interface OurReaction {
  emoji: string | null;
  by: string | null;
  at: string | null;
}

/**
 * 404 message_not_found for another chat's message, an unknown id or a reaction row; 409 not_reactable
 * without a wamid (WhatsApp does not know it); 409 reaction_too_old past WhatsApp's 30 days.
 */
export function assertReactable(target: ReactionTarget | null, now: Date): asserts target is ReactionTarget {
  if (!target || isReactionPayload(target.interactive_payload)) throw notFound('message_not_found');
  if (!target.wa_message_id) throw waHttpError('not_reactable', HttpStatus.CONFLICT);
  if (reactionTooOld(target.created_at, now)) throw waHttpError('reaction_too_old', HttpStatus.CONFLICT);
}

/** The reaction send's marker (dispatch reads `reaction`; the revert trigger `target_id` and `previous`). */
export const reactionPayload = (target: ReactionTarget, emoji: string | null): Json => ({
  type: 'reaction',
  reaction: { message_id: target.wa_message_id, emoji: emoji ?? '' },
  target_id: target.id,
  previous: { emoji: target.our_reaction, by: target.our_reaction_by, at: target.our_reaction_at },
});

const TARGET_SELECT = 'id, wa_message_id, created_at, line, number_id, interactive_payload, our_reaction, our_reaction_by, our_reaction_at' as const;

/** The reaction endpoint's reads and its one optimistic write (service role; the guards run first). */
@Injectable()
export class ReactionQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The message, in THIS chat only (a reaction never crosses phones). */
  async target(phone: string, messageId: string): Promise<ReactionTarget | null> {
    const { data, error } = await this.db.from('messages').select(TARGET_SELECT).eq('id', messageId).eq('phone_e164', phone).maybeSingle();
    if (error) throw new Error(`reaction target read failed: ${error.message}`);
    return data;
  }

  /** A request id already queued (rule 8): the retry changes nothing and sends nothing. */
  async queued(dedupKey: string): Promise<boolean> {
    const { data, error } = await this.db.from('messages').select('id').eq('dedup_key', dedupKey).limit(1);
    if (error) throw new Error(`reaction replay read failed: ${error.message}`);
    return (data ?? []).length > 0;
  }

  /** Ours at once (optimistic); a failed send puts back `previous` (trigger messages_reaction_failed). */
  async setOurs(input: { targetId: string; phone: string; ours: OurReaction }): Promise<void> {
    const { emoji, by, at } = input.ours;
    const patch = { our_reaction: emoji, our_reaction_by: emoji ? by : null, our_reaction_at: emoji ? at : null };
    const { error } = await this.db.from('messages').update(patch).eq('id', input.targetId).eq('phone_e164', input.phone);
    if (error) throw new Error(`reaction write failed: ${error.message}`);
  }
}
