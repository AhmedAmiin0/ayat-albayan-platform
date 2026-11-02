import { onMessagingLine, type ThreadLesson, type ThreadPeople } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { BalanceQueries } from '@/modules/finance/subscriptions/money/balance.queries';
import { PackagesService } from '@/modules/finance/subscriptions/money/packages.service';
import { knownNumber, type KnownNumber } from './known-number';
import type { ThreadWindow } from '@/modules/messaging/inbox/send/send-number';
import { upcomingLessons, type LessonsOf } from './thread-lessons';
import { familyTagsOf, threadPeople, type PeopleOf } from '@/modules/messaging/inbox/people/thread-people';
import type { FamilyTag } from '@/modules/messaging/inbox/people/thread-people.mapper';
import { applySort } from '@/common/db/list-sort';
import { THREAD_SORT, threadsSource, type ThreadListFilter } from './threads.list';
import { threadSearchFilter, type ThreadRow } from './threads.mapper';
import { markUnsupported, type ListedThreadRow } from './last-unsupported';
import { isUnreadBadge, unreadThreadCount } from './threads-unread.repo';
import { check } from './store/check';

export type { ThreadListFilter } from './threads.list';

/**
 * H1–H4 (docs/12 §4): v_threads (service role only) and who a phone is. The phone's messages are
 * ThreadMessagesRepo, the read stamp ThreadReadsRepo (store/).
 */
@Injectable()
export class ThreadsRepo {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly packages: PackagesService,
    private readonly balances: BalanceQueries,
  ) {}

  /**
   * H1: one page of v_threads (of v_list_threads for a chat list «القوائم», docs/22); filters, then the
   * requested order (default newest message first). The caller marks the rows (unsupported()), in
   * parallel with its other per-page reads.
   */
  async list(f: ThreadListFilter): Promise<{ items: ThreadRow[]; total: number }> {
    // The badge asks for `total` only: an indexed count, no page (threads-unread.queries.ts).
    if (isUnreadBadge(f)) return { items: [], total: await unreadThreadCount(this.db, f) };
    let query = threadsSource(this.db, f);
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

  /** The page's rows whose last message is Meta's `unsupported` (last-unsupported.ts): one read at most. */
  unsupported(rows: readonly ThreadRow[]): Promise<ListedThreadRow[]> {
    return markUnsupported(this.db, rows);
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
    return (data ?? []).filter(onMessagingLine).map((r) => ({ // the calls number: no window (§10)
      numberId: r.number_id, line: r.line ?? 'notifications', lastInboundAt: r.last_inbound_at,
    }));
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

  /** The lesson's teacher (teacher-mode template sends); null for an unknown lesson. */
  async lessonTeacher(lessonId: string): Promise<string | null> {
    const { data, error } = await this.db.from('lessons').select('teacher_id').eq('id', lessonId).maybeSingle();
    check(error, 'lesson teacher read');
    return data?.teacher_id ?? null;
  }
}
