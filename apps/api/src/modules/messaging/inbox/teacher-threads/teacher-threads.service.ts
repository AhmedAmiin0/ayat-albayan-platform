import type { ThreadDetail, ThreadPeople, ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { Page } from '@/common/http/http';
import { MessageViews } from '@/modules/messaging/whatsapp/messages/message.views';
import { assertPhone, type TeacherScope } from './teacher-scope';
import { forTeacher, teacherPeople } from './teacher-threads';
import { TeacherThreadsRepo } from './teacher-threads.repo';
import { toThreadView, type ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';
import { teacherListFilter } from '@/modules/messaging/inbox/threads/threads.list';
import { ThreadsRepo, type ThreadListFilter } from '@/modules/messaging/inbox/threads/threads.repo';
import type { ThreadPageQuery } from '@/modules/messaging/inbox/threads/threads.service';

const NO_READS: ReadonlyMap<string, number> = new Map();
const NO_ONE: ThreadPeople = { guardian: null, lead: null, students: [] };

/**
 * H1/H2 in teacher mode (R-TCH-03, R-MSG-05): only the scope's threads, the teacher's own unread,
 * no lead and no money. Opening a thread never touches messages.read_at (the admin's unread) and
 * sends Meta no read receipt; it stamps teacher_thread_reads instead.
 */
@Injectable()
export class TeacherThreadsService {
  constructor(
    private readonly queries: ThreadsRepo,
    private readonly teacher: TeacherThreadsRepo,
    private readonly views: MessageViews,
  ) {}

  async list(f: ThreadListFilter, scope: TeacherScope, now = new Date()): Promise<Page<ThreadView>> {
    const empty = { items: [], total: 0, page: f.page, pageSize: f.pageSize };
    const all = [...scope.phones];
    if (all.length === 0) return empty; // .in() with no phones is a PostgREST error
    const unread = await this.teacher.unread(scope.teacherId, all);
    const phones = f.unread ? all.filter((p) => (unread.get(p) ?? 0) > 0) : all;
    if (phones.length === 0) return empty;
    // ponytail: the scope goes in the URL (.in); a teacher has tens of families, fine until hundreds.
    const { items: rows, total } = await this.queries.list(teacherListFilter(f, phones));
    const items = await this.queries.unsupported(rows);
    return { items: items.map((r) => forTeacher(toThreadView(r, now), unread)), total, page: f.page, pageSize: f.pageSize };
  }

  /** One page, oldest → newest; 403 not_your_thread outside the scope. */
  /** One page, oldest → newest; the first page also carries people and lessons (as the admin's). */
  async detail(q: ThreadPageQuery, scope: TeacherScope, now = new Date()): Promise<ThreadDetail> {
    assertPhone(scope, q.phone);
    const first = !q.before;
    if (first) await this.teacher.stampRead({ teacherId: scope.teacherId, phone: q.phone, at: now });
    const [row, rows] = await Promise.all([this.queries.thread(q.phone), this.queries.messages(q)]);
    const thread = row ? forTeacher(toThreadView(row, now), NO_READS) : null;
    const [people, messages, lessons] = await Promise.all([
      first ? this.people(row, scope) : NO_ONE,
      Promise.all(rows.slice(0, q.limit).reverse().map((m) => this.views.view(m))),
      thread && first ? this.queries.lessons(thread, now, scope.teacherId) : [],
    ]);
    return { thread, messages, has_more: rows.length > q.limit, lessons, people };
  }

  private async people(row: ThreadRow | null, scope: TeacherScope): Promise<ThreadPeople> {
    if (!row?.guardian_id) return NO_ONE;
    const [students, mine] = await Promise.all([
      this.teacher.guardianStudents(row.guardian_id),
      this.teacher.myStudentIds(scope.teacherId),
    ]);
    return teacherPeople({ row, students, mine });
  }
}
