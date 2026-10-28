import { avatarSetSchema, avatarUploadSchema, type SignedUpload, type StaffPhotoView } from '@ab/shared';
import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { StaffPhotoAdmin } from '../../../../common/storage/avatars/staff-photo-admin';

const uuid = new ParseUUIDPipe();

/**
 * A teacher's photo, by an admin (owner 2026-10-28), for a teacher with or without a login: the same
 * signed upload + register + remove as «حسابي» (type and size re-checked from Storage and the bytes).
 * teachers.write, like every other teacher field (admin only).
 */
@ApiTags('teachers')
@ApiBearerAuth()
@Permissions('teachers.write')
@Controller('teachers/:id/avatar')
export class TeacherPhotoController {
  constructor(private readonly photos: StaffPhotoAdmin) {}

  @Post('upload-url')
  uploadUrl(@Param('id', uuid) id: string, @Body() body: unknown): Promise<SignedUpload> {
    return this.photos.uploadUrl({ kind: 'teacher', id }, parseOrThrow(avatarUploadSchema, body));
  }

  @Put()
  set(@Param('id', uuid) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<StaffPhotoView> {
    return this.photos.set({ kind: 'teacher', id }, { path: parseOrThrow(avatarSetSchema, body).path, actorId: user.id });
  }

  @Delete()
  remove(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser): Promise<StaffPhotoView> {
    return this.photos.remove({ kind: 'teacher', id }, user.id);
  }
}
