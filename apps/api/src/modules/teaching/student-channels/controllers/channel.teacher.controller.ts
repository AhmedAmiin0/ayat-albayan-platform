import {
  channelPostSchema,
  channelReadSchema,
  type ChannelMessageView,
  type ChannelPage,
  type TeacherChannelRow,
} from '@ab/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import {
  ChannelService,
  TeacherChannelList,
} from '@/modules/teaching/student-channels/channel.service';
import { pageFor } from './channel-page';
import { messageParams } from './channel-message-params';
import { ChannelEdits } from '@/modules/teaching/student-channels/channel-edits.service';

const UUID = new ParseUUIDPipe();

/**
 * «رسائل الطلاب» (docs/31 §2): the teacher's channels with the families of their current students.
 */
@ApiTags('student-channels')
@ApiBearerAuth()
@Permissions('self.teacher')
@Controller('teachers/me/channels')
export class TeacherChannelsController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly channels: ChannelService,
    private readonly edits: ChannelEdits,
    private readonly list: TeacherChannelList,
  ) {}

  @Get()
  mine(@CurrentUser() user: AuthUser): Promise<TeacherChannelRow[]> {
    return this.list.list(user);
  }

  /** 404 student_not_found when the student is not (or no longer) one of mine. */
  @Get(':studentId/messages')
  async messages(
    @Param('studentId', UUID) studentId: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPage> {
    return pageFor(this.channels, await this.access.teacher(user, studentId), query);
  }

  @Post(':studentId/messages')
  async post(
    @Param('studentId', UUID) studentId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const { body: text } = parseOrThrow(channelPostSchema, body);
    return this.channels.post(await this.access.teacher(user, studentId), text);
  }

  @Post(':studentId/read')
  @HttpCode(204)
  async read(
    @Param('studentId', UUID) studentId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const { at } = parseOrThrow(channelReadSchema, body ?? {});
    await this.channels.read(await this.access.teacher(user, studentId), at);
  }

  /** «تعديل»: the sender's own text within 15 minutes (ChannelEdits). */
  @Patch(':studentId/messages/:messageId')
  async edit(
    @Param() params: Record<string, string | undefined>,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const { studentId, messageId } = await messageParams(params, 'studentId');
    const { body: text } = parseOrThrow(channelPostSchema, body);
    return this.edits.edit({
      actor: await this.access.teacher(user, studentId),
      messageId,
      body: text,
    });
  }

  /** «حذف للجميع»: the sender's own message within 48 hours. */
  @Delete(':studentId/messages/:messageId')
  async remove(
    @Param() params: Record<string, string | undefined>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const { studentId, messageId } = await messageParams(params, 'studentId');
    return this.edits.remove({ actor: await this.access.teacher(user, studentId), messageId });
  }
}
