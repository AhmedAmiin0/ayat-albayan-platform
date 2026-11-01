import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import {
  MESSAGE_SELECT,
  NOT_A_REACTION,
  type ThreadMessageRow,
} from '@/modules/messaging/whatsapp';

/** The page's own select: the message with its lesson, sending teacher and staff sender (ThreadsQueries.messages). */
const SELECT = `${MESSAGE_SELECT}, lesson:lessons(starts_at, ends_at, status)` as const;
/** A chat never has more rows in flight than this; past it the NEWEST are kept (the ticks that still move). */
const PENDING_LIMIT = 50;

function check(error: { message: string } | null, what: string): asserts error is null {
  if (error) throw new Error(`${what} failed: ${error.message}`);
}

/** The delta refresh's two reads (thread-delta.service.ts), both on messages_phone_idx. */
@Injectable()
export class DeltaRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The chat's rows created after `after`, newest first, `limit + 1` so the caller sees a gap. */
  async newer(q: { phone: string; after: string; limit: number }): Promise<ThreadMessageRow[]> {
    const { data, error } = await this.db
      .from('messages')
      .select(SELECT)
      .eq('phone_e164', q.phone)
      .or(NOT_A_REACTION)
      .gt('created_at', q.after)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(q.limit + 1);
    check(error, 'thread delta read');
    return data ?? [];
  }

  /**
   * Outgoing rows whose status may still move: `ids` (validated uuids; this chat's rows only, whatever
   * the caller passes) and the chat's outbound rows queued / sent / delivered created after `since`.
   * Also any row an edit, delete or reaction changed after `since` (migration 992 stamps now()).
   */
  async pending(q: { phone: string; ids: readonly string[]; since: string }): Promise<ThreadMessageRow[]> {
    const moving = `and(direction.eq.outbound,status.in.(queued,sent,delivered),created_at.gt."${q.since}")`;
    const marked = ['edited_at', 'deleted_at', 'our_reaction_at'].map((c) => `${c}.gt."${q.since}"`);
    const ids = q.ids.length > 0 ? [`id.in.(${q.ids.join(',')})`] : [];
    const filter = [...ids, moving, ...marked].join(',');
    const { data, error } = await this.db
      .from('messages')
      .select(SELECT)
      .eq('phone_e164', q.phone)
      .or(filter)
      .order('created_at', { ascending: false })
      .limit(PENDING_LIMIT);
    check(error, 'thread pending read');
    return data ?? [];
  }
}
