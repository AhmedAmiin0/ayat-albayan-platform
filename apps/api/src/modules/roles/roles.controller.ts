import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { RolesService } from './roles.service';

/**
 * Custom roles and their permissions. Admin base role only; AuthGuard additionally asks for
 * roles.view (GET) / roles.manage (writes) from ROUTE_PERMISSIONS.
 */
@ApiTags('roles')
@ApiBearerAuth()
@Roles('admin')
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  list() {
    return this.roles.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.get(id);
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.roles.create(body, user.id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.roles.update(id, body, user.id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.roles.duplicate(id, body, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.roles.remove(id, user.id);
  }
}
