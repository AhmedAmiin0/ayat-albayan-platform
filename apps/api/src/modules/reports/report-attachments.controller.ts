import {
  attachmentRegisterSchema,
  attachmentUploadSchema,
  type ReportAttachmentView,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { ReportFilesService } from './report-files.service';

/**
 * Report attachments through signed URLs (docs/11 §4 R7–R10; R-REP-02): ask for an upload URL,
 * PUT the file to Storage, register the path. Changes need canEditReport (409 edit_window_closed).
 */
@ApiTags('reports')
@ApiBearerAuth()
@Roles('admin', 'teacher')
@Controller('reports/:id/attachments')
export class ReportAttachmentsController {
  constructor(private readonly files: ReportFilesService) {}

  /** R7: 400 validation_failed (attachment_type / attachment_too_large). */
  @Post('upload-url')
  @HttpCode(200)
  uploadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.files.uploadUrl({ id, user, file: parseOrThrow(attachmentUploadSchema, body) });
  }

  /** R8: 400 attachment_path when the path is not this report's or was never uploaded. */
  @Post()
  register(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportAttachmentView> {
    return this.files.register({ id, user, file: parseOrThrow(attachmentRegisterSchema, body) });
  }

  /** R9: the row and the stored object. */
  @Delete(':attachmentId')
  @HttpCode(204)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.files.remove({ id, attachmentId, user });
  }

  /** R10: 1 h signed download URL. */
  @Get(':attachmentId/url')
  url(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('attachmentId', ParseUUIDPipe) attachmentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedDownload> {
    return this.files.attachmentUrl({ id, attachmentId, user });
  }
}
