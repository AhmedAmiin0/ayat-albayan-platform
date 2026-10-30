import { PDF_PREVIEW_PAGES, type ThreadPdfPage } from '@ab/shared';
import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { waHttpError } from '../../whatsapp/templates/catalog/template.mapper';
import { phoneParam } from '../threads/phone-param';
import { PdfPreviewService } from './pdf/pdf-preview.service';
import { ThreadMediaService, type ThreadFile } from './thread-media.service';
import { ThreadReads } from '../reads/thread-reads';

const uuid = new ParseUUIDPipe();
type Params = Record<string, string | undefined>;
const pageSchema = z.coerce.number().int().min(1).max(PDF_PREVIEW_PAGES);

/**
 * W6 (docs/20, docs/16 row 1b; docs/21 D1/D2): a file inside a chat bubble, for whoever reads the
 * inbox: a family's photo, PDF, voice note or video (CHAT_VIEW_MIMES), or a file staff sent. Not in
 * ThreadMediaController, whose class-level inbox.media keeps the «من الشات» picker admin only (and
 * images / PDFs only). The admin and a salesperson (SalesScope) get the file; a teacher
 * (TeacherScope) still gets 403 media_forbidden (owner: a teacher never sees a payment proof).
 * Errors come from ThreadMediaService.bubbleFile / InboundMedia: 404 message_not_found (unknown, or
 * another phone's message), 400 invoice_message (an inbound type a bubble cannot open), 410
 * media_expired (WhatsApp no longer has it, or a sent row with no stored file), 413 invoice_too_large.
 * `?download=1` («تنزيل», owner 2026-10-26): the same file and the same rules, signed to save under its name.
 * `pdf/:page` (owner 2026-10-29, PdfPreviewService): one page of the same PDF as an image, under the
 * same rules (target + allow), so the preview can never show what the file route refuses.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads')
export class ThreadFileController {
  constructor(
    private readonly media: ThreadMediaService,
    private readonly reads: ThreadReads,
    private readonly pdfs: PdfPreviewService,
  ) {}

  /** The file as a signed URL of our own copy (downloaded from WhatsApp on first use). */
  @Get(':phone/messages/:messageId/file')
  async file(
    // One @Param() object: a 4th parameter for ?download would break max-params (rule 2).
    @Param() params: Params,
    @CurrentUser() user: AuthUser,
    @Query('download') download?: string,
  ): Promise<ThreadFile> {
    const target = await this.target(params);
    await this.allow(user);
    return this.media.bubbleFile({ ...target, download: download === '1' });
  }

  /** Page 1..30 of a chat PDF as a signed JPEG, with its page count and size; page 1 is the bubble's thumb. */
  @Get(':phone/messages/:messageId/pdf/:page')
  async pdf(@Param() params: Params, @CurrentUser() user: AuthUser): Promise<ThreadPdfPage> {
    const target = await this.target(params);
    const page = parseOrThrow(pageSchema, params['page']);
    await this.allow(user);
    return this.pdfs.page({ ...target, page });
  }

  /** 400 invalid_phone or a bad message id, before anything is read. */
  private async target(params: Params): Promise<{ phone: string; messageId: string }> {
    const phone = phoneParam(params['phone'] ?? '');
    const messageId = await uuid.transform(params['messageId'] ?? '', { type: 'param', data: 'messageId' });
    return { phone, messageId };
  }

  /** Admin and sales (SalesScope: every chat) pass; a teacher, even of this family, is 403 media_forbidden. */
  private async allow(user: AuthUser): Promise<void> {
    const sales = await this.reads.salesScope(user);
    if (!sales && (await this.reads.scope(user))) throw waHttpError('media_forbidden', HttpStatus.FORBIDDEN);
  }
}
