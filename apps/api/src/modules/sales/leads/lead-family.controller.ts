import { leadFamilyRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import { isAdmin } from '@/common/auth/roles';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { LeadFamilyService } from './lead-family.service';

/** Body is a generated code; answers never an id or a phone. */
@ApiBearerAuth()
@Controller()
export class LeadFamilyController {
  constructor(private readonly family: LeadFamilyService) {}

  @Route(routes.link)
  @HttpCode(200)
  link(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.link>,
    @CurrentUser() user: AuthUser,
  ) {
    const input = { leadId: params.id, code: body.code, actorId: user.id };
    return this.family.link({ ...input, admin: isAdmin(user) });
  }
}
