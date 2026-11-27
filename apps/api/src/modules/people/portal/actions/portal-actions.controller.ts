import {
  portalLessonRoutes as routes,
  type PortalActionResult,
  type PortalSlots,
} from '@ab/shared';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { PortalLessonActions } from './portal-actions.service';
import { PortalSlotsService } from './portal-slots.service';

type Ids = RouteInputOf<typeof routes.confirm>['params'];

const call = (p: Ids, user: AuthUser) => ({ user, studentId: p.id, lessonId: p.lessonId });

/** Lesson actions on the login's own student, scoped like PortalController. */
@ApiTags('portal')
@ApiBearerAuth()
@Permissions('self.portal')
@Controller()
export class PortalLessonActionsController {
  constructor(
    @Inject(PortalLessonActions) private readonly actions: PortalLessonActions,
    @Inject(PortalSlotsService) private readonly slots: PortalSlotsService,
  ) {}

  @Route(routes.confirm)
  @HttpCode(200)
  confirm(
    @RouteInput() { params }: RouteInputOf<typeof routes.confirm>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalActionResult> {
    return this.actions.confirm(call(params, user));
  }

  @Route(routes.cancel)
  @HttpCode(200)
  cancel(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.cancel>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalActionResult> {
    return this.actions.cancel(call(params, user), body);
  }

  @Route(routes.request)
  @HttpCode(200)
  request(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.request>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalActionResult> {
    return this.actions.request(call(params, user), body);
  }

  @Route(routes.withdraw)
  @HttpCode(200)
  withdraw(
    @RouteInput() { params }: RouteInputOf<typeof routes.withdraw>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalActionResult> {
    return this.actions.withdraw(call(params, user));
  }

  @Route(routes.slots)
  free(
    @RouteInput() { params, query }: RouteInputOf<typeof routes.slots>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalSlots> {
    return this.slots.free(call(params, user), query);
  }
}
