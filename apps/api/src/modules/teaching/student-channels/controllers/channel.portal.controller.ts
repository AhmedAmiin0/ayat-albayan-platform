import { channelPostSchema, channelReadSchema, type ChannelMessageView, type ChannelPage, type ChannelUnread } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { ChannelAccess } from '../channel-access';
import { ChannelService } from '../channel.service';
import { pageFor } from './channel-page';

const UUID = new ParseUUIDPipe();

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
  async messages(@Param('id', UUID) studentId: string, @Query() query: unknown, @CurrentUser() user: AuthUser): Promise<ChannelPage> {
    return pageFor(this.channels, await this.access.family(user, studentId), query);
  }

  @Post('messages')
  async post(@Param('id', UUID) studentId: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ChannelMessageView> {
    const { body: text } = parseOrThrow(channelPostSchema, body);
    return this.channels.post(await this.access.family(user, studentId), text);
  }

  @Post('read')
  @HttpCode(204)
  async read(@Param('id', UUID) studentId: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    const { at } = parseOrThrow(channelReadSchema, body ?? {});
    await this.channels.read(await this.access.family(user, studentId), at);
  }

  @Get('unread')
  async unread(@Param('id', UUID) studentId: string, @CurrentUser() user: AuthUser): Promise<ChannelUnread> {
    return this.channels.unread(await this.access.family(user, studentId));
  }
}
