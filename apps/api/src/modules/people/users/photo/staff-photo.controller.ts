import {
  teacherPhotoRoutes as teacher,
  userPhotoRoutes as user,
  type SignedUpload,
  type StaffPhotoView,
} from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { StaffPhotoAdmin } from '@/common/storage/avatars/staff-photo-admin';
import { UserAccess } from '@/modules/people/users/users.access';
import { assertMayTouch } from '@/modules/people/users/users.rules';

/** Same upload flow as self photos; users.write and the usual login rules; staff only. */
@ApiBearerAuth()
@Controller()
export class StaffPhotoController {
  constructor(
    private readonly photos: StaffPhotoAdmin,
    private readonly access: UserAccess,
  ) {}

  @Route(teacher.uploadUrl)
  teacherUploadUrl(
    @RouteInput() { params, body }: RouteInputOf<typeof teacher.uploadUrl>,
  ): Promise<SignedUpload> {
    return this.photos.uploadUrl({ kind: 'teacher', id: params.id }, body);
  }

  @Route(teacher.set)
  teacherSet(
    @RouteInput() { params, body }: RouteInputOf<typeof teacher.set>,
    @CurrentUser() actor: AuthUser,
  ): Promise<StaffPhotoView> {
    const who = { kind: 'teacher', id: params.id } as const;
    return this.photos.set(who, { path: body.path, actorId: actor.id });
  }

  @Route(teacher.remove)
  teacherRemove(
    @RouteInput() { params }: RouteInputOf<typeof teacher.remove>,
    @CurrentUser() actor: AuthUser,
  ): Promise<StaffPhotoView> {
    return this.photos.remove({ kind: 'teacher', id: params.id }, actor.id);
  }

  @Route(user.uploadUrl)
  async userUploadUrl(
    @RouteInput() { params, body }: RouteInputOf<typeof user.uploadUrl>,
    @CurrentUser() actor: AuthUser,
  ): Promise<SignedUpload> {
    await this.mayTouch(params.id, actor);
    return this.photos.uploadUrl({ kind: 'user', id: params.id }, body);
  }

  @Route(user.set)
  async userSet(
    @RouteInput() { params, body }: RouteInputOf<typeof user.set>,
    @CurrentUser() actor: AuthUser,
  ): Promise<StaffPhotoView> {
    await this.mayTouch(params.id, actor);
    return this.photos.set({ kind: 'user', id: params.id }, { path: body.path, actorId: actor.id });
  }

  @Route(user.remove)
  async userRemove(
    @RouteInput() { params }: RouteInputOf<typeof user.remove>,
    @CurrentUser() actor: AuthUser,
  ): Promise<StaffPhotoView> {
    await this.mayTouch(params.id, actor);
    return this.photos.remove({ kind: 'user', id: params.id }, actor.id);
  }

  private async mayTouch(id: string, actor: AuthUser): Promise<void> {
    const { state, target } = await this.access.target(id);
    assertMayTouch({ id: actor.id, permissions: actor.permissions ?? [] }, state, target);
  }
}
