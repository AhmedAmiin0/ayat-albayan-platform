import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../teachers/http';
import { trialStudentsOf, type TrialLessonRow } from './student-trial.plan';

const RULE = 'rule:schedule_rules!lessons_rule_id_fkey(package)';

/** The reads of the trial transitions (owner 2026-10-15, docs/11 §7): which students, and their trial lessons. */
@Injectable()
export class StudentTrialQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The students of these lessons whose rule is a trial (package 'trial'), each once. */
  async studentsOfTrialLessons(lessonIds: readonly string[]): Promise<string[]> {
    if (lessonIds.length === 0) return [];
    const { data, error } = await this.db
      .from('lessons')
      .select(`id, ${RULE}, lesson_students(student_id)`)
      .in('id', [...lessonIds]);
    if (error) throw dbError(error);
    return trialStudentsOf(data ?? []);
  }

  /** Every lesson row of these students with its status and rule package (trialFactsOf keeps the trials). */
  async lessonsOf(studentIds: readonly string[]): Promise<TrialLessonRow[]> {
    if (studentIds.length === 0) return [];
    const { data, error } = await this.db
      .from('lesson_students')
      .select(`student_id, attendance, lesson:lessons!inner(status, ${RULE})`)
      .in('student_id', [...studentIds]);
    if (error) throw dbError(error);
    return data ?? [];
  }
}
