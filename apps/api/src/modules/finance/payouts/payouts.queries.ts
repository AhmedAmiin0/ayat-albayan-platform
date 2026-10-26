import type { Tables, TablesInsert, TablesUpdate } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { REPORTABLE_STATUSES } from '../../reporting/reports/history/report-history.queries';
import { dbError } from '../../../common/http/http';
import type { PayoutLesson, PayoutTeacher } from './payouts.plan';

export type PayoutRow = Tables<'teacher_payouts'> & {
  teacher: { id: string; display_name_ar: string; tz: string } | null;
};
export type LessonWindow = { teacherId: string; from: string; to: string };

const SELECT = '*, teacher:teachers(id, display_name_ar, display_name_en, tz)';
const byTeacherName = (a: PayoutRow, b: PayoutRow) =>
  (a.teacher?.display_name_ar ?? '').localeCompare(b.teacher?.display_name_ar ?? '', 'ar') || a.id.localeCompare(b.id);

/** All supabase access for `teacher_payouts` (service role; the controllers guard). R-PAY-02. */
@Injectable()
export class PayoutsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every teacher, whatever the status: one who left mid-month is still paid for that month. */
  async teachers(): Promise<(PayoutTeacher & { display_name_ar: string })[]> {
    const { data, error } = await this.db.from('teachers').select('id, tz, display_name_ar');
    if (error) throw dbError(error);
    return data;
  }

  /** The ONE pay rule (v_teacher_payable_lessons, migration 20261005000200), with ledger amounts. */
  async lessons(w: LessonWindow): Promise<PayoutLesson[]> {
    const { data, error } = await this.db
      .from('v_teacher_payable_lessons')
      .select('lesson_id, minutes, amount, status')
      .eq('teacher_id', w.teacherId)
      .gte('starts_at', w.from)
      .lt('starts_at', w.to)
      .order('starts_at')
      .order('lesson_id');
    if (error) throw dbError(error);
    return data.map((r) => ({ id: r.lesson_id, minutes: r.minutes, amount: r.amount, status: r.status }));
  }

  /**
   * (lesson, student) pairs of the teacher's reportable lessons in the window still missing a
   * submitted report (docs/11 R11's anti-join: the embed keeps submitted reports, `is.null` the rest).
   */
  async pendingReports(w: LessonWindow): Promise<number> {
    const { count, error } = await this.db
      .from('lesson_students')
      .select('lesson_id, lesson:lessons!inner(teacher_id, starts_at, status), lesson_reports(id)', {
        count: 'exact',
        head: true,
      })
      .eq('lesson.teacher_id', w.teacherId)
      .gte('lesson.starts_at', w.from)
      .lt('lesson.starts_at', w.to)
      .in('lesson.status', [...REPORTABLE_STATUSES])
      .eq('lesson_reports.status', 'submitted')
      .is('lesson_reports', null);
    if (error) throw dbError(error);
    return count ?? 0;
  }

  /** The teacher's lessons in the window whose time was edited after `since` (the draft's last calculation). */
  async editedSince(w: LessonWindow & { since: string }): Promise<number> {
    const { count, error } = await this.db
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', w.teacherId)
      .gte('starts_at', w.from)
      .lt('starts_at', w.to)
      .gt('time_edited_at', w.since);
    if (error) throw dbError(error);
    return count ?? 0;
  }

  /** A month's rows by teacher name; `month` is the first day (YYYY-MM-01). */
  async forMonth(month: string): Promise<PayoutRow[]> {
    const { data, error } = await this.db.from('teacher_payouts').select(SELECT).eq('month', month);
    if (error) throw dbError(error);
    return data.sort(byTeacherName);
  }

  /** A teacher's own rows, newest month first (Y5); a draft is still the admin's to change, so hidden. */
  async forTeacher(teacherId: string, month?: string): Promise<PayoutRow[]> {
    let q = this.db.from('teacher_payouts').select(SELECT).eq('teacher_id', teacherId).neq('status', 'draft');
    if (month) q = q.eq('month', month);
    const { data, error } = await q.order('month', { ascending: false });
    if (error) throw dbError(error);
    return data;
  }

  async get(id: string): Promise<PayoutRow | null> {
    const { data, error } = await this.db.from('teacher_payouts').select(SELECT).eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  async insert(row: TablesInsert<'teacher_payouts'>): Promise<PayoutRow> {
    const { data, error } = await this.db.from('teacher_payouts').insert(row).select(SELECT).single();
    if (error) throw dbError(error);
    return data;
  }

  /**
   * Writes only while the row is still in `from` status (compare-and-set): a concurrent approve
   * never gets overwritten by a regenerate. null when the row moved on.
   */
  async update(id: string, patch: TablesUpdate<'teacher_payouts'> & { from: Tables<'teacher_payouts'>['status'] }) {
    const { from, ...write } = patch;
    const { data, error } = await this.db
      .from('teacher_payouts')
      .update(write)
      .eq('id', id)
      .eq('status', from)
      .select(SELECT)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** Deletes a draft only (approved and paid rows are frozen). */
  async removeDraft(id: string): Promise<void> {
    const { error } = await this.db.from('teacher_payouts').delete().eq('id', id).eq('status', 'draft');
    if (error) throw dbError(error);
  }
}
