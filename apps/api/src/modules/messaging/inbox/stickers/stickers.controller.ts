import {
  stickerFavouriteSchema,
  threadStickerSendSchema,
  type MessageView,
  type StickerList,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { recordSend } from '@/modules/messaging/inbox/send/send-audit';
import { phoneParam } from '@/modules/messaging/inbox/threads/phone-param';
import { StickerSender } from './sticker-send.service';
import { StickersService } from './stickers.service';
import { staffOnly } from './staff-only';

/**
 * The sticker panel (owner 2026-11-01): GET /threads/stickers (this staff member's favourites,
 * then the newest of any chat), PUT / DELETE …/favourites («أضف إلى المفضلة» on a bubble), and
 * POST /threads/:phone/sticker (one of them, sent again; audited as `thread_sticker`).
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads')
export class StickersController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly stickers: StickersService,
    private readonly sender: StickerSender,
    private readonly audit: AuditService,
  ) {}

  @Get('stickers')
  async list(@CurrentUser() user: AuthUser): Promise<StickerList> {
    await staffOnly(this.reads, user);
    return this.stickers.list(user.id);
  }

  @Put('stickers/favourites')
  @HttpCode(204)
  async favourite(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    const { messageId } = parseOrThrow(stickerFavouriteSchema, body);
    await staffOnly(this.reads, user);
    await this.stickers.favourite({ profileId: user.id, messageId });
  }

  @Delete('stickers/favourites/:messageId')
  @HttpCode(204)
  async unfavourite(
    @Param('messageId', new ParseUUIDPipe()) messageId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await staffOnly(this.reads, user);
    await this.stickers.unfavourite({ profileId: user.id, messageId });
  }

  @Post(':phone/sticker')
  @HttpCode(201)
  @Permissions('inbox.send')
  async send(
    @Param('phone') raw: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<MessageView> {
    const input = parseOrThrow(threadStickerSendSchema, body);
    const sales = await staffOnly(this.reads, user);
    const sent = await this.sender.send({ phone: phoneParam(raw), input, actorId: user.id, sales });
    const media = { media_mime: sent.view.media_mime, media_name: 'sticker' };
    return recordSend(this.audit, { sent, action: 'thread_sticker', user, scope: null, sales, media });
  }
}
