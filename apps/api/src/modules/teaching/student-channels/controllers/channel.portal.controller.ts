import {
  channelPostSchema,
  channelReadSchema,
  type ChannelMessageView,
  type ChannelPage,
  type ChannelUnread,
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
import { ChannelService } from '@/modules/teaching/student-channels/channel.service';
import { pageFor } from './channel-page';
import { messageParams } from './channel-message-params';
import { ChannelEdits } from '@/modules/teaching/student-channels/channel-edits.service';

const UUID = new ParseUUIDPipe();

/**
 * The portal's «المحادثة مع المعلم/ة» (docs/31 §2): the guardian or the student, for their own
 * student only.
 */
@ApiTags('student-channels')
@ApiBearerAuth()
@Permissions('self.portal')
@Controller('portal/students/:id/channel')
export class PortalChannelController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly channels: ChannelService,
    private readonly edits: ChannelEdits,
  ) {}

  @Get('messages')
  async messages(
    @Param('id', UUID) studentId: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPage> {
    return pageFor(this.channels, await this.access.family(user, studentId), query);
  }

  @Post('messages')
  async post(
    @Param('id', UUID) studentId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const { body: text } = parseOrThrow(channelPostSchema, body);
    return this.channels.post(await this.access.family(user, studentId), text);
  }

  @Post('read')
  @HttpCode(204)
  async read(
    @Param('id', UUID) studentId: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const { at } = parseOrThrow(channelReadSchema, body ?? {});
    await this.channels.read(await this.access.family(user, studentId), at);
  }

  @Get('unread')
  async unread(
    @Param('id', UUID) studentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelUnread> {
    return this.channels.unread(await this.access.family(user, studentId));
  }

  /** «تعديل»: the sender's own text within 15 minutes (ChannelEdits). */
  @Patch('messages/:messageId')
  async edit(
    @Param() params: Record<string, string | undefined>,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const { studentId, messageId } = await messageParams(params, 'id');
    const { body: text } = parseOrThrow(channelPostSchema, body);
    return this.edits.edit({
      actor: await this.access.family(user, studentId),
      messageId,
      body: text,
    });
  }

  /** «حذف للجميع»: the sender's own message within 48 hours. */
  @Delete('messages/:messageId')
  async remove(
    @Param() params: Record<string, string | undefined>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const { studentId, messageId } = await messageParams(params, 'id');
    return this.edits.remove({ actor: await this.access.family(user, studentId), messageId });
  }
}
