import {
  lessonFileRegisterSchema,
  lessonFileUploadSchema,
  lessonFileVisibilitySchema,
  type LessonAssets,
  type LessonFileRegister,
  type LessonFileUpload,
  type LessonFileView,
  type LessonFileVisibility,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import { Controller, Delete, Get, HttpCode, Inject, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { LessonAssetsService } from './lesson-assets.service';
import { LessonFilesService } from './lesson-files.service';

const ID = z.uuid();

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

  @Get('lessons/:id/files')
  list(@ZodParam('id', ID) lessonId: string, @CurrentUser() user: AuthUser): Promise<LessonAssets> {
    return this.assets.of({ user, lessonId });
  }

  @Post('lessons/:id/files/upload-url')
  @Permissions('recordings.manage')
  @HttpCode(200)
  uploadUrl(
    @ZodParam('id', ID) id: string,
    @ZodBody(lessonFileUploadSchema) file: LessonFileUpload,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.files.uploadUrl({ user, id, file });
  }

  @Post('lessons/:id/files')
  @Permissions('recordings.manage')
  register(
    @ZodParam('id', ID) id: string,
    @ZodBody(lessonFileRegisterSchema) file: LessonFileRegister,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonFileView> {
    return this.files.register({ user, id, file });
  }

  @Patch('lesson-files/:id/visibility')
  @Permissions('recordings.manage')
  visibility(
    @ZodParam('id', ID) id: string,
    @ZodBody(lessonFileVisibilitySchema) body: LessonFileVisibility,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonFileView> {
    return this.files.setVisible({ user, id, visible: body.visible });
  }

  @Delete('lesson-files/:id')
  @Permissions('recordings.manage')
  @HttpCode(204)
  async remove(@ZodParam('id', ID) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.files.remove({ user, id });
  }

  @Post('lesson-files/:id/url')
  @HttpCode(200)
  url(@ZodParam('id', ID) id: string, @CurrentUser() user: AuthUser): Promise<SignedDownload> {
    return this.files.url({ user, id });
  }
}
