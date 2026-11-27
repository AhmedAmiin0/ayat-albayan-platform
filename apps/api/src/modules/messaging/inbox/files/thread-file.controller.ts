import { phoneE164 } from '@ab/core';
import { chatFileRoutes as routes, type ThreadFile, type ThreadPdfPage } from '@ab/shared';
import { Controller, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { httpError } from '@/common/http/errors';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ZodParam } from '@/common/http/zod-inputs';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { PdfPreviewService } from './pdf/pdf-preview.service';
import { ThreadMediaService } from './thread-media.service';

// W6 (docs/20, docs/21): a teacher gets 403 since teachers never see payment proofs. The phone is
// read on its own, and last, so a bad phone answers 400 invalid_phone before the rest is checked
// (Nest runs the later param's pipe first); a bad id or page is the 400 envelope.

const wantsDownload = (query: { download?: string }): boolean => query.download === '1';

@ApiBearerAuth()
@Controller()
export class ThreadFileController {
  constructor(
    private readonly media: ThreadMediaService,
    private readonly reads: ThreadReads,
    private readonly pdfs: PdfPreviewService,
  ) {}

  /** The file as a signed URL of our own copy (downloaded from WhatsApp on first use). */
  @Route(routes.file)
  async file(
    @RouteInput() { params, query }: RouteInputOf<typeof routes.file>,
    @CurrentUser() user: AuthUser,
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
  ): Promise<ThreadFile> {
    await this.allow(user);
    const download = wantsDownload(query);
    return this.media.bubbleFile({ phone, messageId: params.messageId, download });
  }

  /** Page 1..30 of a chat PDF as a signed JPEG, with its page count and size. */
  @Route(routes.pdfPage)
  async pdf(
    @RouteInput() { params }: RouteInputOf<typeof routes.pdfPage>,
    @CurrentUser() user: AuthUser,
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
  ): Promise<ThreadPdfPage> {
    await this.allow(user);
    return this.pdfs.page({ phone, messageId: params.messageId, page: params.page });
  }

  /** Admin and sales (every chat) pass; a teacher, even of this family, is 403 media_forbidden. */
  private async allow(user: AuthUser): Promise<void> {
    const sales = await this.reads.salesScope(user);
    if (!sales && (await this.reads.scope(user))) {
      throw httpError(HttpStatus.FORBIDDEN, 'media_forbidden');
    }
  }
}
