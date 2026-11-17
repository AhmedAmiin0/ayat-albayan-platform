import type { PortalActionResult, PortalCancel, PortalRequest } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, notFound } from '@/common/http/errors';
import {
  FamilyRequestService,
  isAheadOpen,
  LessonCancelService,
  LessonStatusService,
} from '@/modules/teaching/lessons';
import { familyOf } from '@/modules/people/portal/lessons/portal-lesson-family';
import {
  PortalLessonsRepo,
  type PortalLessonRow,
} from '@/modules/people/portal/lessons/portal-lessons.repo';
import { PortalScopes } from '@/modules/people/portal/scope/portal-scope';

export interface ActionCall {
  user: AuthUser;
  studentId: string;
  lessonId: string;
}

/** The lesson services the family's buttons reuse (one injectable keeps the constructor small). */
@Injectable()
export class PortalActionDeps {
  constructor(
    @Inject(LessonStatusService) readonly status: LessonStatusService,
    @Inject(LessonCancelService) readonly cancels: LessonCancelService,
    @Inject(FamilyRequestService) readonly requests: FamilyRequestService,
  ) {}
}

/**
 * «خيارات الحلقة» of the family (owner 2026-11-17) on a lesson of the login's own student
 * (PortalScopes: 404 student_not_found / lesson_not_found), still open and not started (409
 * lesson_started): «سأحضر» = LessonStatusService.confirm; «أعتذر عن الحلقة» = the student's
 * cancel of that one lesson under late_cancel_hours (its teacher hears it); «اطلب موعدًا آخر» /
 * «سحب الطلب» = FamilyRequestService. Each answers the lesson's status and package outcome.
 */
@Injectable()
export class PortalLessonActions {
  constructor(
    @Inject(PortalScopes) private readonly scopes: PortalScopes,
    @Inject(PortalLessonsRepo) private readonly lessons: PortalLessonsRepo,
    @Inject(PortalActionDeps) private readonly deps: PortalActionDeps,
  ) {}

  async confirm(call: ActionCall): Promise<PortalActionResult> {
    await this.ahead(call);
    await this.deps.status.confirm({ lessonId: call.lessonId, actor: call.user, anyLesson: true });
    return this.result(call);
  }

  async cancel(call: ActionCall, body: PortalCancel): Promise<PortalActionResult> {
    await this.ahead(call);
    const cancel = { scope: 'one' as const, by: 'student' as const, reason: body.reason || null };
    await this.deps.cancels.cancel({ lessonId: call.lessonId, body: cancel, actor: call.user });
    return this.result(call);
  }

  async request(call: ActionCall, body: PortalRequest): Promise<PortalActionResult> {
    await this.ahead(call);
    await this.deps.requests.request({ lessonId: call.lessonId, body, actor: call.user });
    return this.result(call);
  }

  async withdraw(call: ActionCall): Promise<PortalActionResult> {
    await this.ahead(call);
    await this.deps.requests.withdraw(call.lessonId);
    return this.result(call);
  }

  /** The login's own student's lesson, still ahead and open. */
  async ahead(call: ActionCall): Promise<PortalLessonRow> {
    const row = await this.own(call);
    if (!isAheadOpen(row, new Date())) throw conflict('lesson_started');
    return row;
  }

  private async own(call: ActionCall): Promise<PortalLessonRow> {
    await this.scopes.student(call.user, call.studentId);
    const row = await this.lessons.one({ studentId: call.studentId, lessonId: call.lessonId });
    if (!row) throw notFound('lesson_not_found');
    return row;
  }

  private async result(call: ActionCall): Promise<PortalActionResult> {
    const row = await this.own(call);
    const lateCancelHours = (await this.lessons.readSettings()).late_cancel_hours ?? null;
    const ctx = { studentId: call.studentId, now: new Date(), lateCancelHours, requests: [] };
    const family = familyOf(row, ctx);
    return { lesson_id: row.id, status: row.status, counts: family.counts };
  }
}
