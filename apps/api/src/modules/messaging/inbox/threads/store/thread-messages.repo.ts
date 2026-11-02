import type { TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import {
  MESSAGE_SELECT, NOT_A_REACTION, type MessageRow, type ThreadMessageRow,
} from '@/modules/messaging/whatsapp';
import { check } from './check';

/** The queued row; `replayed` = its dedup_key was already queued (nothing written). */
type Queued = MessageRow & { replayed?: boolean };

/** One page of a phone's messages: `before` = created_at of the oldest loaded one. */
interface PageInput {
  phone: string;
  before?: string;
  limit: number;
}

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
    const select = `${MESSAGE_SELECT}, lesson:lessons(starts_at, ends_at, status)` as const;
    let query = this.db.from('messages').select(select).eq('phone_e164', input.phone);
    query = query.or(NOT_A_REACTION);
    if (input.before) query = query.lt('created_at', input.before);
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

  /** Rule 8: a replayed dedup_key returns the first row, flagged `replayed` (nothing written). */
  async enqueue(row: TablesInsert<'messages'>): Promise<Queued> {
    if (!row.dedup_key) return this.insert(row);
    const { data: created, error } = await this.db
      .from('messages')
      .upsert(row, { onConflict: 'dedup_key', ignoreDuplicates: true })
      .select('id');
    check(error, 'message enqueue');
    const { data, error: readError } = await this.db
      .from('messages').select('*').eq('dedup_key', row.dedup_key).single();
    check(readError, 'message enqueue read');
    return { ...data, replayed: created.length === 0 };
  }

  private async insert(row: TablesInsert<'messages'>): Promise<MessageRow> {
    const { data, error } = await this.db.from('messages').insert(row).select('*').single();
    check(error, 'message enqueue');
    return data;
  }
}
