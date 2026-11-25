import type { SalesCancel, SalesLessonMoved, SalesReschedule } from '@ab/shared';
import type { LessonStatus } from '@ab/catalog';
import { CANCEL_STATUS, type CancelBy, type LessonCorrect } from '@ab/schedule';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import {
  LessonCancelService,
  LessonStatusService,
  OutcomeCorrection,
  RescheduleOneService,
} from '@/modules/teaching/lessons';
import { SalesStudentRepo } from '@/modules/sales/sales-students/shared/sales-student.repo';
import { SalesStudentScope } from '@/modules/sales/sales-students/shared/sales-student-scope';

/** Who may be recorded once the lesson is over: what happened, never the academy's own cancel. */
const AFTER_END: Record<CancelBy, boolean> = {
  admin: false,
  teacher: true,
  student: true,
};

type Move = { lessonId: string; body: SalesReschedule; actor: AuthUser };
type Cancel = { lessonId: string; body: SalesCancel; actor: AuthUser };
type Confirm = { lessonId: string; actor: AuthUser };
interface Correct {
  lessonId: string;
  body: LessonCorrect;
  actor: AuthUser;
}

/** The admin's lesson services, held together (max-params: three constructor dependencies). */
@Injectable()
export class LessonServices {
  constructor(
    readonly one: RescheduleOneService,
    readonly cancels: LessonCancelService,
    readonly status: LessonStatusService,
    readonly corrections: OutcomeCorrection,
  ) {}
}

/** docs/16 row 37: through the admin's services with her as actor; scope one, no clash override. */
@Injectable()
export class SalesLessonActions {
  constructor(
    private readonly scope: SalesStudentScope,
    private readonly queries: SalesStudentRepo,
    private readonly lessons: LessonServices,
  ) {}

  async reschedule({ lessonId, body, actor }: Move, now = new Date()): Promise<SalesLessonMoved> {
    await this.scope.assertLesson({ lessonId, now, user: actor });
    // Her own booking refuses a past time too (SalesBookingService): never a lesson that is already over.
    if (Date.parse(body.startsAt) <= now.getTime()) throw badRequest('date_in_past');
    const reason = body.reason ? { reason: body.reason } : {};
    const one = { scope: 'one' as const, startsAt: body.startsAt, ...reason };
    const id = await this.lessons.one.reschedule({ lessonId, body: one, actor });
    const moved = await this.queries.lesson(id);
    if (!moved) throw notFound('lesson_not_found');
    return {
      id: moved.id,
      starts_at: new Date(moved.starts_at).toISOString(),
      status: moved.status,
    };
  }

  /**
   * `by` admin (default): before it ends only. teacher / student: before or after it ends, and on
   * a lesson held automatically the admin service's correction (409 not_auto_held otherwise).
   */
  async cancel(
    { lessonId, body, actor }: Cancel,
    now = new Date(),
  ): Promise<{ id: string; status: LessonStatus }> {
    const by = body.by ?? 'admin';
    await this.scope.assertLesson({ lessonId, now, user: actor, afterEnd: AFTER_END[by] });
    const reason = body.reason ? body.reason : null;
    await this.lessons.cancels.cancel({ lessonId, body: { scope: 'one', by, reason }, actor });
    const lesson = await this.queries.lesson(lessonId);
    return { id: lessonId, status: lesson?.status ?? CANCEL_STATUS[by] };
  }

  /** Any lesson, since the family's yes arrives in a chat every assistant sees; no message sent. */
  async confirm({ lessonId, actor }: Confirm, now = new Date()): Promise<SalesLessonMoved> {
    const lesson = await this.queries.lesson(lessonId);
    if (!lesson) throw notFound('lesson_not_found');
    if (Date.parse(lesson.ends_at) <= now.getTime()) throw conflict('lesson_ended');
    await this.lessons.status.confirm({ lessonId, actor, anyLesson: true });
    return { id: lesson.id, starts_at: new Date(lesson.starts_at).toISOString(), status: 'confirmed' };
  }

  /** After the end via OutcomeCorrection; any lesson unless SalesOwnershipRule enforces. */
  async correct(
    { lessonId, body, actor }: Correct,
    now = new Date(),
  ): Promise<{ id: string; status: LessonStatus }> {
    await this.scope.assertLesson({ lessonId, now, user: actor, afterEnd: true });
    await this.lessons.corrections.correct({ lessonId, to: body.to, actor });
    return { id: lessonId, status: body.to };
  }
}
