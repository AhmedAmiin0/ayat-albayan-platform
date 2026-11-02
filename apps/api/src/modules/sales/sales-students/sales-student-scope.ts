import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, forbidden, notFound } from '@/common/http/errors';
import { SalesOwnershipRule, SalesRepo, type SalesOwnership } from '@/modules/sales/sales';
import { type LessonFacts, SalesStudentRepo } from './details/sales-student.repo';

interface StudentAccess {
  own: SalesOwnership;
  mine: boolean;
  acts: boolean;
}

interface LessonCheck {
  lessonId: string;
  now: Date;
  /** The assistant acting: SalesOwnershipRule binds her (an admin never). */
  user: AuthUser;
  afterEnd?: boolean;
}

/** Who the assistant ownership rule binds: the sales base role; the admin never. */
const isAssistant = (user: AuthUser): boolean => user.role === 'sales';

/** Every student of the lesson is hers (a group lesson moves / cancels for all of them). */
const ownsEvery = (own: SalesOwnership, lesson: LessonFacts): boolean =>
  lesson.lesson_students.every((s) => own.studentIds.includes(s.student_id));

/**
 * Which students are a salesperson's (docs/16 row 36): her OWN, by the same ownership as «الاشتراكات»
 * and its history (SalesQueries.ownership: her leads' families and the students she brought). «تفاصيل
 * الطالب» opens any student (owner 2026-10-28) and reads it all, reports and subscriptions included
 * (owner 2026-10-30): `mine` only marks hers for the money actions. Moving or cancelling a lesson (assertLesson) and «تأكيد الحلقة» are
 * open to ANY lesson (owner 2026-10-28).
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
   * One lesson she may move or cancel (docs/16 row 37): ANY student's lesson, hers or another family's
   * (owner 2026-10-28, the same scope as «تفاصيل الطالب»); a group lesson moves / cancels for every student
   * of it, as the admin's one-lesson action does. 404 lesson_not_found (a lesson with no student reads the
   * same: never a sales lesson), 409 lesson_ended once it is over (its outcome is the teacher's and the
   * admin's, never hers). A closed status is the admin service's 409 invalid_transition.
   * `afterEnd`: recording that the teacher cancelled it or the student excused (owner 2026-11-02).
   */
  async assertLesson(input: LessonCheck): Promise<LessonFacts> {
    const lesson = await this.queries.lesson(input.lessonId);
    if (!lesson || lesson.lesson_students.length === 0) throw notFound('lesson_not_found');
    const ended = Date.parse(lesson.ends_at) <= input.now.getTime();
    if (ended && !input.afterEnd) throw conflict('lesson_ended');
    await this.assertOwnsLesson(input.user, lesson);
    return lesson;
  }

  /**
   * SalesOwnershipRule (owner 2026-11-02): while «اشتراط التعيين» enforces, only a lesson whose
   * every student is hers (403 not_your_student); off (the default), ANY lesson.
   */
  private async assertOwnsLesson(user: AuthUser, lesson: LessonFacts): Promise<void> {
    const own = isAssistant(user) ? await this.rule.scope(user) : null;
    if (own && !ownsEvery(own, lesson)) throw forbidden('not_your_student');
  }
}
