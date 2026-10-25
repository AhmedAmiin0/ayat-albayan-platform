import { threadFileSendSchema, threadFileUploadSchema, type MessageView, type SignedUpload } from '@ab/shared';
import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../common/audit/audit.service';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import type { SalesScope } from '../sales/sales-scope';
import { parseOrThrow } from '../../common/http/http';
import { waHttpError } from '../whatsapp/templates/catalog/template.mapper';
import { phoneParam } from './phone-param';
import { recordSend } from './send-audit';
import { ThreadFileSender } from './thread-file-send.service';
import { ThreadReads } from './thread-reads';

/**
 * Owner 2026-10-19 #2: the admin and a salesperson send a JPEG/PNG image or a PDF from the chat
 * (R-MSG-05). First a signed upload URL (the browser PUTs the file), then the send, audited as
 * `thread_file` under the sender. A teacher (TeacherScope) gets 403 files_forbidden (owner #5).
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads')
export class ThreadFileSendController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly files: ThreadFileSender,
    private readonly audit: AuditService,
  ) {}

  @Post(':phone/file-upload-url')
  @HttpCode(201)
  @Permissions('inbox.send')
  async uploadUrl(@Param('phone') raw: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SignedUpload> {
    const input = parseOrThrow(threadFileUploadSchema, body);
    const sales = await this.sender(user);
    return this.files.uploadUrl({ phone: phoneParam(raw), input, actorId: user.id, sales });
  }

  @Post(':phone/file')
  @HttpCode(201)
  @Permissions('inbox.send')
  async send(@Param('phone') raw: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<MessageView> {
    const input = parseOrThrow(threadFileSendSchema, body);
    const sales = await this.sender(user);
    const sent = await this.files.send({ phone: phoneParam(raw), input, actorId: user.id, sales });
    const media = { media_mime: sent.view.media_mime, media_name: input.filename };
    return recordSend(this.audit, { sent, action: 'thread_file', user, scope: null, sales, media });
  }

  /** A salesperson (her SalesScope) or the admin (null); a teacher never sends files. */
  private async sender(user: AuthUser): Promise<SalesScope | null> {
    const sales = await this.reads.salesScope(user);
    if (!sales && (await this.reads.scope(user))) throw waHttpError('files_forbidden', HttpStatus.FORBIDDEN);
    return sales;
  }
}
