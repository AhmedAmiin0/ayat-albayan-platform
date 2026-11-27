import {
  permissionGroups,
  roleRoutes as routes,
  type PermissionGroup,
  type RoleView,
  type StaffUserView,
} from '@ab/catalog';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { RolesService } from './roles.service';

/** All behind roles.manage. */
@ApiTags('roles')
@ApiBearerAuth()
@Permissions('roles.manage')
@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  /** The matrix sections (self.* scope keys left out); labels come from i18n. */
  @Route(routes.permissions)
  catalog(): PermissionGroup[] {
    return permissionGroups();
  }

  @Route(routes.list)
  list(): Promise<RoleView[]> {
    return this.roles.list();
  }

  /** The staff profiles and their roles (GET /users is the full directory of the users module). */
  @Route(routes.staffUsers)
  staffUsers(): Promise<StaffUserView[]> {
    return this.roles.users();
  }

  @Route(routes.create)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ): Promise<RoleView> {
    return this.roles.create(body, user.id);
  }

  /**
   * 400 admin_role_fixed, 403 permission_not_held (adding a grant the actor lacks),
   * 409 last_admin / self_lockout.
   */
  @Route(routes.update)
  update(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.update>,
    @CurrentUser() user: AuthUser,
  ): Promise<RoleView> {
    return this.roles.update(params.id, { ...body, actorId: user.id });
  }

  /** 400 admin_role_fixed or not_system_role, 403, 409 as update. */
  @Route(routes.reset)
  @HttpCode(200)
  reset(
    @RouteInput() { params }: RouteInputOf<typeof routes.reset>,
    @CurrentUser() user: AuthUser,
  ): Promise<RoleView> {
    return this.roles.reset(params.id, user.id);
  }

  /** 409 system_role, 409 role_in_use. */
  @Route(routes.remove)
  @HttpCode(204)
  remove(@RouteInput() { params }: RouteInputOf<typeof routes.remove>): Promise<void> {
    return this.roles.remove(params.id);
  }
}

/** The staff users (every profile but guardians and students) and the role each holds. */
@ApiTags('roles')
@ApiBearerAuth()
@Permissions('roles.manage')
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
