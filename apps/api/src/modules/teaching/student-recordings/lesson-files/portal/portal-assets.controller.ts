import type { PortalFileUrl, PortalLessonAssets, PortalRecordings } from '@ab/shared';
import { Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodParam } from '@/common/http/zod-inputs';
import { PortalAssetsService } from './portal-assets.service';

/** «التسجيلات» and «ملفات الحلقة» of the family portal: same scope key as PortalController. */
@ApiTags('portal')
@ApiBearerAuth()
@Permissions('self.portal')
@Controller('portal/students/:id')
export class PortalAssetsController {
  constructor(@Inject(PortalAssetsService) private readonly assets: PortalAssetsService) {}

  @Get('recordings')
  recordings(
    @ZodParam('id', z.uuid()) studentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalRecordings> {
    return this.assets.recordings({ user, studentId });
  }

  /** The family's lesson page: the report's id, the recording(s) and the visible files. */
  @Get('lessons/:lessonId/files')
  lesson(
    @ZodParam('id', z.uuid()) studentId: string,
    @ZodParam('lessonId', z.uuid()) lessonId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalLessonAssets> {
    return this.assets.lesson({ user, studentId, lessonId });
  }

  @Post('lesson-files/:fileId/url')
  @HttpCode(200)
  fileUrl(
    @ZodParam('id', z.uuid()) studentId: string,
    @ZodParam('fileId', z.uuid()) fileId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalFileUrl> {
    return this.assets.fileUrl({ user, studentId, fileId });
  }
}
