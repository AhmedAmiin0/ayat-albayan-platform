import type { Program, StudentStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { dbError } from '../../common/http/http';

/** The only student columns a teacher gets: no phone, guardian or money (R-TCH-03). */
export type TeacherStudentRow = {
  id: string;
  code: string | null;
  name: string;
  status: StudentStatus;
  program: Program;
  level: string | null;
  age: number | null;
};
export type TeacherLessonRow = {
  starts_at: string;
  status: string;
  lesson_students: { student_id: string }[];
};

const COLUMNS = 'id, code, name, status, program, level, age' as const;

/** GET /teachers/me/students reads. Service role: the service scopes by teachers.id (rule 9). */
@Injectable()
export class TeacherStudentsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Students whose teacher_id is mine and whose status is one of `statuses`. */
  async assigned(input: { teacherId: string; statuses: readonly StudentStatus[] }): Promise<TeacherStudentRow[]> {
    const { data, error } = await this.db
      .from('students')
      .select(COLUMNS)
      .eq('teacher_id', input.teacherId)
      .in('status', [...input.statuses]);
    if (error) throw dbError(error);
    return data;
  }

  /** My lessons (any status) starting at or after `since`, with their student ids. */
  async lessons(input: { teacherId: string; since: string }): Promise<TeacherLessonRow[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select('starts_at, status, lesson_students(student_id)')
      .eq('teacher_id', input.teacherId)
      .gte('starts_at', input.since)
      .order('starts_at');
    if (error) throw dbError(error);
    return data;
  }

  /** Students by id, filtered to `statuses` (so paused / churned never come back). */
  async byIds(input: { ids: readonly string[]; statuses: readonly StudentStatus[] }): Promise<TeacherStudentRow[]> {
    if (input.ids.length === 0) return [];
    const { data, error } = await this.db
      .from('students')
      .select(COLUMNS)
      .in('id', [...input.ids])
      .in('status', [...input.statuses]);
    if (error) throw dbError(error);
    return data;
  }
}
