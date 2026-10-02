import type { TablesInsert } from '@ab/db';
import type { ThreadLesson, ThreadView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { MessageRow, ThreadMessageRow } from '../whatsapp/message.mapper';
import { upcomingLessons } from './thread-lessons';
import { threadSearchFilter, type ThreadRow } from './threads.mapper';

export interface ThreadListFilter {
  page: number;
  pageSize: number;
  search?: string;
  unread?: boolean;
}

function check(error: { message: string } | null, what: string): asserts error is null {
  if (error) throw new Error(`${what} failed: ${error.message}`);
}

/** H1–H4 (docs/12 §4): v_threads (service role only) and the messages of one phone. */
@Injectable()
export class ThreadsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(f: ThreadListFilter): Promise<{ items: ThreadRow[]; total: number }> {
    let query = this.db.from('v_threads').select('*', { count: 'exact' });
    if (f.unread) query = query.gt('unread_count', 0);
    const search = f.search ? threadSearchFilter(f.search) : null;
    if (search) query = query.or(search);
    const from = (f.page - 1) * f.pageSize;
    const { data, error, count } = await query
      .order('last_message_at', { ascending: false })
      .range(from, from + f.pageSize - 1);
    check(error, 'threads read');
    return { items: data ?? [], total: count ?? 0 };
  }

  async thread(phone: string): Promise<ThreadRow | null> {
    const { data, error } = await this.db.from('v_threads').select('*').eq('phone_e164', phone).maybeSingle();
    check(error, 'thread read');
    return data;
  }

  /** Newest first, `limit + 1` rows so the caller knows whether older ones exist; each with its lesson. */
  async messages(input: { phone: string; before?: string; limit: number }): Promise<ThreadMessageRow[]> {
    let query = this.db.from('messages').select('*, lesson:lessons(starts_at, status)').eq('phone_e164', input.phone);
    if (input.before) query = query.lt('created_at', input.before);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(input.limit + 1);
    check(error, 'thread messages read');
    return data ?? [];
  }

  /** The guardian's / teacher's next open lessons (thread-lessons.ts). */
  lessons(thread: ThreadView, now: Date): Promise<ThreadLesson[]> {
    return upcomingLessons(this.db, { thread, now });
  }

  /** Opening the thread reads its inbound messages; returns the newest stamped wamid. */
  async markInboundRead(phone: string, at: Date): Promise<string | null> {
    const { data, error } = await this.db
      .from('messages')
      .update({ read_at: at.toISOString() })
      .eq('phone_e164', phone)
      .eq('direction', 'inbound')
      .is('read_at', null)
      .select('wa_message_id, created_at');
    check(error, 'inbound read stamp');
    const newest = [...(data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return newest?.wa_message_id ?? null;
  }

  /** Rule 8: a replayed dedup_key (admin:{clientRequestId}) returns the first row. */
  async enqueue(row: TablesInsert<'messages'>): Promise<MessageRow> {
    if (!row.dedup_key) {
      const { data, error } = await this.db.from('messages').insert(row).select('*').single();
      check(error, 'message enqueue');
      return data;
    }
    const { error } = await this.db.from('messages').upsert(row, { onConflict: 'dedup_key', ignoreDuplicates: true });
    check(error, 'message enqueue');
    const { data, error: readError } = await this.db.from('messages').select('*').eq('dedup_key', row.dedup_key).single();
    check(readError, 'message enqueue read');
    return data;
  }

  async get(id: string): Promise<MessageRow | null> {
    const { data, error } = await this.db.from('messages').select('*').eq('id', id).maybeSingle();
    check(error, 'message read');
    return data;
  }
}
