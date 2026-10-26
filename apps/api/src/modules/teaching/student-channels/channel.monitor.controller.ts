import { channelPageQuerySchema, type ChannelPage } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { ChannelAccess } from './channel-access';
import { ChannelService } from './channel.service';

const UUID = new ParseUUIDPipe();

/** A monitor's read-only view of any student's channel (student_channels.monitor). No send or read route. */
@ApiTags('student-channels')
@ApiBearerAuth()
@Permissions('student_channels.monitor')
@Controller('students/:id/channel')
export class MonitorChannelController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly channels: ChannelService,
  ) {}

  @Get('messages')
  async messages(@Param('id', UUID) studentId: string, @Query() query: unknown, @CurrentUser() user: AuthUser): Promise<ChannelPage> {
    const { before } = parseOrThrow(channelPageQuerySchema, query ?? {});
    return this.channels.page(await this.access.monitor(user, studentId), before);
  }
}

/** The owning assistant's read-only view of her own students' channels (sales ownership). */
@ApiTags('student-channels')
@ApiBearerAuth()
@Permissions('self.sales')
@Controller('sales/students/:id/channel')
export class SalesChannelController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly channels: ChannelService,
  ) {}

  @Get('messages')
  async messages(@Param('id', UUID) studentId: string, @Query() query: unknown, @CurrentUser() user: AuthUser): Promise<ChannelPage> {
    const { before } = parseOrThrow(channelPageQuerySchema, query ?? {});
    return this.channels.page(await this.access.owner(user, studentId), before);
  }
}
