import {
  reportAttachmentRoutes as routes,
  type ReportAttachmentView,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ReportFilesService } from './report-files.service';

type Input<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/**
 * Report attachments through signed URLs (docs/11 §4 R7–R10; R-REP-02): ask for an upload URL,
 * PUT the file to Storage, register the path. Changes need canEditReport (409 edit_window_closed).
 */
@ApiBearerAuth()
@Controller()
export class ReportAttachmentsController {
  constructor(private readonly files: ReportFilesService) {}

  @Route(routes.uploadUrl)
  @HttpCode(200)
  uploadUrl(
    @RouteInput() { params, body }: Input<'uploadUrl'>,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.files.uploadUrl({ id: params.id, user, file: body });
  }

  @Route(routes.register)
  register(
    @RouteInput() { params, body }: Input<'register'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportAttachmentView> {
    return this.files.register({ id: params.id, user, file: body });
  }

  @Route(routes.remove)
  @HttpCode(204)
  remove(@RouteInput() { params }: Input<'remove'>, @CurrentUser() user: AuthUser): Promise<void> {
    return this.files.remove({ ...params, user });
  }

  @Route(routes.url)
  url(
    @RouteInput() { params }: Input<'url'>,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedDownload> {
    return this.files.attachmentUrl({ ...params, user });
  }
}
