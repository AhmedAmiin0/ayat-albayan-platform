import { gifQuerySchema, threadGifSendSchema, type GifList, type MessageView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { recordSend } from '@/modules/messaging/inbox/send/send-audit';
import { phoneParam } from '@/modules/messaging/inbox/threads/phone-param';
import { GifService } from './gif.service';
import { staffOnly } from './staff-only';

/**
 * The GIF tab (owner 2026-11-01): GET /threads/gifs?q= (GIPHY's search, or trending without q;
 * `configured: false` until an admin adds the key) and POST /threads/:phone/gif (one GIF, sent as a
 * WhatsApp video; audited as `thread_gif`).
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads')
export class GifsController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly gifs: GifService,
    private readonly audit: AuditService,
  ) {}

  @Get('gifs')
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<GifList> {
    const { q } = parseOrThrow(gifQuerySchema, query);
    await staffOnly(this.reads, user);
    return this.gifs.list(q);
  }

  @Post(':phone/gif')
  @HttpCode(201)
  @Permissions('inbox.send')
  async send(
    @Param('phone') raw: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<MessageView> {
    const input = parseOrThrow(threadGifSendSchema, body);
    const sales = await staffOnly(this.reads, user);
    const sent = await this.gifs.send({ phone: phoneParam(raw), input, actorId: user.id, sales });
    const media = { media_mime: sent.view.media_mime, media_name: 'gif.mp4' };
    return recordSend(this.audit, { sent, action: 'thread_gif', user, scope: null, sales, media });
  }
}
