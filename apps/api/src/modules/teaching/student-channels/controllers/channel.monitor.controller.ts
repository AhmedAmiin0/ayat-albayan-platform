import type { ChannelMessageView, ChannelPage } from '@ab/shared';
import { Controller, Delete, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import { ChannelService } from '@/modules/teaching/student-channels/channel.service';
import { forbidden } from '@/common/http/errors';
import { ChannelEdits } from '@/modules/teaching/student-channels/channel-edits.service';
import { messageParams } from './channel-message-params';
import { pageFor } from './channel-page';

const UUID = new ParseUUIDPipe();

/**
 * Monitors' read-only views (docs/31 §2): any student's channel with student_channels.monitor, and
 * the
 * owning assistant's own students (sales ownership). No send or read route exists for them; the
 * admin
 * alone may delete a message (moderation).
 */
@ApiTags('student-channels')
@ApiBearerAuth()
@Controller()
export class MonitorChannelController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly channels: ChannelService,
    private readonly edits: ChannelEdits,
  ) {}

  @Get('students/:id/channel/messages')
  @Permissions('student_channels.monitor')
  async messages(
    @Param('id', UUID) studentId: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPage> {
    return pageFor(this.channels, await this.access.monitor(user, studentId), query);
  }

  @Get('sales/students/:id/channel/messages')
  @Permissions('self.sales')
  async salesMessages(
    @Param('id', UUID) studentId: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPage> {
    return pageFor(this.channels, await this.access.owner(user, studentId), query);
  }

  /**
   * Moderation (owner 2026-10-30): the admin deletes any message for everyone; other monitors 403.
   */
  @Delete('students/:id/channel/messages/:messageId')
  @Permissions('student_channels.monitor')
  async remove(
    @Param() params: Record<string, string | undefined>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    if (user.role !== 'admin') throw forbidden('moderation_admin_only');
    const { studentId, messageId } = await messageParams(params, 'id');
    return this.edits.remove({
      actor: await this.access.monitor(user, studentId),
      messageId,
      moderator: true,
    });
  }
}
