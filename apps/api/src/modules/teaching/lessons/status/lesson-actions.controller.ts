import { lessonActionRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { LessonCancelService } from './lesson-cancel.service';
import { LessonStatusService } from './lesson-status.service';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';
import { OutcomeCorrection } from '@/modules/teaching/lessons/auto-held/outcome-correction';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/**
 * Confirm, attendance outcome and cancel (docs/10 routes 6, 7, 9). R-SCH-03, R-SCH-07, R-SCH-08.
 * A teacher may confirm / record outcomes of their own lessons only (LessonAccess → 403).
 */
@ApiBearerAuth()
@Controller()
export class LessonActionsController {
  constructor(
    private readonly views: LessonViews,
    private readonly status: LessonStatusService,
    private readonly cancels: LessonCancelService,
    private readonly corrections: OutcomeCorrection,
  ) {}

  @Route(routes.confirm)
  @HttpCode(200)
  async confirm(@RouteInput() { params }: In<'confirm'>, @CurrentUser() user: AuthUser) {
    const lessonId = await this.status.confirm({ lessonId: params.id, actor: user });
    return this.views.one(lessonId, user.role);
  }

  @Route(routes.status)
  @HttpCode(200)
  async changeStatus(@RouteInput() { params, body }: In<'status'>, @CurrentUser() user: AuthUser) {
    const lessonId = await this.status.changeStatus({ ...body, lessonId: params.id, actor: user });
    return this.views.one(lessonId, user.role);
  }

  /** Every lesson cancelled (one, or this and the rest of its rule). */
  @Route(routes.cancel)
  @HttpCode(200)
  async cancel(@RouteInput() { params, body }: In<'cancel'>, @CurrentUser() user: AuthUser) {
    const ids = await this.cancels.cancel({ lessonId: params.id, body, actor: user });
    return this.views.many(ids, 'admin');
  }

  /** Ended lesson still open, or one the job settled; 409 not_auto_held, earning_paid. */
  @Route(routes.correct)
  @HttpCode(200)
  async correct(@RouteInput() { params, body }: In<'correct'>, @CurrentUser() user: AuthUser) {
    const input = { lessonId: params.id, to: body.to, actor: user };
    const lessonId = await this.corrections.correct(input);
    return this.views.one(lessonId, 'admin');
  }
}
