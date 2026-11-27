import { lessonFilesRoutes as routes } from '@ab/shared';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { LessonAssetsService } from './lesson-assets.service';
import { LessonFilesService } from './lesson-files.service';

/** recordings.read to look, recordings.manage to change; services keep a teacher to own lessons. */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('recordings.read')
@Controller()
export class LessonFilesController {
  constructor(
    @Inject(LessonAssetsService) private readonly assets: LessonAssetsService,
    @Inject(LessonFilesService) private readonly files: LessonFilesService,
  ) {}

  @Route(routes.list)
  list(@RouteInput() { params }: RouteInputOf<typeof routes.list>, @CurrentUser() user: AuthUser) {
    return this.assets.of({ user, lessonId: params.id });
  }

  @Route(routes.uploadUrl)
  @Permissions('recordings.manage')
  @HttpCode(200)
  uploadUrl(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.uploadUrl>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.uploadUrl({ user, id: params.id, file: body });
  }

  @Route(routes.register)
  @Permissions('recordings.manage')
  register(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.register>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.register({ user, id: params.id, file: body });
  }

  @Route(routes.visibility)
  @Permissions('recordings.manage')
  visibility(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.visibility>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.setVisible({ user, id: params.id, visible: body.visible });
  }

  @Route(routes.remove)
  @Permissions('recordings.manage')
  @HttpCode(204)
  async remove(
    @RouteInput() { params }: RouteInputOf<typeof routes.remove>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.files.remove({ user, id: params.id });
  }

  @Route(routes.url)
  @HttpCode(200)
  url(@RouteInput() { params }: RouteInputOf<typeof routes.url>, @CurrentUser() user: AuthUser) {
    return this.files.url({ user, id: params.id });
  }
}
