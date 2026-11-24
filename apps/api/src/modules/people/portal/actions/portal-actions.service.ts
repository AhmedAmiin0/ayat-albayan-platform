import {
  isFamilyActionable,
  type PortalActionResult,
  type PortalCancel,
  type PortalRequest,
  type PortalStudent,
} from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, notFound } from '@/common/http/errors';
import {
  FamilyRequestService,
  LessonCancelService,
  LessonStatusService,
} from '@/modules/teaching/lessons';
import { familyOf, isGroupLesson } from '@/modules/people/portal/lessons/portal-lesson-family';
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

/** The login's own student and that student's lesson, as ahead() checked them. */
interface OwnLesson {
  student: PortalStudent;
  row: PortalLessonRow;
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

/** Only an open, unstarted solo lesson; group lessons are the academy's to move or cancel. */
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
    await this.deps.requests.withdraw(call.lessonId, call.user);
    return this.result(call);
  }

  /** The login's own student's lesson, still ahead and open, the student's alone. */
  async ahead(call: ActionCall): Promise<OwnLesson> {
    const student = await this.scopes.student(call.user, call.studentId);
    const row = await this.row(call);
    if (!isFamilyActionable(row, new Date())) throw conflict('lesson_started');
    if (isGroupLesson(row)) throw conflict('group_lesson');
    return { student, row };
  }

  private async row(call: ActionCall): Promise<PortalLessonRow> {
    const row = await this.lessons.one({ studentId: call.studentId, lessonId: call.lessonId });
    if (!row) throw notFound('lesson_not_found');
    return row;
  }

  /** After the write: the lesson as it is now (the scope was checked by ahead()). */
  private async result(call: ActionCall): Promise<PortalActionResult> {
    const [row, settings] = await Promise.all([this.row(call), this.lessons.readSettings()]);
    const lateCancelHours = settings.late_cancel_hours ?? null;
    const ctx = { studentId: call.studentId, now: new Date(), lateCancelHours, requests: [] };
    return { lesson_id: row.id, status: row.status, counts: familyOf(row, ctx).counts };
  }
}
