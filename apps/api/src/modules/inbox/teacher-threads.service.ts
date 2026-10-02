import type { ThreadDetail, ThreadPeople, ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { Page } from '../teachers/http';
import { MessageViews } from '../whatsapp/message.views';
import { assertPhone, type TeacherScope } from './teacher-scope';
import { forTeacher, teacherPeople } from './teacher-threads';
import { TeacherThreadsQueries } from './teacher-threads.queries';
import { toThreadView, type ThreadRow } from './threads.mapper';
import { ThreadsQueries, type ThreadListFilter } from './threads.queries';
import type { ThreadPageQuery } from './threads.service';

const NO_READS: ReadonlyMap<string, number> = new Map();

/**
 * H1/H2 in teacher mode (R-TCH-03, R-MSG-05): only the scope's threads, the teacher's own unread,
 * no lead and no money. Opening a thread never touches messages.read_at (the admin's unread) and
 * sends Meta no read receipt; it stamps teacher_thread_reads instead.
 */
@Injectable()
export class TeacherThreadsService {
  constructor(
    private readonly queries: ThreadsQueries,
    private readonly teacher: TeacherThreadsQueries,
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
    const { items, total } = await this.queries.list({ ...f, unread: false, phones });
    return { items: items.map((r) => forTeacher(toThreadView(r, now), unread)), total, page: f.page, pageSize: f.pageSize };
  }

  /** One page, oldest → newest; 403 not_your_thread outside the scope. */
  async detail(q: ThreadPageQuery, scope: TeacherScope, now = new Date()): Promise<ThreadDetail> {
    assertPhone(scope, q.phone);
    if (!q.before) await this.teacher.stampRead({ teacherId: scope.teacherId, phone: q.phone, at: now });
    const row = await this.queries.thread(q.phone);
    const [rows, people] = await Promise.all([this.queries.messages(q), this.people(row, scope)]);
    const page = rows.slice(0, q.limit).reverse();
    const thread = row ? forTeacher(toThreadView(row, now), NO_READS) : null;
    return {
      thread,
      messages: await Promise.all(page.map((m) => this.views.view(m))),
      has_more: rows.length > q.limit,
      lessons: thread && !q.before ? await this.queries.lessons(thread, now, scope.teacherId) : [],
      people,
    };
  }

  private async people(row: ThreadRow | null, scope: TeacherScope): Promise<ThreadPeople> {
    if (!row?.guardian_id) return teacherPeople({ row, students: [], mine: new Set() });
    const [students, mine] = await Promise.all([
      this.teacher.guardianStudents(row.guardian_id),
      this.teacher.myStudentIds(scope.teacherId),
    ]);
    return teacherPeople({ row, students, mine });
  }
}
