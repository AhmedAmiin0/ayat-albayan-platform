import type { ChannelPage } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import { ChannelService } from '@/modules/teaching/student-channels/channel.service';
import { pageFor } from './channel-page';

const UUID = new ParseUUIDPipe();

/**
 * The staff pages (docs/31 §2): the monitor's read-only view of any student's channel
 * (student_channels.monitor; no send or read route), and the page of the one assistant in the
 * chat's seat, where she writes too (SalesChannelController).
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
    return pageFor(this.channels, await this.access.assistant(user, studentId), query);
  }
}
