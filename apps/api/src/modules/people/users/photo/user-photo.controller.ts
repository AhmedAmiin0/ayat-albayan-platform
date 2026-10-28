import { avatarSetSchema, avatarUploadSchema, type SignedUpload, type StaffPhotoView } from '@ab/shared';
import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { StaffPhotoAdmin } from '../../../../common/storage/avatars/staff-photo-admin';
import { UserPorts } from '../users.ports';
import { assertMayTouch } from '../users.rules';

const uuid = new ParseUUIDPipe();

/**
 * A staff login's photo, by an admin (owner 2026-10-28): users.write and the same «may touch this
 * login» rules as every other change (403 system_admin_only / permission_not_held); 400 avatar_not_staff
 * for a student or guardian login (initials only). Same checks as «حسابي» through StaffPhotoAdmin.
 */
@ApiTags('users')
@ApiBearerAuth()
@Permissions('users.write')
@Controller('users/:id/avatar')
export class UserPhotoController {
  constructor(
    private readonly photos: StaffPhotoAdmin,
    private readonly ports: UserPorts,
  ) {}

  @Post('upload-url')
  async uploadUrl(@Param('id', uuid) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SignedUpload> {
    const input = parseOrThrow(avatarUploadSchema, body);
    await this.mayTouch(id, user);
    return this.photos.uploadUrl({ kind: 'user', id }, input);
  }

  @Put()
  async set(@Param('id', uuid) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<StaffPhotoView> {
    const { path } = parseOrThrow(avatarSetSchema, body);
    await this.mayTouch(id, user);
    return this.photos.set({ kind: 'user', id }, { path, actorId: user.id });
  }

  @Delete()
  async remove(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser): Promise<StaffPhotoView> {
    await this.mayTouch(id, user);
    return this.photos.remove({ kind: 'user', id }, user.id);
  }

  private async mayTouch(id: string, user: AuthUser): Promise<void> {
    const { state, target } = await this.ports.access.target(id);
    assertMayTouch({ id: user.id, permissions: user.permissions ?? [] }, state, target);
  }
}
