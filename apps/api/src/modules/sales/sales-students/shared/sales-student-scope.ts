import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, forbidden, notFound } from '@/common/http/errors';
import { SalesOwnershipRule, SalesRepo, type SalesOwnership } from '@/modules/sales/sales';
import { type LessonFacts, SalesStudentRepo } from './sales-student.repo';
import { isSales } from '@/common/auth/roles';

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

/** Every student of the lesson is hers (a group lesson moves / cancels for all of them). */
const ownsEvery = (own: SalesOwnership, lesson: LessonFacts): boolean =>
  lesson.lesson_students.every((s) => own.studentIds.includes(s.student_id));

/** docs/16 row 36: ownership is her leads' families and students she brought; `mine` marks them. */
@Injectable()
export class SalesStudentScope {
  constructor(
    private readonly sales: SalesRepo,
    private readonly queries: SalesStudentRepo,
    private readonly rule: SalesOwnershipRule,
  ) {}

  /** `acts` is hers, or any while SalesOwnershipRule does not enforce. */
  async access(user: AuthUser, studentId: string): Promise<StudentAccess> {
    const ownership = this.sales.ownership(user.id);
    const [own, enforced] = await Promise.all([ownership, this.rule.enforced()]);
    const mine = own.studentIds.includes(studentId);
    return { own, mine, acts: mine || !enforced };
  }

  /** docs/16 row 37: a group lesson moves for all; 409 lesson_ended since outcomes aren't hers. */
  async assertLesson(input: LessonCheck): Promise<LessonFacts> {
    const lesson = await this.queries.lesson(input.lessonId);
    if (!lesson || lesson.lesson_students.length === 0) throw notFound('lesson_not_found');
    const ended = Date.parse(lesson.ends_at) <= input.now.getTime();
    if (ended && !input.afterEnd) throw conflict('lesson_ended');
    await this.assertOwnsLesson(input.user, lesson);
    return lesson;
  }

  /** While enforced, only a lesson whose every student is hers; off (default), any lesson. */
  private async assertOwnsLesson(user: AuthUser, lesson: LessonFacts): Promise<void> {
    const own = isSales(user) ? await this.rule.scope(user) : null;
    if (own && !ownsEvery(own, lesson)) throw forbidden('not_your_student');
  }
}
