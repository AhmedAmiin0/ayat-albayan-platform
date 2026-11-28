import { roleRoutes as routes, type StaffUserView } from '@ab/catalog';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { RolesService } from './roles.service';

/** The staff users (every profile but guardians and students) and the role each holds. */
@ApiBearerAuth()
@Controller()
export class StaffUsersController {
  constructor(private readonly roles: RolesService) {}

  /**
   * Sets profiles.role to the role's base role. 400 not_staff, 403 permission_not_held,
   * 409 last_admin / self_lockout.
   */
  @Route(routes.assign)
  assign(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.assign>,
    @CurrentUser() user: AuthUser,
  ): Promise<StaffUserView> {
    return this.roles.assign({ userId: params.id, roleId: body.role_id, actorId: user.id });
  }
}
