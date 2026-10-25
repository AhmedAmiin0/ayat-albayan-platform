import { OPEN_LESSON_STATUSES, type CourseLessonFact } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { readAll } from '../../scheduling/read-all';
import { generatedKey } from '../../scheduling/rule-projection';
import type { OpenCourseLesson } from './course-change.queries';

export type MovedLesson = OpenCourseLesson & { rule_id: string | null };

/** The lessons of a course «تغيير أيام الحلقات» reads (service role; ownership is checked by CourseChange). */
@Injectable()
export class CourseLessonQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every lesson of these rules of the student, any time and status: what the course uses (with ids). */
  async ofCourse(input: { ruleIds: readonly string[]; studentId: string }): Promise<(CourseLessonFact & { id: string })[]> {
    const rows = await readAll((from, to) =>
      this.db
        .from('lessons')
        .select('id, status, instant, makeup_of_id, lesson_students!inner(student_id, chargeable)')
        .in('rule_id', [...input.ruleIds])
        .eq('lesson_students.student_id', input.studentId)
        .order('starts_at')
        .order('id')
        .range(from, to),
    );
    return rows.map((l) => ({
      id: l.id,
      status: l.status,
      chargeable: l.lesson_students.some((s) => s.chargeable),
      makeup: l.makeup_of_id !== null,
      instant: l.instant,
    }));
  }

  /** The open lessons of these rules from `cutoff` on: they move (rescheduled, chargeable false). */
  async openFrom(ruleIds: readonly string[], cutoff: Date): Promise<MovedLesson[]> {
    return readAll((from, to) =>
      this.db
        .from('lessons')
        .select('id, status, rule_id')
        .in('rule_id', [...ruleIds])
        .in('status', [...OPEN_LESSON_STATUSES])
        .gte('starts_at', cutoff.toISOString())
        .order('starts_at')
        .order('id')
        .range(from, to),
    );
  }

  /**
   * `${rule_id}:${local_date}` of every generated row of these rules (any status), as the generator and
   * RuleProjectionQueries key them: a date a rule already holds is never generated again.
   */
  async held(ruleIds: readonly string[]): Promise<Set<string>> {
    const rows = await readAll((from, to) =>
      this.db
        .from('lessons')
        .select('id, rule_id, local_date')
        .in('rule_id', [...ruleIds])
        .is('rescheduled_from_id', null)
        .order('id')
        .range(from, to),
    );
    return new Set(rows.flatMap((r) => (r.rule_id && r.local_date ? [generatedKey(r.rule_id, r.local_date)] : [])));
  }
}
