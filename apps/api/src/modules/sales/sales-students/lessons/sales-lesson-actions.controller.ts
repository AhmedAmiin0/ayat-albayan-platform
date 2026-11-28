import { salesLessonActionRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SalesLessonActions } from './sales-lesson-actions.service';

/** docs/16 rows 37, 37b: narrow keys per route; any lesson before it ends; strict bodies. */
@ApiBearerAuth()
@Controller()
export class SalesLessonActionsController {
  constructor(private readonly actions: SalesLessonActions) {}

  /** A clash answers 409 conflict { conflicts }: pick another slot. */
  @Route(routes.reschedule)
  @HttpCode(200)
  reschedule(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.reschedule>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.actions.reschedule({ lessonId: params.id, body, actor: user });
  }

  @Route(routes.cancel)
  @HttpCode(200)
  cancel(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.cancel>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.actions.cancel({ lessonId: params.id, body, actor: user });
  }

  @Route(routes.confirm)
  @HttpCode(200)
  confirm(
    @RouteInput() { params }: RouteInputOf<typeof routes.confirm>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.actions.confirm({ lessonId: params.id, actor: user });
  }

  @Route(routes.correct)
  @HttpCode(200)
  correct(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.correct>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.actions.correct({ lessonId: params.id, body, actor: user });
  }
}
