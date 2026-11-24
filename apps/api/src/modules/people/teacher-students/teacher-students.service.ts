import { TEACHER_STUDENT_STATUSES, type TeacherStudentKind, type TeacherStudentView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { nextLessonByStudent, studentIdsOf, toStudentViews } from './teacher-students.mapper';
import { TeacherStudentsRepo } from './teacher-students.repo';

const DAY = 86_400_000;
/** Students on a lesson of mine in the last 60 days or later still count as mine. */
const LOOKBACK_DAYS = 60;

/** Mine: teacher_id or on one of my lessons; subscribed includes ended packages, not churned. */
@Injectable()
export class TeacherStudentsService {
  constructor(
    private readonly teachers: TeachersRepo,
    private readonly queries: TeacherStudentsRepo,
  ) {}

  async mine(user: AuthUser, kind: TeacherStudentKind, now = new Date()): Promise<TeacherStudentView[]> {
    const teacherId = await this.teachers.idByProfile(user.id);
    if (!teacherId) throw notFound('teacher_not_linked');
    const statuses = TEACHER_STUDENT_STATUSES[kind];
    const since = new Date(now.getTime() - LOOKBACK_DAYS * DAY).toISOString();
    const [assigned, lessons] = await Promise.all([
      this.queries.assigned({ teacherId, statuses }),
      this.queries.lessons({ teacherId, since }),
    ]);
    const known = new Set(assigned.map((s) => s.id));
    const ids = [...studentIdsOf(lessons)].filter((id) => !known.has(id));
    const onLessons = await this.queries.byIds({ ids, statuses });
    return toStudentViews([...assigned, ...onLessons], nextLessonByStudent(lessons, now));
  }
}
