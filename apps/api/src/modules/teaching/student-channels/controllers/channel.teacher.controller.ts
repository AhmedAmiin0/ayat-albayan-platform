import {
  channelPostSchema,
  channelReadSchema,
  type ChannelMessageView,
  type ChannelPage,
  type TeacherChannelRow,
} from '@ab/shared';
import { Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodBody } from '@/common/http/zod-inputs';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import {
  ChannelService,
  TeacherChannelList,
} from '@/modules/teaching/student-channels/channel.service';
import { pageFor } from './channel-page';
import { UuidParam } from '@/common/http/uuid-param';

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
  async messages(
    @UuidParam('studentId') studentId: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPage> {
    return pageFor(this.channels, await this.access.teacher(user, studentId), query);
  }

  @Post(':studentId/messages')
  async post(
    @UuidParam('studentId') studentId: string,
    @ZodBody(channelPostSchema) body: z.output<typeof channelPostSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    return this.channels.post(await this.access.teacher(user, studentId), body.body);
  }

  @Post(':studentId/read')
  @HttpCode(204)
  async read(
    @UuidParam('studentId') studentId: string,
    @ZodBody(channelReadSchema, { orEmpty: true }) body: z.output<typeof channelReadSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.channels.read(await this.access.teacher(user, studentId), body.at);
  }
}
