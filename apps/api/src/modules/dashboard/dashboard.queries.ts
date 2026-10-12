import { CURRENT_STUDENT_STATUSES } from '@ab/shared';
import type { PostgrestError } from '@supabase/supabase-js';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { readAll } from '../scheduling/read-all';
import { dbError } from '../teachers/http';
import type { Window } from './finance.queries';

const HOURS_48 = 48 * 3_600_000;

type CountResult = { count: number | null; error: PostgrestError | null };

async function counted(q: PromiseLike<CountResult>): Promise<number> {
  const { count, error } = await q;
  if (error) throw dbError(error);
  return count ?? 0;
}

/** Status counts behind the dashboard (R-RPT-01, issue F3): every number is a status, read here. */
@Injectable()
export class DashboardQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Leads created in the window: current status and source. */
  leads(w: Window) {
    return readAll((from, to) =>
      this.db
        .from('leads')
        .select('id, status, source')
        .gte('created_at', w.from.toISOString())
        .lt('created_at', w.to.toISOString())
        .order('created_at')
        .order('id')
        .range(from, to),
    );
  }

  /** Lessons starting in the window, every status. */
  lessons(w: Window) {
    return readAll((from, to) =>
      this.db
        .from('lessons')
        .select('id, status, teacher_id')
        .gte('starts_at', w.from.toISOString())
        .lt('starts_at', w.to.toISOString())
        .order('starts_at')
        .order('id')
        .range(from, to),
    );
  }

  /** «مشترك» = status active only: pending_renewal (بانتظار التجديد) is not counted (owner 2026-10-12). */
  activeStudents(): Promise<number> {
    return counted(this.db.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'));
  }

  /** «يحتاج تأكيد»: scheduled lessons starting in [now, now + 48 h). */
  needsConfirmation(now: Date): Promise<number> {
    return counted(
      this.db
        .from('lessons')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .gte('starts_at', now.toISOString())
        .lt('starts_at', new Date(now.getTime() + HOURS_48).toISOString()),
    );
  }

  unpaidSubscriptions(): Promise<number> {
    return counted(this.db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'unpaid'));
  }

  openTasks(): Promise<number> {
    return counted(this.db.from('admin_tasks').select('id', { count: 'exact', head: true }).is('done_at', null));
  }

  /** Active teachers, by name. */
  async teachers() {
    const { data, error } = await this.db
      .from('teachers')
      .select('id, display_name_ar, max_students')
      .eq('status', 'active')
      .order('display_name_ar');
    if (error) throw dbError(error);
    return data;
  }

  /** Students on a teacher's load: assigned (teacher_id) and current (trial, active, pending_renewal). */
  loadStudents() {
    return readAll((from, to) =>
      this.db
        .from('students')
        .select('id, teacher_id')
        .in('status', [...CURRENT_STUDENT_STATUSES])
        .not('teacher_id', 'is', null)
        .order('id')
        .range(from, to),
    );
  }
}
