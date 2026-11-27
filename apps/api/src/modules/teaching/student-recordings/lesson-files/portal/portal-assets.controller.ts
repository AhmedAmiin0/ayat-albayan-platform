import { portalAssetsRoutes as routes } from '@ab/shared';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { PortalAssetsService } from './portal-assets.service';

/** Family portal recordings and lesson files: same scope key as PortalController. */
@ApiTags('portal')
@ApiBearerAuth()
@Permissions('self.portal')
@Controller()
export class PortalAssetsController {
  constructor(@Inject(PortalAssetsService) private readonly assets: PortalAssetsService) {}

  @Route(routes.recordings)
  recordings(
    @RouteInput() { params }: RouteInputOf<typeof routes.recordings>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assets.recordings({ user, studentId: params.id });
  }

  /** The family's lesson page: the report's id, the recording(s) and the visible files. */
  @Route(routes.lesson)
  lesson(
    @RouteInput() { params }: RouteInputOf<typeof routes.lesson>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assets.lesson({ user, studentId: params.id, lessonId: params.lessonId });
  }

  /** ?download=<name> makes the link save the file under that name instead of showing it. */
  @Route(routes.fileUrl)
  @HttpCode(200)
  fileUrl(
    @RouteInput() { params, query }: RouteInputOf<typeof routes.fileUrl>,
    @CurrentUser() user: AuthUser,
  ) {
    const { id: studentId, fileId } = params;
    return this.assets.fileUrl({ user, studentId, fileId, download: query.download });
  }
}
