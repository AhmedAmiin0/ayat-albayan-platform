import type { TablesInsert } from '@ab/db';
import type { ThreadLesson, ThreadPeople } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { BalanceQueries } from '../../subscriptions/money/balance.queries';
import { PackagesService } from '../../subscriptions/money/packages.service';
import { MESSAGE_SELECT, type MessageRow, type ThreadMessageRow } from '../../whatsapp/messages/message.mapper';
import { knownNumber, type KnownNumber } from './known-number';
import type { ThreadWindow } from '../send/send-number';
import { upcomingLessons, type LessonsOf } from './thread-lessons';
import { familyTagsOf, threadPeople, type PeopleOf } from '../people/thread-people';
import type { FamilyTag } from '../people/thread-people.mapper';
import { applySort } from '../../../common/list-sort';
import { THREAD_SORT, type ThreadListFilter } from './threads.list';
import { threadSearchFilter, type ThreadRow } from './threads.mapper';
import { newestPerLine, type ReadMark } from '../reads/read-marks';

export type { ThreadListFilter } from './threads.list';

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

  /**
   * H1: one page of v_threads (of v_list_threads for a chat list «القوائم», docs/22); filters, then the
   * requested order (default newest message first).
   */
  async list(f: ThreadListFilter): Promise<{ items: ThreadRow[]; total: number }> {
    let query = f.list
      ? this.db.from('v_list_threads').select('*', { count: 'exact' }).eq('list_id', f.list)
      : this.db.from('v_threads').select('*', { count: 'exact' });
    if (f.unread) query = query.gt('unread_count', 0);
    if (f.phones) query = query.in('phone_e164', [...f.phones]);
    if (f.status) query = query.eq('lead_status', f.status);
    const search = f.search ? threadSearchFilter(f.search) : null;
    if (search) query = query.or(search);
    const from = (f.page - 1) * f.pageSize;
    const { data, error, count } = await applySort(query, f, THREAD_SORT).range(from, from + f.pageSize - 1);
    check(error, 'threads read');
    return { items: data ?? [], total: count ?? 0 };
  }

  async thread(phone: string): Promise<ThreadRow | null> {
    const { data, error } = await this.db.from('v_threads').select('*').eq('phone_e164', phone).maybeSingle();
    check(error, 'thread read');
    return data;
  }

  /**
   * Module mode only (docs/23c decision 6): the phone's newest inbound per number (v_thread_numbers);
   * number_id null = unstamped history of that line, credited to the role's default by pickSend.
   */
  async numberWindows(phone: string): Promise<ThreadWindow[]> {
    const { data, error } = await this.db.from('v_thread_numbers').select('number_id, line, last_inbound_at').eq('phone_e164', phone);
    check(error, 'thread number windows read');
    return (data ?? []).map((r) => ({ numberId: r.number_id, line: r.line ?? 'notifications', lastInboundAt: r.last_inbound_at }));
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
  lessons(thread: LessonsOf, now: Date, teacherId?: string): Promise<ThreadLesson[]> {
    return upcomingLessons(this.db, { thread, now, teacherId });
  }

  /** The guardian, lead and the guardian's students with their packages (thread-people.ts). */
  people(row: PeopleOf | null): Promise<ThreadPeople> {
    return threadPeople({ db: this.db, packages: this.packages, balances: this.balances }, row);
  }

  /** A number with no message yet: who it is (known-number.ts), null when nobody. */
  known(phone: string): Promise<KnownNumber | null> {
    return knownNumber(this.db, phone);
  }

  /** The page's guardians' «مشترك» / «اشتراكه خلص» / «مش مدفوع» tags (thread-people.ts). */
  familyTags(guardianIds: readonly string[]): Promise<Map<string, FamilyTag>> {
    return familyTagsOf({ db: this.db, packages: this.packages, balances: this.balances }, guardianIds);
  }

  /** Opening the thread reads its inbound messages; returns the newest stamped wamid per line. */
  async markInboundRead(phone: string, at: Date): Promise<ReadMark[]> {
    const { data, error } = await this.db
      .from('messages')
      .update({ read_at: at.toISOString() })
      .eq('phone_e164', phone)
      .eq('direction', 'inbound')
      .is('read_at', null)
      .select('wa_message_id, created_at, line');
    check(error, 'inbound read stamp');
    return newestPerLine(data);
  }

  /** Rule 8: a replayed dedup_key returns the first row, flagged `replayed` (nothing was written). */
  async enqueue(row: TablesInsert<'messages'>): Promise<MessageRow & { replayed?: boolean }> {
    if (!row.dedup_key) {
      const { data, error } = await this.db.from('messages').insert(row).select('*').single();
      check(error, 'message enqueue');
      return data;
    }
    const { data: created, error } = await this.db
      .from('messages')
      .upsert(row, { onConflict: 'dedup_key', ignoreDuplicates: true })
      .select('id');
    check(error, 'message enqueue');
    const { data, error: readError } = await this.db.from('messages').select('*').eq('dedup_key', row.dedup_key).single();
    check(readError, 'message enqueue read');
    return { ...data, replayed: created.length === 0 };
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
