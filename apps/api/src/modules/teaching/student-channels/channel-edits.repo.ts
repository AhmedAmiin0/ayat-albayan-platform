import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { COLUMNS, type ChannelMessageRow } from './channel.repo';

/**
 * A deleted message's body: the check stays 1..2000 and the API never serves it (migration 993).
 */
export const DELETED_BODY = '-';

/**
 * One change: the message (already checked), who, when; `previous` goes to channel_message_edits.
 */
interface ChannelChange {
  id: string;
  actor: string;
  at: string;
  previous: string;
}

/**
 * channel_messages edits and deletes with their history (service role; ChannelEdits decides who
 * may).
 */
@Injectable()
export class ChannelEditsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** A message of this channel only (another channel's id reads as unknown). */
  async message(input: { channelId: string; id: string }): Promise<ChannelMessageRow | null> {
    const { data, error } = await this.db
      .from('channel_messages')
      .select(COLUMNS)
      .eq('channel_id', input.channelId)
      .eq('id', input.id)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** New text, stamped edited; null when it was deleted meanwhile (compare-and-set). */
  async edit(change: ChannelChange & { body: string }): Promise<ChannelMessageRow | null> {
    const patch = { body: change.body, edited_at: change.at };
    return this.apply(change, { patch, kind: 'edit' });
  }

  /** Deleted for everyone: the body is cleared, the text kept in the history. */
  async remove(change: ChannelChange): Promise<ChannelMessageRow | null> {
    const patch = { body: DELETED_BODY, deleted_at: change.at, deleted_by: change.actor };
    return this.apply(change, { patch, kind: 'delete' });
  }

  private async apply(change: ChannelChange, op: { patch: object; kind: 'edit' | 'delete' }) {
    const { data, error } = await this.db
      .from('channel_messages')
      .update(op.patch)
      .eq('id', change.id)
      .is('deleted_at', null)
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!data) return null;
    const history = {
      message_id: change.id,
      kind: op.kind,
      previous_body: change.previous,
      actor_profile_id: change.actor,
    };
    const saved = await this.db.from('channel_message_edits').insert(history);
    if (saved.error) throw dbError(saved.error);
    return data;
  }
}
