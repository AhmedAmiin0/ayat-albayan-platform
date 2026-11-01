import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { DB, type Db } from '@/common/db/db.module';
import { notFound } from '@/common/http/errors';
import { dbError } from '@/common/http/http';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';

/**
 * S6 guard (rule 9): admin sees every student; a teacher only a student in their scope
 * (teacher_has_student: assigned, or a lesson of theirs in the last 90 days). 404 for an unknown student, 403 otherwise.
 */
@Injectable()
export class StudentAccess {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly teachers: TeachersRepo,
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

  /** teacher_has_student: assigned, or a lesson of theirs in the last 90 days (migration 165). */
  private async taughtBy(studentId: string, teacherId: string): Promise<boolean> {
    const { data, error } = await this.db.rpc('teacher_has_student', { p_teacher_id: teacherId, p_student_id: studentId });
    if (error) throw dbError(error);
    return data === true;
  }
}
