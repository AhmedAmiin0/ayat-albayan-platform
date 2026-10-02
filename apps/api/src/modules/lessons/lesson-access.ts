import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { TeachersQueries } from '../teachers/teachers.queries';

/**
 * Who may touch which lesson (rule 9). The DB client is the service role and bypasses RLS, so
 * this mirrors lessons_teacher_update / my_teacher_id(): admin any lesson, a teacher only lessons
 * whose teacher_id is their own teachers row (OwnTeacherGuard does the same for /teachers/:id).
 */
@Injectable()
export class LessonAccess {
  constructor(private readonly teachers: TeachersQueries) {}

  /** teachers.id of a signed-in teacher; 404 teacher_not_linked when no row has their profile. */
  async teacherId(user: AuthUser): Promise<string> {
    const id = await this.teachers.idByProfile(user.id);
    if (!id) throw notFound('teacher_not_linked');
    return id;
  }

  /** 403 unless admin, or the teacher who teaches this lesson. */
  async assertCanTouch(user: AuthUser, lesson: { teacher_id: string }): Promise<void> {
    if (user.role === 'admin') return;
    if (user.role === 'teacher' && (await this.teachers.idByProfile(user.id)) === lesson.teacher_id) {
      return;
    }
    throw new ForbiddenException();
  }
}
