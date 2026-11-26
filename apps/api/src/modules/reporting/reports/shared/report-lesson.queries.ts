import { memoryOf, type MemoryView } from '@ab/shared';
import type { BalanceView } from '@ab/money';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError } from '@/common/db/errors';
import { storedContent } from '@/modules/reporting/reports/v2/report-v2.mapper';

/** Enough submitted v2 reports per student to find each track's last range. */
const MEMORY_DEPTH = 30;

// One read per student, bounded by a head count or a limit: PostgREST cannot count or limit per
// group in one call, and a grouped RPC needs a migration (a lane after B). A lesson has a few
// students, so the reads stay few and small; a batched read of each student's whole history
// would grow with it.

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
    const counts = await Promise.all(missing.map((id) => this.earlierCount(id, lesson.starts_at)));
    missing.forEach((id, i) => out.set(id, (counts[i] ?? 0) + 1));
    return out;
  }

  /** Completed lessons of one student before `startsAt`, as a head count (no rows read). */
  private async earlierCount(studentId: string, startsAt: string): Promise<number> {
    const { count, error } = await this.db
      .from('v_lesson_sequence')
      .select('lesson_id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .lt('starts_at', startsAt);
    if (error) throw pgError(error);
    return count ?? 0;
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
    const depth = MEMORY_DEPTH + exclude.length;
    const views = await Promise.all(
      studentIds.map(async (id) => {
        const rows = (await this.history(id, depth)).filter((r) => !exclude.includes(r.id));
        return [id, memoryOf(rows.flatMap((r) => storedContent(r) ?? []))] as const;
      }),
    );
    return new Map(views);
  }

  /** One student's newest submitted v2 reports, at most `depth`. */
  private async history(studentId: string, depth: number) {
    const { data, error } = await this.db
      .from('lesson_reports')
      .select('id, student_id, form_version, content')
      .eq('student_id', studentId)
      .eq('form_version', 2)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .order('id')
      .limit(depth);
    if (error) throw pgError(error);
    return data;
  }
}
