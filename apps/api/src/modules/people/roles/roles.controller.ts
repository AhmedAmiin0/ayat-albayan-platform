import {
  permissionGroups,
  roleAssignSchema,
  roleCreateSchema,
  roleUpdateSchema,
  type PermissionGroup,
  type RoleView,
  type StaffUserView,
} from '@ab/shared';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
import { RolesService } from './roles.service';

/** «الأدوار والصلاحيات»: roles, their grants and the catalog. All behind roles.manage. */
@ApiTags('roles')
@ApiBearerAuth()
@Permissions('roles.manage')
@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  /** The matrix sections (self.* scope keys left out); labels come from i18n. */
  @Get('permissions')
  catalog(): PermissionGroup[] {
    return permissionGroups();
  }

  @Get('roles')
  list(): Promise<RoleView[]> {
    return this.roles.list();
  }

  /** The staff profiles and their roles (GET /users is the full directory of the users module). */
  @Get('roles/staff-users')
  staffUsers(): Promise<StaffUserView[]> {
    return this.roles.users();
  }

  @Post('roles')
  create(
    @ZodBody(roleCreateSchema) body: z.output<typeof roleCreateSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<RoleView> {
    return this.roles.create(body, user.id);
  }

  /** 400 admin_role_fixed, 403 permission_not_held (adding a grant the actor lacks), 409 last_admin / self_lockout. */
  @Patch('roles/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(roleUpdateSchema) body: z.output<typeof roleUpdateSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<RoleView> {
    return this.roles.update(id, { ...body, actorId: user.id });
  }

  /** «استعادة الافتراضي» (system teacher / sales / assistant): 400 admin_role_fixed / not_system_role, 403, 409 as update. */
  @Post('roles/:id/reset')
  @HttpCode(200)
  reset(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RoleView> {
    return this.roles.reset(id, user.id);
  }

  /** 409 system_role, 409 role_in_use. */
  @Delete('roles/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.roles.remove(id);
  }
}

/** The staff users (every profile but guardians and students) and the role each holds. */
@ApiTags('roles')
@ApiBearerAuth()
@Permissions('roles.manage')
@Controller('users')
export class StaffUsersController {
  constructor(private readonly roles: RolesService) {}

  /** Sets profiles.role to the role's base role. 400 not_staff, 403 permission_not_held, 409 last_admin / self_lockout. */
  @Patch(':id/role')
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(roleAssignSchema) body: z.output<typeof roleAssignSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<StaffUserView> {
    const { role_id } = body;
    return this.roles.assign({ userId: id, roleId: role_id, actorId: user.id });
  }
}
