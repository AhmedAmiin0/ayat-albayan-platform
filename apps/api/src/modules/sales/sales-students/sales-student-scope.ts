import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, forbidden, notFound } from '@/common/http/errors';
import { SalesOwnershipRule, SalesRepo, type SalesOwnership } from '@/modules/sales/sales';
import { type LessonFacts, SalesStudentRepo } from './details/sales-student.repo';

/** Who the assistant ownership rule binds: the sales base role; the admin never. */
const isAssistant = (user: AuthUser): boolean => user.role === 'sales';

/** Every student of the lesson is hers (a group lesson moves / cancels for all of them). */
const ownsEvery = (own: SalesOwnership, lesson: LessonFacts): boolean =>
  lesson.lesson_students.every((s) => own.studentIds.includes(s.student_id));

interface StudentAccess {
  own: SalesOwnership;
  mine: boolean;
  acts: boolean;
}

/**
 * Which students are a salesperson's (docs/16 row 36): her OWN, by the same ownership as «الاشتراكات»
 * and its history (SalesQueries.ownership: her leads' families and the students she brought). «تفاصيل
 * الطالب» opens any student (owner 2026-10-28) and reads it all, reports and subscriptions included
 * (owner 2026-10-30): `mine` only marks hers for the money actions. Moving or cancelling a lesson (assertLesson) follows
 * SalesOwnershipRule; «تأكيد الحلقة» is open to ANY lesson (owner 2026-10-28).
 */
@Injectable()
export class SalesStudentScope {
  constructor(
    private readonly sales: SalesRepo,
    private readonly queries: SalesStudentRepo,
    private readonly rule: SalesOwnershipRule,
  ) {}

  /**
   * Her ownership, whether this student is hers (`mine`), and whether she may act on it
   * (`acts`: the money actions and trial date of «تفاصيل الطالب»): hers, or ANY while
   * SalesOwnershipRule does not enforce.
   */
  async access(user: AuthUser, studentId: string): Promise<StudentAccess> {
    const ownership = this.sales.ownership(user.id);
    const [own, enforced] = await Promise.all([ownership, this.rule.enforced()]);
    const mine = own.studentIds.includes(studentId);
    return { own, mine, acts: mine || !enforced };
  }

  /**
   * One lesson she may move or cancel (docs/16 row 37): ANY student's lesson while SalesOwnershipRule
   * does not enforce (owner 2026-11-02, «اشتراط التعيين» OFF), only a lesson whose every student is
   * hers while it does (403 not_your_student); a group lesson moves / cancels for every student of it,
   * as the admin's one-lesson action does. 404 lesson_not_found (a lesson with no student reads the
   * same), 409 lesson_ended once it is over. A closed status is the admin service's 409.
   */
  async assertLesson(input: { lessonId: string; now: Date; user: AuthUser }): Promise<LessonFacts> {
    const lesson = await this.queries.lesson(input.lessonId);
    if (!lesson || lesson.lesson_students.length === 0) throw notFound('lesson_not_found');
    if (Date.parse(lesson.ends_at) <= input.now.getTime()) throw conflict('lesson_ended');
    const own = isAssistant(input.user) ? await this.rule.scope(input.user) : null;
    if (own && !ownsEvery(own, lesson)) throw forbidden('not_your_student');
    return lesson;
  }
}
