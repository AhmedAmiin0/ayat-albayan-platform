import {
  CANCEL_STATUS,
  type CancelBy,
  type LessonStatus,
  type SalesCancel,
  type SalesLessonMoved,
  type SalesReschedule,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { LessonCancelService, LessonStatusService, RescheduleOneService } from '@/modules/teaching/lessons';
import { SalesStudentRepo } from '@/modules/sales/sales-students/details/sales-student.repo';
import { SalesStudentScope } from '@/modules/sales/sales-students/sales-student-scope';

/** Who may be recorded once the lesson is over: what happened, never the academy's own cancellation. */
const AFTER_END: Record<CancelBy, boolean> = { admin: false, teacher: true, student: true };

type Move = { lessonId: string; body: SalesReschedule; actor: AuthUser };
type Cancel = { lessonId: string; body: SalesCancel; actor: AuthUser };
type Confirm = { lessonId: string; actor: AuthUser };

/** The admin's lesson services, held together (max-params: three constructor dependencies). */
@Injectable()
export class LessonServices {
  constructor(
    readonly one: RescheduleOneService,
    readonly cancels: LessonCancelService,
    readonly status: LessonStatusService,
  ) {}
}

/**
 * Sales move or cancel ONE lesson (owner 2026-10-27, docs/16 row 37; ANY student's, not only hers:
 * owner 2026-10-28) through the admin's very services, with her as the actor: the same transaction,
 * confirmation messages, package counts, calendar sync and audit as the admin's «تغيير الموعد» (scope one, no substitute, no clash
 * override) and «إلغاء» (scope one, by the academy, the reason optional: null when absent).
 */
@Injectable()
export class SalesLessonActions {
  constructor(
    private readonly scope: SalesStudentScope,
    private readonly queries: SalesStudentRepo,
    private readonly lessons: LessonServices,
  ) {}

  async reschedule({ lessonId, body, actor }: Move, now = new Date()): Promise<SalesLessonMoved> {
    await this.scope.assertLesson({ lessonId, now });
    // Her own booking refuses a past time too (SalesBookingService): never a lesson that is already over.
    if (Date.parse(body.startsAt) <= now.getTime()) throw badRequest('date_in_past');
    const id = await this.lessons.one.reschedule({ lessonId, body: { scope: 'one', startsAt: body.startsAt }, actor });
    const moved = await this.queries.lesson(id);
    if (!moved) throw notFound('lesson_not_found');
    return { id: moved.id, starts_at: new Date(moved.starts_at).toISOString(), status: moved.status };
  }

  /**
   * `by` admin (default): before it ends only. teacher / student: before or after it ends, and on a lesson
   * held automatically the admin service's correction (409 not_auto_held for any other completed one).
   */
  async cancel({ lessonId, body, actor }: Cancel, now = new Date()): Promise<{ id: string; status: LessonStatus }> {
    const by = body.by ?? 'admin';
    await this.scope.assertLesson({ lessonId, now, afterEnd: AFTER_END[by] });
    const reason = body.reason ? body.reason : null;
    await this.lessons.cancels.cancel({ lessonId, body: { scope: 'one', by, reason }, actor });
    const lesson = await this.queries.lesson(lessonId);
    return { id: lessonId, status: lesson?.status ?? CANCEL_STATUS[by] };
  }

  /**
   * «تأكيد الحلقة» (owner 2026-10-28): ANY lesson, not only hers (the family's «نعم» arrives in a chat every
   * assistant sees), before it ends. The teacher's own LessonStatusService.confirm, she is confirmed_by and the
   * audit's actor; `anyLesson` because lessons.confirm already decided (never LessonAccess's teacher rule).
   * Already confirmed = unchanged; any other status 409 invalid_transition. No message to anyone.
   */
  async confirm({ lessonId, actor }: Confirm, now = new Date()): Promise<SalesLessonMoved> {
    const lesson = await this.queries.lesson(lessonId);
    if (!lesson) throw notFound('lesson_not_found');
    if (Date.parse(lesson.ends_at) <= now.getTime()) throw conflict('lesson_ended');
    await this.lessons.status.confirm({ lessonId, actor, anyLesson: true });
    return { id: lesson.id, starts_at: new Date(lesson.starts_at).toISOString(), status: 'confirmed' };
  }
}
