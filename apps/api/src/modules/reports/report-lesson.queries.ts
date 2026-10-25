import type { BalanceView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../../common/http/http';

/** Lesson numbers and package balances shown on the report form (R-REP-01, R-LES-03, R-SUB-03). */
@Injectable()
export class ReportLessonQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * «رقم الحلقة» per student (issue A5): v_lesson_sequence.seq once this lesson is completed,
   * else the student's completed lessons before it + 1.
   * TODO(R-LES-03): v_lesson_sequence counts `completed` only; owner to confirm whether `late` counts.
   */
  async lessonNumbers(lesson: { id: string; starts_at: string }, studentIds: readonly string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    const { data, error } = await this.db
      .from('v_lesson_sequence')
      .select('student_id, seq')
      .eq('lesson_id', lesson.id);
    if (error) throw dbError(error);
    for (const r of data) if (r.student_id && r.seq !== null) out.set(r.student_id, r.seq);
    for (const id of studentIds.filter((s) => !out.has(s))) {
      const { count, error: e } = await this.db
        .from('v_lesson_sequence')
        .select('lesson_id', { count: 'exact', head: true })
        .eq('student_id', id)
        .lt('starts_at', lesson.starts_at);
      if (e) throw dbError(e);
      out.set(id, (count ?? 0) + 1);
    }
    return out;
  }

  /** Each student's newest package (v_subscription_balance, is_last); absent without one. */
  async packages(studentIds: readonly string[]): Promise<Map<string, BalanceView>> {
    const out = new Map<string, BalanceView>();
    if (studentIds.length === 0) return out;
    const { data, error } = await this.db
      .from('v_subscription_balance')
      .select('subscription_id, student_id, lessons_total, lessons_used, remaining, ended_at, projected_end_at')
      .in('student_id', [...studentIds])
      .eq('is_last', true);
    if (error) throw dbError(error);
    for (const r of data) {
      if (!r.student_id || !r.subscription_id) continue;
      out.set(r.student_id, {
        subscription_id: r.subscription_id,
        lessons_total: r.lessons_total ?? 0,
        lessons_used: r.lessons_used ?? 0,
        remaining: r.remaining ?? 0,
        ended_at: r.ended_at,
        projected_end_at: r.projected_end_at,
      });
    }
    return out;
  }
}
