import { CURRENT_STUDENT_STATUSES } from '@ab/shared';
import type { PostgrestError } from '@supabase/supabase-js';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { OwnNumbers } from '@/modules/messaging/numbers';
import { readAll } from '@/common/db/read-all';
import { dbError } from '@/common/http/http';
import type { Window } from './finance/finance.queries';

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
  constructor(
    @Inject(DB) private readonly db: Db,
    /** The academy's own numbers: their lead is never counted (owner 2026-10-27). */
    @Optional() private readonly own?: OwnNumbers,
  ) {}

  /** Leads created in the window: current status and source; never our own numbers' lead. */
  async leads(w: Window) {
    const own = this.own ? await this.own.notIn() : null;
    return readAll((from, to) => {
      let query = this.db.from('leads').select('id, status, source').gte('created_at', w.from.toISOString()).lt('created_at', w.to.toISOString());
      if (own) query = query.not('phone_e164', 'in', own);
      return query.order('created_at').order('id').range(from, to);
    });
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

  /** «مشترك» = status active only: pending_renewal / expired are not counted (owner 2026-10-12, 2026-10-15). */
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

  /** Students on a teacher's load: assigned (teacher_id) and current (CURRENT_STUDENT_STATUSES, owner 2026-10-15). */
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
