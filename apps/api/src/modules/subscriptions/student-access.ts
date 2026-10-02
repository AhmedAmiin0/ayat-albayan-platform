import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { DB, type Db } from '../../common/db/db.module';
import { notFound } from '../scheduling/errors';
import { dbError } from '../teachers/http';
import { TeachersQueries } from '../teachers/teachers.queries';

/**
 * S6 guard (rule 9): admin sees every student; a teacher only a student assigned to them
 * (students.teacher_id) or one they have a lesson with. 404 for an unknown student, 403 otherwise.
 */
@Injectable()
export class StudentAccess {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly teachers: TeachersQueries,
  ) {}

  async check(user: AuthUser, studentId: string): Promise<void> {
    const { data: student, error } = await this.db
      .from('students')
      .select('id, teacher_id')
      .eq('id', studentId)
      .maybeSingle();
    if (error) throw dbError(error);
    if (!student) throw notFound('student_not_found');
    if (user.role === 'admin') return;
    const teacherId = user.role === 'teacher' ? await this.teachers.idByProfile(user.id) : null;
    if (teacherId === null) throw new ForbiddenException();
    if (student.teacher_id === teacherId || (await this.taughtBy(studentId, teacherId))) return;
    throw new ForbiddenException();
  }

  private async taughtBy(studentId: string, teacherId: string): Promise<boolean> {
    const { count, error } = await this.db
      .from('lesson_students')
      .select('lesson_id, lessons!inner(teacher_id)', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('lessons.teacher_id', teacherId);
    if (error) throw dbError(error);
    return (count ?? 0) > 0;
  }
}
