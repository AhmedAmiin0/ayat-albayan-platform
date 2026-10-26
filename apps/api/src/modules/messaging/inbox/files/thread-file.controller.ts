import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { waHttpError } from '../../whatsapp/templates/catalog/template.mapper';
import { phoneParam } from '../threads/phone-param';
import { ThreadMediaService, type ThreadFile } from './thread-media.service';
import { ThreadReads } from '../reads/thread-reads';

const uuid = new ParseUUIDPipe();

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
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads')
export class ThreadFileController {
  constructor(
    private readonly media: ThreadMediaService,
    private readonly reads: ThreadReads,
  ) {}

  /** The file as a signed URL of our own copy (downloaded from WhatsApp on first use). */
  @Get(':phone/messages/:messageId/file')
  async file(
    // One @Param() object: a 4th parameter for ?download would break max-params (rule 2).
    @Param() params: Record<string, string | undefined>,
    @CurrentUser() user: AuthUser,
    @Query('download') download?: string,
  ): Promise<ThreadFile> {
    const phone = phoneParam(params['phone'] ?? '');
    const messageId = await uuid.transform(params['messageId'] ?? '', { type: 'param', data: 'messageId' });
    const sales = await this.reads.salesScope(user);
    if (!sales && (await this.reads.scope(user))) throw waHttpError('media_forbidden', HttpStatus.FORBIDDEN);
    return this.media.bubbleFile({ phone, messageId, download: download === '1' });
  }
}
