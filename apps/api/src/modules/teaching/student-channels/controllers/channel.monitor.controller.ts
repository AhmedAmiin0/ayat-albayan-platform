import type { ChannelPage } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { ChannelAccess } from '../channel-access';
import { ChannelService } from '../channel.service';
import { pageFor } from './channel-page';

const UUID = new ParseUUIDPipe();

/**
 * Monitors' read-only views (docs/31 §2): any student's channel with student_channels.monitor, and the
 * owning assistant's own students (sales ownership). No send or read route exists for them.
 */
@ApiTags('student-channels')
@ApiBearerAuth()
@Controller()
export class MonitorChannelController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly channels: ChannelService,
  ) {}

  @Get('students/:id/channel/messages')
  @Permissions('student_channels.monitor')
  async messages(@Param('id', UUID) studentId: string, @Query() query: unknown, @CurrentUser() user: AuthUser): Promise<ChannelPage> {
    return pageFor(this.channels, await this.access.monitor(user, studentId), query);
  }

  @Get('sales/students/:id/channel/messages')
  @Permissions('self.sales')
  async salesMessages(@Param('id', UUID) studentId: string, @Query() query: unknown, @CurrentUser() user: AuthUser): Promise<ChannelPage> {
    return pageFor(this.channels, await this.access.owner(user, studentId), query);
  }
}
