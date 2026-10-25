import type { Tables } from '@ab/db';
import type { AdminTaskView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError, type Page, type PageQuery } from '../../../common/http/http';
import { studentRef } from '../subscriptions.mapper';
import type { StudentRef } from '../subscriptions.queries';

type TaskRow = Tables<'admin_tasks'>;

export function toTaskView(row: TaskRow, students: ReadonlyMap<string, StudentRef>): AdminTaskView {
  const student = row.subject_type === 'subscription' ? students.get(row.subject_id) : undefined;
  return {
    id: row.id,
    kind: row.kind,
    subject_type: row.subject_type,
    subject_id: row.subject_id,
    student: student ? studentRef(student, student.id) : null,
    title: row.title,
    due_at: row.due_at,
    done_at: row.done_at,
    created_at: row.created_at,
  };
}

/** admin_tasks raised by the alerts (S7, S8). Admin only. */
@Injectable()
export class AdminTasksQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(q: PageQuery & { open: boolean }): Promise<Page<AdminTaskView>> {
    const from = (q.page - 1) * q.pageSize;
    let query = this.db.from('admin_tasks').select('*', { count: 'exact' });
    query = q.open ? query.is('done_at', null) : query.not('done_at', 'is', null);
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + q.pageSize - 1);
    if (error) throw dbError(error);
    const students = await this.studentsOf(data);
    return { items: data.map((r) => toTaskView(r, students)), total: count ?? 0, page: q.page, pageSize: q.pageSize };
  }

  /** null when no task has this id. Marking a done task again keeps the first done_at. */
  async done(id: string, actorId: string): Promise<AdminTaskView | null> {
    const { data: row, error } = await this.db.from('admin_tasks').select('*').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    if (!row) return null;
    let done = row;
    if (row.done_at === null) {
      const res = await this.db
        .from('admin_tasks')
        .update({ done_at: new Date().toISOString(), done_by: actorId })
        .eq('id', id)
        .select('*')
        .single();
      if (res.error) throw dbError(res.error);
      done = res.data;
    }
    return toTaskView(done, await this.studentsOf([done]));
  }

  /** subscription id → its student, for the task wording «باقة {student} …». */
  private async studentsOf(rows: readonly TaskRow[]): Promise<Map<string, StudentRef>> {
    const ids = rows.filter((r) => r.subject_type === 'subscription').map((r) => r.subject_id);
    if (ids.length === 0) return new Map();
    const { data, error } = await this.db
      .from('subscriptions')
      .select('id, student:students(id, code, name)')
      .in('id', ids);
    if (error) throw dbError(error);
    return new Map(data.flatMap((s) => (s.student ? [[s.id, s.student] as const] : [])));
  }
}
