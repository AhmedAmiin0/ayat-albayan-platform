import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';

/**
 * Who may touch which report (rule 9; the API is the only writer, migration 120): an admin any
 * report, a teacher only the lessons / reports whose teacher_id is their own teachers row.
 */
@Injectable()
export class ReportAccess {
  constructor(private readonly teachers: TeachersRepo) {}

  /** teachers.id of a signed-in teacher; 404 teacher_not_linked when no row has their profile. */
  async teacherId(user: AuthUser): Promise<string> {
    const id = await this.teachers.idByProfile(user.id);
    if (!id) throw notFound('teacher_not_linked');
    return id;
  }

  /** 403 unless admin, or the teacher of this lesson / report. */
  async assertTeacherOf(user: AuthUser, row: { teacher_id: string }): Promise<void> {
    if (user.role === 'admin') return;
    if (user.role === 'teacher' && (await this.teachers.idByProfile(user.id)) === row.teacher_id) return;
    throw new ForbiddenException();
  }
}
