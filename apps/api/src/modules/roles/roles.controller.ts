import {
  permissionGroups,
  roleAssignSchema,
  roleCreateSchema,
  roleUpdateSchema,
  type PermissionGroup,
  type RoleView,
  type StaffUserView,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
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

  @Post('roles')
  create(@Body() body: unknown): Promise<RoleView> {
    return this.roles.create(parseOrThrow(roleCreateSchema, body));
  }

  /** 400 admin_role_fixed (the system admin's grants), 409 last_admin / self_lockout. */
  @Patch('roles/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<RoleView> {
    return this.roles.update(id, { ...parseOrThrow(roleUpdateSchema, body), actorId: user.id });
  }

  /** 409 system_role, 409 role_in_use. */
  @Delete('roles/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.roles.remove(id);
  }
}

/** The staff users (every profile but guardians) and the role each holds. */
@ApiTags('roles')
@ApiBearerAuth()
@Permissions('roles.manage')
@Controller('users')
export class StaffUsersController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  list(): Promise<StaffUserView[]> {
    return this.roles.users();
  }

  /** Sets profiles.role to the role's base role. 400 not_staff, 409 last_admin / self_lockout. */
  @Patch(':id/role')
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<StaffUserView> {
    const { role_id } = parseOrThrow(roleAssignSchema, body);
    return this.roles.assign({ userId: id, roleId: role_id, actorId: user.id });
  }
}
