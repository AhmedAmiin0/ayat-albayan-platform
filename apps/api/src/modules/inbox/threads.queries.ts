import type { TablesInsert } from '@ab/db';
import type { ThreadLesson, ThreadPeople, ThreadView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { BalanceQueries } from '../subscriptions/balance.queries';
import { PackagesService } from '../subscriptions/packages.service';
import { MESSAGE_SELECT, type MessageRow, type ThreadMessageRow } from '../whatsapp/message.mapper';
import { upcomingLessons } from './thread-lessons';
import { familyTagsOf, threadPeople } from './thread-people';
import type { FamilyTag } from './thread-people.mapper';
import { threadSearchFilter, type ThreadRow } from './threads.mapper';

export interface ThreadListFilter {
  page: number;
  pageSize: number;
  search?: string;
  unread?: boolean;
  /** Teacher mode: only these phones (never empty — the caller answers an empty page itself). */
  phones?: readonly string[];
}

function check(error: { message: string } | null, what: string): asserts error is null {
  if (error) throw new Error(`${what} failed: ${error.message}`);
}

/** H1–H4 (docs/12 §4): v_threads (service role only) and the messages of one phone. */
@Injectable()
export class ThreadsQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly packages: PackagesService,
    private readonly balances: BalanceQueries,
  ) {}

  async list(f: ThreadListFilter): Promise<{ items: ThreadRow[]; total: number }> {
    let query = this.db.from('v_threads').select('*', { count: 'exact' });
    if (f.unread) query = query.gt('unread_count', 0);
    if (f.phones) query = query.in('phone_e164', [...f.phones]);
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
    let query = this.db.from('messages').select(`${MESSAGE_SELECT}, lesson:lessons(starts_at, status)` as const).eq('phone_e164', input.phone);
    if (input.before) query = query.lt('created_at', input.before);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(input.limit + 1);
    check(error, 'thread messages read');
    return data ?? [];
  }

  /** The guardian's / teacher's next open lessons (thread-lessons.ts); with `teacherId` only theirs. */
  lessons(thread: ThreadView, now: Date, teacherId?: string): Promise<ThreadLesson[]> {
    return upcomingLessons(this.db, { thread, now, teacherId });
  }

  /** The guardian, lead and the guardian's students with their packages (thread-people.ts). */
  people(row: ThreadRow | null): Promise<ThreadPeople> {
    return threadPeople({ db: this.db, packages: this.packages, balances: this.balances }, row);
  }

  /** The page's guardians' «مشترك» / «اشتراكه خلص» / «مش مدفوع» tags (thread-people.ts). */
  familyTags(guardianIds: readonly string[]): Promise<Map<string, FamilyTag>> {
    return familyTagsOf({ db: this.db, packages: this.packages, balances: this.balances }, guardianIds);
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

  async get(id: string): Promise<ThreadMessageRow | null> {
    const { data, error } = await this.db.from('messages').select(MESSAGE_SELECT).eq('id', id).maybeSingle();
    check(error, 'message read');
    return data;
  }

  /** The lesson's teacher (teacher-mode template sends); null for an unknown lesson. */
  async lessonTeacher(lessonId: string): Promise<string | null> {
    const { data, error } = await this.db.from('lessons').select('teacher_id').eq('id', lessonId).maybeSingle();
    check(error, 'lesson teacher read');
    return data?.teacher_id ?? null;
  }
}
