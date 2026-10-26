import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { readChunked } from '../../../teaching/scheduling/read-all';
import { trialStudentsOf, type ChangedLessonRow, type TrialLessonRow } from './student-trial.plan';

const RULE = 'rule:schedule_rules!lessons_rule_id_fkey(package)';
const LESSON = `rule_id, instant, makeup_of_id, ${RULE}`;
const ROW = `student_id, attendance, chargeable, lesson:lessons!inner(status, ${LESSON})`;
/** The same row, only lessons whose rule is a platform trial (inner joins down to the rule). */
const PLATFORM_ROW = `student_id, attendance, chargeable, lesson:lessons!inner(status, rule_id, instant, makeup_of_id, rule:schedule_rules!lessons_rule_id_fkey!inner(package))`;

/** The reads of the trial transitions (owner 2026-10-15, docs/11 §7): which students, and their trial lessons. */
@Injectable()
export class StudentTrialQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The students of these lessons on a trial lesson (platform or imported, isTrialLesson), each once. */
  async studentsOfTrialLessons(lessonIds: readonly string[]): Promise<string[]> {
    const rows = await readChunked<ChangedLessonRow>(lessonIds, (chunk) =>
      this.db.from('lessons').select(`id, ${LESSON}, lesson_students(student_id, chargeable)`).in('id', chunk),
    );
    return trialStudentsOf(rows);
  }

  /**
   * The trial lesson rows of these students: a platform trial (rule package 'trial') or an imported
   * one (no rule, not instant, not a makeup, not chargeable); trialFactsOf re-checks the predicate.
   */
  async lessonsOf(studentIds: readonly string[]): Promise<TrialLessonRow[]> {
    const platform = await readChunked<TrialLessonRow>(studentIds, (chunk) =>
      this.db
        .from('lesson_students')
        .select(PLATFORM_ROW)
        .in('student_id', chunk)
        .eq('lesson.rule.package', 'trial'),
    );
    const imported = await readChunked<TrialLessonRow>(studentIds, (chunk) =>
      this.db
        .from('lesson_students')
        .select(ROW)
        .in('student_id', chunk)
        .eq('chargeable', false)
        .is('lesson.rule_id', null)
        .eq('lesson.instant', false)
        .is('lesson.makeup_of_id', null),
    );
    return [...platform, ...imported];
  }
}
