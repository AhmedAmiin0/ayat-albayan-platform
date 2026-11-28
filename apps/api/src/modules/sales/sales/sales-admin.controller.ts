import { salesAssignRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SalesAssignService } from './assign/sales-assign.service';

/** The admin's side of the sales portal: who owns which lead. */
@ApiBearerAuth()
@Controller()
export class SalesAdminController {
  constructor(private readonly assigns: SalesAssignService) {}

  @Route(routes.assign)
  @HttpCode(200)
  assign(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.assign>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assigns.assign({ leadId: params.id, profileId: body.profileId, actorId: user.id });
  }

  @Route(routes.assignUnassigned)
  @HttpCode(200)
  async assignUnassigned() {
    return asResponse(routes.assignUnassigned.response, await this.assigns.assignUnassigned());
  }

  @Route(routes.people)
  async people() {
    return asResponse(routes.people.response, await this.assigns.list());
  }
}
