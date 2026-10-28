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
type Kind = 'teacher' | 'user';

/**
 * A staff member's photo, by an admin (owner 2026-10-28): the same signed upload + register + remove
 * as «حسابي» (type and size re-checked from Storage and the bytes) through StaffPhotoAdmin.
 * /teachers/:id/avatar: teachers.write like every other teacher field (admin only), with or without a
 * login. /users/:id/avatar: users.write and the same «may touch this login» rules as every other change
 * (403 system_admin_only / permission_not_held); 400 avatar_not_staff for a student or guardian login.
 */
@ApiTags('staff-photos')
@ApiBearerAuth()
@Controller()
export class StaffPhotoController {
  constructor(
    private readonly photos: StaffPhotoAdmin,
    private readonly ports: UserPorts,
  ) {}

  @Post('teachers/:id/avatar/upload-url')
  @Permissions('teachers.write')
  teacherUploadUrl(@Param('id', uuid) id: string, @Body() body: unknown): Promise<SignedUpload> {
    return this.photos.uploadUrl({ kind: 'teacher', id }, parseOrThrow(avatarUploadSchema, body));
  }

  @Put('teachers/:id/avatar')
  @Permissions('teachers.write')
  teacherSet(@Param('id', uuid) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<StaffPhotoView> {
    return this.set({ kind: 'teacher', id }, { body, user });
  }

  @Delete('teachers/:id/avatar')
  @Permissions('teachers.write')
  teacherRemove(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser): Promise<StaffPhotoView> {
    return this.photos.remove({ kind: 'teacher', id }, user.id);
  }

  @Post('users/:id/avatar/upload-url')
  @Permissions('users.write')
  async userUploadUrl(@Param('id', uuid) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SignedUpload> {
    const input = parseOrThrow(avatarUploadSchema, body);
    await this.mayTouch(id, user);
    return this.photos.uploadUrl({ kind: 'user', id }, input);
  }

  @Put('users/:id/avatar')
  @Permissions('users.write')
  async userSet(@Param('id', uuid) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<StaffPhotoView> {
    parseOrThrow(avatarSetSchema, body);
    await this.mayTouch(id, user);
    return this.set({ kind: 'user', id }, { body, user });
  }

  @Delete('users/:id/avatar')
  @Permissions('users.write')
  async userRemove(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser): Promise<StaffPhotoView> {
    await this.mayTouch(id, user);
    return this.photos.remove({ kind: 'user', id }, user.id);
  }

  private set(who: { kind: Kind; id: string }, req: { body: unknown; user: AuthUser }): Promise<StaffPhotoView> {
    return this.photos.set(who, { path: parseOrThrow(avatarSetSchema, req.body).path, actorId: req.user.id });
  }

  private async mayTouch(id: string, user: AuthUser): Promise<void> {
    const { state, target } = await this.ports.access.target(id);
    assertMayTouch({ id: user.id, permissions: user.permissions ?? [] }, state, target);
  }
}
