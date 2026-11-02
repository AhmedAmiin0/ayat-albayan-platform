import {
  channelPostSchema,
  channelReadSchema,
  type ChannelMessageView,
  type ChannelPage,
  type ChannelUnread,
} from '@ab/shared';
import { Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import { ChannelService } from '@/modules/teaching/student-channels/channel.service';
import { pageFor } from './channel-page';
import { UuidParam } from '@/common/http/uuid-param';

/** The portal's «المحادثة مع المعلم/ة» (docs/31 §2): the guardian or the student, for their own student only. */
@ApiTags('student-channels')
@ApiBearerAuth()
@Permissions('self.portal')
@Controller('portal/students/:id/channel')
export class PortalChannelController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly channels: ChannelService,
  ) {}

  @Get('messages')
  async messages(
    @UuidParam('id') studentId: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPage> {
    return pageFor(this.channels, await this.access.family(user, studentId), query);
  }

  @Post('messages')
  async post(
    @UuidParam('id') studentId: string,
    @ZodBody(channelPostSchema) body: z.output<typeof channelPostSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    return this.channels.post(await this.access.family(user, studentId), body.body);
  }

  @Post('read')
  @HttpCode(204)
  async read(
    @UuidParam('id') studentId: string,
    @ZodBody(channelReadSchema, { orEmpty: true }) body: z.output<typeof channelReadSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.channels.read(await this.access.family(user, studentId), body.at);
  }

  @Get('unread')
  async unread(
    @UuidParam('id') studentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelUnread> {
    return this.channels.unread(await this.access.family(user, studentId));
  }
}
