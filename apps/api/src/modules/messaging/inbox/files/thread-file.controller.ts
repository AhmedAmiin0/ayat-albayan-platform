import { PDF_PREVIEW_PAGES, type ThreadFile, type ThreadPdfPage } from '@ab/shared';
import {
  type ArgumentMetadata,
  Controller,
  Get,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { ZodParams, ZodQuery } from '@/common/http/zod-inputs';
import { phoneParam } from '@/modules/messaging/inbox/threads/phone-param';
import { PdfPreviewService } from './pdf/pdf-preview.service';
import { ThreadMediaService } from './thread-media.service';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { httpError } from '@/common/http/errors';

const uuid = new ParseUUIDPipe();
const pageSchema = z.coerce.number().int().min(1).max(PDF_PREVIEW_PAGES);
/** Checked in order by `target` (invalid_phone, then the id, then the page): their own 400s. */
const fileParams = z.object({ phone: z.string(), messageId: z.string() });
const pdfParams = fileParams.extend({ page: z.string() });
const fileQuery = z.object({ download: z.string().optional() });
type Params = z.output<typeof fileParams>;

/** W6 (docs/20, docs/21): a teacher gets 403 since teachers never see payment proofs. */
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
    @ZodParams(fileParams) params: Params,
    @CurrentUser() user: AuthUser,
    @ZodQuery(fileQuery) query: z.output<typeof fileQuery>,
  ): Promise<ThreadFile> {
    const target = await this.target(params);
    await this.allow(user);
    return this.media.bubbleFile({ ...target, download: query.download === '1' });
  }

  /**
   * Page 1..30 of a chat PDF as a signed JPEG, with its page count and size; page 1 is the bubble's
   * thumb.
   */
  @Get(':phone/messages/:messageId/pdf/:page')
  async pdf(
    @ZodParams(pdfParams) params: z.output<typeof pdfParams>,
    @CurrentUser() user: AuthUser,
  ): Promise<ThreadPdfPage> {
    const target = await this.target(params);
    const page = parseOrThrow(pageSchema, params.page);
    await this.allow(user);
    return this.pdfs.page({ ...target, page });
  }

  /** 400 invalid_phone or a bad message id, before anything is read. */
  private async target(params: Params): Promise<{ phone: string; messageId: string }> {
    const phone = phoneParam(params.phone);
    const at: ArgumentMetadata = { type: 'param', data: 'messageId' };
    const messageId = await uuid.transform(params.messageId, at);
    return { phone, messageId };
  }

  /**
   * Admin and sales (SalesScope: every chat) pass; a teacher, even of this family, is 403
   * media_forbidden.
   */
  private async allow(user: AuthUser): Promise<void> {
    const sales = await this.reads.salesScope(user);
    if (!sales && (await this.reads.scope(user)))
      throw httpError(HttpStatus.FORBIDDEN, 'media_forbidden');
  }
}
