import {
  gifQuerySchema,
  stickerFavouriteSchema,
  threadGifSendSchema,
  threadStickerSendSchema,
  type GifList,
  type MessageView,
  type StickerList,
  type ThreadGifSend,
  type ThreadStickerSend,
} from '@ab/shared';
import { id } from '@ab/core';
import { Controller, Delete, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam, ZodQuery } from '@/common/http/zod-inputs';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import type { Sent } from '@/modules/messaging/inbox/send/outbox';
import { recordSend } from '@/modules/messaging/inbox/send/send-audit';
import { phoneParam } from '@/modules/messaging/inbox/threads/phone-param';
import { GifService } from './gif.service';
import { StickersService } from './stickers.service';
import { staffOnly } from './staff-only';

/** What a panel send needs: the staff member and the chat. */
interface PanelCall {
  user: AuthUser;
  raw: string;
}

type SendBase = Omit<Parameters<StickersService['send']>[0], 'input'>;

/** The audit's words and the send itself (a sticker or a GIF). */
interface PanelSend {
  action: string;
  name: string;
  run: (s: SendBase) => Promise<Sent>;
}

/**
 * The emoji panel's stickers and GIFs, the admin and sales only: GET
 * /threads/stickers (favourites, then the newest of any chat), PUT / DELETE …/favourites, GET
 * /threads/gifs?q= (GIPHY; `configured: false` until an admin adds the key), and POST
 * /threads/:phone/sticker | gif, audited as `thread_sticker` / `thread_gif`.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads')
export class StickersController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly stickers: StickersService,
    private readonly gifs: GifService,
    private readonly audit: AuditService,
  ) {}

  @Get('stickers')
  async list(@CurrentUser() user: AuthUser): Promise<StickerList> {
    await staffOnly(this.reads, user);
    return this.stickers.list(user.id);
  }

  @Put('stickers/favourites')
  @HttpCode(204)
  async favourite(
    @ZodBody(stickerFavouriteSchema) { messageId }: z.output<typeof stickerFavouriteSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await staffOnly(this.reads, user);
    await this.stickers.favourite({ profileId: user.id, messageId });
  }

  @Delete('stickers/favourites/:messageId')
  @HttpCode(204)
  async unfavourite(
    @ZodParam('messageId', id()) messageId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await staffOnly(this.reads, user);
    await this.stickers.unfavourite({ profileId: user.id, messageId });
  }

  @Get('gifs')
  async gifList(
    @ZodQuery(gifQuerySchema) { q }: z.output<typeof gifQuerySchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<GifList> {
    await staffOnly(this.reads, user);
    return this.gifs.list(q);
  }

  @Post(':phone/sticker')
  @HttpCode(201)
  @Permissions('inbox.send')
  sticker(
    @ZodParam('phone', z.string()) raw: string,
    @ZodBody(threadStickerSendSchema) input: ThreadStickerSend,
    @CurrentUser() user: AuthUser,
  ): Promise<MessageView> {
    const run = (s: SendBase) => this.stickers.send({ ...s, input });
    return this.send({ user, raw }, { action: 'thread_sticker', name: 'sticker.webp', run });
  }

  @Post(':phone/gif')
  @HttpCode(201)
  @Permissions('inbox.send')
  gif(
    @ZodParam('phone', z.string()) raw: string,
    @ZodBody(threadGifSendSchema) input: ThreadGifSend,
    @CurrentUser() user: AuthUser,
  ): Promise<MessageView> {
    const run = (s: SendBase) => this.gifs.send({ ...s, input });
    return this.send({ user, raw }, { action: 'thread_gif', name: 'gif.mp4', run });
  }

  /** A teacher is 403 files_forbidden before anything goes; a replay is audited once. */
  private async send(call: PanelCall, what: PanelSend): Promise<MessageView> {
    const { user } = call;
    const sales = await staffOnly(this.reads, user);
    const sent = await what.run({ phone: phoneParam(call.raw), actorId: user.id, sales });
    const media = { media_mime: sent.view.media_mime, media_name: what.name };
    return recordSend(this.audit, { sent, action: what.action, user, scope: null, sales, media });
  }
}
