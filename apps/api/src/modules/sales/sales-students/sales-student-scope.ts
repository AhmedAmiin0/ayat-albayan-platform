import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';
import { conflict, notFound } from '../../../common/http/errors';
import { SalesQueries, type SalesOwnership } from '../sales';
import { type LessonFacts, SalesStudentQueries } from './details/sales-student.queries';

/**
 * Which students are a salesperson's (docs/16 row 36): her OWN, by the same ownership as «الاشتراكات»
 * and its history (SalesQueries.ownership: her leads' families and the students she brought). «تفاصيل
 * الطالب» opens any student (owner 2026-10-28) but marks `mine`; a report PDF stays hers: there any other
 * id reads exactly like an unknown one. Moving or cancelling a lesson (assertLesson) and «تأكيد الحلقة» are
 * open to ANY lesson (owner 2026-10-28).
 */
@Injectable()
export class SalesStudentScope {
  constructor(
    private readonly sales: SalesQueries,
    private readonly queries: SalesStudentQueries,
  ) {}

  /** Her ownership and whether this student is hers («تفاصيل الطالب»: subscriptions and reports only when it is). */
  async access(user: AuthUser, studentId: string): Promise<{ own: SalesOwnership; mine: boolean }> {
    const own = await this.sales.ownership(user.id);
    return { own, mine: own.studentIds.includes(studentId) };
  }

  /** 404 student_not_found unless the student is hers; her ownership otherwise («الجدول» marks `mine`). */
  async assertStudent(user: AuthUser, studentId: string): Promise<SalesOwnership> {
    const own = await this.sales.ownership(user.id);
    if (!own.studentIds.includes(studentId)) throw notFound('student_not_found');
    return own;
  }

  /**
   * One lesson she may move or cancel (docs/16 row 37): ANY student's lesson, hers or another family's
   * (owner 2026-10-28, the same scope as «تفاصيل الطالب»); a group lesson moves / cancels for every student
   * of it, as the admin's one-lesson action does. 404 lesson_not_found (a lesson with no student reads the
   * same: never a sales lesson), 409 lesson_ended once it is over (its outcome is the teacher's and the
   * admin's, never hers). A closed status is the admin service's 409 invalid_transition.
   */
  async assertLesson(input: { lessonId: string; now: Date }): Promise<LessonFacts> {
    const lesson = await this.queries.lesson(input.lessonId);
    if (!lesson || lesson.lesson_students.length === 0) throw notFound('lesson_not_found');
    if (Date.parse(lesson.ends_at) <= input.now.getTime()) throw conflict('lesson_ended');
    return lesson;
  }
}
