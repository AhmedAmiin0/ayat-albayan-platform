import { memoryOf, type MemoryView } from '@ab/shared';
import type { BalanceView } from '@ab/money';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';
import { readChunkedAll } from '@/common/db/read-all';
import { storedContent } from '@/modules/reporting/reports/v2/report-v2.mapper';

/** Enough submitted v2 reports per student to find each track's last range. */
const MEMORY_DEPTH = 30;

/** Lesson numbers, package balances and the v2 memorization history shown on the report form (R-REP-01, R-LES-03, R-SUB-03). */
@Injectable()
export class ReportLessonQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Issue A5: v_lesson_sequence.seq once completed, else completed lessons before plus one. */
  async lessonNumbers(
    lesson: { id: string; starts_at: string },
    studentIds: readonly string[],
  ): Promise<Map<string, number>> {
    const { data, error } = await this.db
      .from('v_lesson_sequence')
      .select('student_id, seq')
      .eq('lesson_id', lesson.id);
    if (error) throw pgError(error);
    const out = new Map<string, number>();
    for (const r of data) if (r.student_id && r.seq !== null) out.set(r.student_id, r.seq);
    const missing = studentIds.filter((s) => !out.has(s));
    const before = await readChunkedAll(missing, (chunk, from, to) =>
      this.db
        .from('v_lesson_sequence')
        .select('student_id')
        .in('student_id', chunk)
        .lt('starts_at', lesson.starts_at)
        .order('student_id')
        .order('lesson_id')
        .range(from, to),
    );
    for (const id of missing) out.set(id, 1 + before.filter((r) => r.student_id === id).length);
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
    if (error) throw pgError(error);
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

  /**
   * The teacher's memorization history (v2 form): per student, the last range of each track in
   * their newest submitted v2 reports. v1 reports are never read; `exclude` leaves out the
   * reports on this form (an edit must not suggest after its own range).
   */
  async memory(
    studentIds: readonly string[],
    exclude: readonly string[],
  ): Promise<Map<string, MemoryView>> {
    const rows = await readChunkedAll(studentIds, (chunk, from, to) =>
      this.db
        .from('lesson_reports')
        .select('id, student_id, form_version, content')
        .in('student_id', chunk)
        .eq('form_version', 2)
        .eq('status', 'submitted')
        .order('student_id')
        .order('submitted_at', { ascending: false })
        .order('id')
        .range(from, to),
    );
    // The depth is counted per student, so one student's history never crowds out another's.
    const depth = MEMORY_DEPTH + exclude.length;
    const historyOf = (id: string) =>
      rows
        .filter((r) => r.student_id === id)
        .slice(0, depth)
        .filter((r) => !exclude.includes(r.id));
    const views = studentIds.map(
      (id) => [id, memoryOf(historyOf(id).flatMap((r) => storedContent(r) ?? []))] as const,
    );
    return new Map(views);
  }
}
