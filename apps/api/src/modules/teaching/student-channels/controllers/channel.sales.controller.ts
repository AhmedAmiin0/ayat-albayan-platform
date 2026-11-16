import {
  channelPostSchema,
  channelReadSchema,
  type ChannelMessageView,
  type ChannelPost,
  type ChannelUnread,
} from '@ab/shared';
import { Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import { ChannelService } from '@/modules/teaching/student-channels/channel.service';

const id = z.uuid();

/**
 * The owning assistant writes in her students' chats (owner 2026-11-16 «yes it can write also»,
 * docs/31 §2): sends, read marks and her unread count, as the teacher and the family do. Her page
 * stays GET …/messages (MonitorChannelController); another assistant's student is 404.
 */
@ApiTags('student-channels')
@ApiBearerAuth()
@Permissions('self.sales')
@Controller('sales/students/:id/channel')
export class SalesChannelController {
  constructor(
    @Inject(ChannelAccess) private readonly access: ChannelAccess,
    @Inject(ChannelService) private readonly channels: ChannelService,
  ) {}

  @Post('messages')
  async post(
    @ZodParam('id', id) studentId: string,
    @ZodBody(channelPostSchema) body: ChannelPost,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    return this.channels.post(await this.access.owner(user, studentId), body.body);
  }

  @Post('read')
  @HttpCode(204)
  async read(
    @ZodParam('id', id) studentId: string,
    @ZodBody(channelReadSchema, { orEmpty: true }) body: z.output<typeof channelReadSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.channels.read(await this.access.owner(user, studentId), body.at);
  }

  @Get('unread')
  async unread(
    @ZodParam('id', id) studentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelUnread> {
    return this.channels.unread(await this.access.owner(user, studentId));
  }
}
