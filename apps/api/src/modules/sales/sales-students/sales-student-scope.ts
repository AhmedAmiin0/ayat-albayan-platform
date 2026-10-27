import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';
import { conflict, forbidden, notFound } from '../../../common/http/errors';
import { SalesQueries } from '../sales';
import { type LessonFacts, SalesStudentQueries } from './details/sales-student.queries';

/**
 * Which students a salesperson may open (docs/16 row 36): her OWN, by the same ownership as «الاشتراكات»
 * and its history (SalesQueries.ownership: her leads' families and the students she brought). Every
 * other id reads exactly like an unknown one (no existence leak, never another family's data).
 */
@Injectable()
export class SalesStudentScope {
  constructor(
    private readonly sales: SalesQueries,
    private readonly queries: SalesStudentQueries,
  ) {}

  /** 404 student_not_found unless the student is hers. */
  async assertStudent(user: AuthUser, studentId: string): Promise<void> {
    const own = await this.sales.ownership(user.id);
    if (!own.studentIds.includes(studentId)) throw notFound('student_not_found');
  }

  /**
   * One lesson she may move or cancel (docs/16 row 37): 404 lesson_not_found, 403 not_your_student
   * unless one of its students is hers, 409 lesson_ended once it is over (its outcome is the teacher's
   * and the admin's, never hers). A closed status is the admin service's 409 invalid_transition.
   */
  async assertLesson(user: AuthUser, input: { lessonId: string; now: Date }): Promise<LessonFacts> {
    const lesson = await this.queries.lesson(input.lessonId);
    if (!lesson) throw notFound('lesson_not_found');
    const own = await this.sales.ownership(user.id);
    if (!lesson.lesson_students.some((s) => own.studentIds.includes(s.student_id))) throw forbidden('not_your_student');
    if (Date.parse(lesson.ends_at) <= input.now.getTime()) throw conflict('lesson_ended');
    return lesson;
  }
}
