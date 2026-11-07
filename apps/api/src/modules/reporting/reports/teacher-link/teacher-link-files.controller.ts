import {
  attachmentRegisterSchema,
  attachmentUploadSchema,
  type AttachmentRegister,
  type AttachmentUpload,
  type ReportAttachmentView,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import { Controller, Delete, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public } from '@/common/auth/decorators';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { TeacherLinkFiles } from './teacher-link.files';
import { TeacherLinkLimit } from './teacher-link.limit';

const tokenSchema = z.string().min(1).max(100);
const idSchema = z.uuid();

/**
 * The teacher's attachments on the no-login report page (owner 2026-11-06): ask for an upload
 * URL, PUT the file to Storage, register it; remove one; open one. Adding and removing close with
 * the edit window (409 edit_window_closed). Same link errors as the form (404 / 410 / 409 / 429).
 */
@ApiTags('reports')
@Public()
@UseGuards(TeacherLinkLimit)
@Controller('public/teacher-report/:token/reports/:id/attachments')
export class TeacherLinkFilesController {
  constructor(private readonly files: TeacherLinkFiles) {}

  @Post('upload-url')
  @HttpCode(200)
  uploadUrl(
    @ZodParam('token', tokenSchema) token: string,
    @ZodParam('id', idSchema) reportId: string,
    @ZodBody(attachmentUploadSchema) file: AttachmentUpload,
  ): Promise<SignedUpload> {
    return this.files.uploadUrl({ token, reportId, file });
  }

  @Post()
  register(
    @ZodParam('token', tokenSchema) token: string,
    @ZodParam('id', idSchema) reportId: string,
    @ZodBody(attachmentRegisterSchema) file: AttachmentRegister,
  ): Promise<ReportAttachmentView> {
    return this.files.register({ token, reportId, file });
  }

  @Delete(':attachmentId')
  @HttpCode(204)
  remove(
    @ZodParam('token', tokenSchema) token: string,
    @ZodParam('id', idSchema) reportId: string,
    @ZodParam('attachmentId', idSchema) attachmentId: string,
  ): Promise<void> {
    return this.files.remove({ token, reportId, attachmentId });
  }

  @Get(':attachmentId/url')
  url(
    @ZodParam('token', tokenSchema) token: string,
    @ZodParam('id', idSchema) reportId: string,
    @ZodParam('attachmentId', idSchema) attachmentId: string,
  ): Promise<SignedDownload> {
    return this.files.url({ token, reportId, attachmentId });
  }
}
