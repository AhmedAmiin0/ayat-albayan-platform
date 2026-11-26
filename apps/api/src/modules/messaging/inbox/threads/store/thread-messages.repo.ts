import type { TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { afterCursor, type AtId } from '@/common/db/page';
import {
  MESSAGE_SELECT, NOT_A_REACTION, type ThreadMessageRow,
} from '@/modules/messaging/whatsapp';
import { check } from './check';
import { aroundRows, PAGE_SELECT } from './thread-around.repo';

/** The queued row; `replayed` = its dedup_key was already queued (nothing written). */
type Queued = ThreadMessageRow & { replayed?: boolean };

/**
 * One page of a phone's messages: `before` (+ `before_id`) = the oldest loaded one, or `around` =
 * the window around one message (thread-around.ts).
 */
interface PageInput {
  phone: string;
  before?: string;
  before_id?: string;
  around?: string;
  limit: number;
}

const NEWEST_FIRST = { column: 'created_at', ascending: false } as const;

const cursorOf = ({ before, before_id }: PageInput): AtId | undefined =>
  before && before_id ? { at: before, id: before_id } : undefined;

/** The page of one phone's messages, one message by id and the queue write (rule 8). */
@Injectable()
export class ThreadMessagesRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Newest first by the message's own time (WhatsApp's for inbound and for messages sent outside
   * the app), id breaking a tie, `limit + 1` rows so the caller knows whether older ones exist;
   * each with its lesson.
   */
  async messages(input: PageInput): Promise<ThreadMessageRow[]> {
    if (input.around) return aroundRows(this.db, { ...input, around: input.around });
    const base = this.db.from('messages').select(PAGE_SELECT).eq('phone_e164', input.phone);
    const query = base.or(NOT_A_REACTION);
    // Old clients send `before` alone (lt); new ones the compound keyset (no tie ever skipped).
    const timeOnly = input.before_id ? undefined : input.before;
    const older = timeOnly ? query.lt('created_at', timeOnly) : query;
    const { data, error } = await afterCursor(older, NEWEST_FIRST, cursorOf(input))
      .limit(input.limit + 1);
    check(error, 'thread messages read');
    return data;
  }

  async get(id: string): Promise<ThreadMessageRow | null> {
    const { data, error } = await this.db
      .from('messages').select(MESSAGE_SELECT).eq('id', id).maybeSingle();
    check(error, 'message read');
    return data;
  }

  /**
   * Rule 8: a replayed dedup_key returns the first row, flagged `replayed` (nothing written). A new
   * row comes back from the write itself (docs/42 42-5); only a replay reads the stored row again.
   */
  async enqueue(row: TablesInsert<'messages'>): Promise<Queued> {
    if (!row.dedup_key) return this.insert(row);
    const { data: created, error } = await this.db
      .from('messages')
      .upsert(row, { onConflict: 'dedup_key', ignoreDuplicates: true })
      .select(MESSAGE_SELECT);
    check(error, 'message enqueue');
    const [fresh] = created;
    if (fresh) return { ...fresh, replayed: false };
    const { data, error: readError } = await this.db
      .from('messages').select(MESSAGE_SELECT).eq('dedup_key', row.dedup_key).single();
    check(readError, 'message enqueue read');
    return { ...data, replayed: true };
  }

  /** The row a dedup_key already queued (rule 8), or null. */
  async byDedupKey(key: string): Promise<ThreadMessageRow | null> {
    const { data, error } = await this.db
      .from('messages').select(MESSAGE_SELECT).eq('dedup_key', key).maybeSingle();
    check(error, 'message dedup read');
    return data;
  }

  private async insert(row: TablesInsert<'messages'>): Promise<ThreadMessageRow> {
    const { data, error } = await this.db.from('messages').insert(row).select(MESSAGE_SELECT).single();
    check(error, 'message enqueue');
    return data;
  }
}
