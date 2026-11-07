import type { TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import {
  MESSAGE_SELECT, NOT_A_REACTION, type ThreadMessageRow,
} from '@/modules/messaging/whatsapp';
import { check } from './check';
import { aroundRows, PAGE_SELECT, quoted } from './thread-around.repo';

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

/** Strictly older than (before, before_id): an earlier time, or the same time and a lower id. */
const keyset = (before: string, id: string): string =>
  `created_at.lt.${quoted(before)},and(created_at.eq.${quoted(before)},id.lt.${id})`;

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
    let query = this.db.from('messages').select(PAGE_SELECT).eq('phone_e164', input.phone);
    query = query.or(NOT_A_REACTION);
    // Old clients send `before` alone (lt); new ones the compound keyset (no tie ever skipped).
    if (input.before) {
      query = input.before_id
        ? query.lte('created_at', input.before).or(keyset(input.before, input.before_id))
        : query.lt('created_at', input.before);
    }
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
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

  private async insert(row: TablesInsert<'messages'>): Promise<ThreadMessageRow> {
    const { data, error } = await this.db.from('messages').insert(row).select(MESSAGE_SELECT).single();
    check(error, 'message enqueue');
    return data;
  }
}
