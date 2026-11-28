import { chatFileSendRoutes as routes, type MessageView, type SignedUpload } from '@ab/shared';
import { Controller, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import type { SalesScope } from '@/modules/sales/sales/sales-scope';
import { Route, type RouteInputOf } from '@/common/http/route';
import { ZodBody } from '@/common/http/zod-inputs';
import { phoneParam } from '@/modules/messaging/inbox/threads/phone-param';
import { recordSend } from '@/modules/messaging/inbox/send/send-audit';
import { ThreadFileSender } from './thread-file-send.service';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { httpError } from '@/common/http/errors';

/**
 * The admin and a salesperson send a JPEG/PNG image or a PDF from the chat
 * (R-MSG-05). First a signed upload URL (the browser PUTs the file), then the send, audited as
 * `thread_file` under the sender. A teacher (TeacherScope) gets 403 files_forbidden, read before
 * the phone so it still wins over a bad phone.
 */
@ApiBearerAuth()
@Controller()
export class ThreadFileSendController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly files: ThreadFileSender,
    private readonly audit: AuditService,
  ) {}

  @Route(routes.uploadUrl)
  @HttpCode(201)
  async uploadUrl(
    @Param('phone') raw: string,
    @ZodBody(routes.uploadUrl.body) input: RouteInputOf<typeof routes.uploadUrl>['body'],
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    const sales = await this.sender(user);
    return this.files.uploadUrl({ phone: phoneParam(raw), input, actorId: user.id, sales });
  }

  @Route(routes.send)
  @HttpCode(201)
  async send(
    @Param('phone') raw: string,
    @ZodBody(routes.send.body) input: RouteInputOf<typeof routes.send>['body'],
    @CurrentUser() user: AuthUser,
  ): Promise<MessageView> {
    const sales = await this.sender(user);
    const sent = await this.files.send({ phone: phoneParam(raw), input, actorId: user.id, sales });
    const media = { media_mime: sent.view.media_mime, media_name: input.filename };
    return recordSend(this.audit, { sent, action: 'thread_file', user, scope: null, sales, media });
  }

  /** A salesperson (her SalesScope) or the admin (null); a teacher never sends files. */
  private async sender(user: AuthUser): Promise<SalesScope | null> {
    const sales = await this.reads.salesScope(user);
    if (!sales && (await this.reads.scope(user)))
      throw httpError(HttpStatus.FORBIDDEN, 'files_forbidden');
    return sales;
  }
}
