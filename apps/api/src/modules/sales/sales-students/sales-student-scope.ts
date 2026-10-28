import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';
import { conflict, forbidden, notFound } from '../../../common/http/errors';
import { SalesQueries, type SalesOwnership } from '../sales';
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

  /** 404 student_not_found unless the student is hers; her ownership otherwise («الجدول» marks `mine`). */
  async assertStudent(user: AuthUser, studentId: string): Promise<SalesOwnership> {
    const own = await this.sales.ownership(user.id);
    if (!own.studentIds.includes(studentId)) throw notFound('student_not_found');
    return own;
  }

  /**
   * One lesson she may move or cancel (docs/16 row 37): 404 lesson_not_found, 403 not_your_student
   * unless EVERY student of it is hers (a group lesson with another family's child moves and messages
   * that family too, so it stays the admin's), 409 lesson_ended once it is over (its outcome is the teacher's
   * and the admin's, never hers). A closed status is the admin service's 409 invalid_transition.
   */
  async assertLesson(user: AuthUser, input: { lessonId: string; now: Date }): Promise<LessonFacts> {
    const lesson = await this.queries.lesson(input.lessonId);
    if (!lesson) throw notFound('lesson_not_found');
    const own = await this.sales.ownership(user.id);
    const hers = lesson.lesson_students.length > 0 && lesson.lesson_students.every((s) => own.studentIds.includes(s.student_id));
    if (!hers) throw forbidden('not_your_student');
    if (Date.parse(lesson.ends_at) <= input.now.getTime()) throw conflict('lesson_ended');
    return lesson;
  }
}
