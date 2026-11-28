import { chatFileRoutes as routes, type ThreadFile, type ThreadPdfPage } from '@ab/shared';
import { Controller, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { httpError } from '@/common/http/errors';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { PdfPreviewService } from './pdf/pdf-preview.service';
import { ThreadMediaService } from './thread-media.service';

// W6 (docs/20, docs/21): a teacher gets 403 since teachers never see payment proofs. A bad phone
// answers 400 invalid_phone before the other params are checked; a bad id or page is the 400
// envelope.

const phoneFirst = { paramErrors: [{ name: 'phone', fail: invalidPhone }] };

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
    @RouteInput(phoneFirst) { params, query }: RouteInputOf<typeof routes.file>,
    @CurrentUser() user: AuthUser,
  ): Promise<ThreadFile> {
    await this.allow(user);
    return this.media.bubbleFile({ ...params, download: wantsDownload(query) });
  }

  /** Page 1..30 of a chat PDF as a signed JPEG, with its page count and size. */
  @Route(routes.pdfPage)
  async pdf(
    @RouteInput(phoneFirst) { params }: RouteInputOf<typeof routes.pdfPage>,
    @CurrentUser() user: AuthUser,
  ): Promise<ThreadPdfPage> {
    await this.allow(user);
    return this.pdfs.page(params);
  }

  /** Admin and sales (every chat) pass; a teacher, even of this family, is 403 media_forbidden. */
  private async allow(user: AuthUser): Promise<void> {
    const sales = await this.reads.salesScope(user);
    if (!sales && (await this.reads.scope(user))) {
      throw httpError(HttpStatus.FORBIDDEN, 'media_forbidden');
    }
  }
}
