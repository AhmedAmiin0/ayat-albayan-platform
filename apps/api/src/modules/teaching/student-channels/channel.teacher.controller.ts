import { channelPageQuerySchema, channelPostSchema, type ChannelMessageView, type ChannelPage, type TeacherChannelRow } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { ChannelAccess } from './channel-access';
import { ChannelService, TeacherChannelList } from './channel.service';

const UUID = new ParseUUIDPipe();

/** «رسائل الطلاب» (docs/31 §2): the teacher's channels with the families of their current students. */
@ApiTags('student-channels')
@ApiBearerAuth()
@Permissions('self.teacher')
@Controller('teachers/me/channels')
export class TeacherChannelsController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly channels: ChannelService,
    private readonly list: TeacherChannelList,
  ) {}

  @Get()
  mine(@CurrentUser() user: AuthUser): Promise<TeacherChannelRow[]> {
    return this.list.list(user);
  }

  /** 404 student_not_found when the student is not (or no longer) one of mine. */
  @Get(':studentId/messages')
  async messages(@Param('studentId', UUID) studentId: string, @Query() query: unknown, @CurrentUser() user: AuthUser): Promise<ChannelPage> {
    const { before } = parseOrThrow(channelPageQuerySchema, query ?? {});
    return this.channels.page(await this.access.teacher(user, studentId), before);
  }

  @Post(':studentId/messages')
  async post(@Param('studentId', UUID) studentId: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ChannelMessageView> {
    const { body: text } = parseOrThrow(channelPostSchema, body);
    return this.channels.post(await this.access.teacher(user, studentId), text);
  }

  @Post(':studentId/read')
  @HttpCode(204)
  async read(@Param('studentId', UUID) studentId: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.channels.read(await this.access.teacher(user, studentId));
  }
}
