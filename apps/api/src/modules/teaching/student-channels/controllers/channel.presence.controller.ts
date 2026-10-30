import type { ChannelPresence } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { PresenceService } from '@/modules/people/presence';
import {
  ChannelAccess,
  type ChannelActor,
} from '@/modules/teaching/student-channels/channel-access';

const UUID = new ParseUUIDPipe();

/**
 * «متصل الآن» / «آخر ظهور» in the chat header (docs/33 §2): each audience's route runs the same
 * access check as its messages route (another family, teacher or assistant: 404), then the
 * presence rule keeps only the people this caller may see.
 */
@ApiTags('student-channels')
@ApiBearerAuth()
@Controller()
export class ChannelPresenceController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly presence: PresenceService,
  ) {}

  @Get('teachers/me/channels/:id/presence')
  @Permissions('self.teacher')
  async teacher(
    @Param('id', UUID) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPresence> {
    return this.of(user, await this.access.teacher(user, id));
  }

  @Get('portal/students/:id/channel/presence')
  @Permissions('self.portal')
  async portal(
    @Param('id', UUID) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPresence> {
    return this.of(user, await this.access.family(user, id));
  }

  @Get('students/:id/channel/presence')
  @Permissions('student_channels.monitor')
  async monitor(
    @Param('id', UUID) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPresence> {
    return this.of(user, await this.access.monitor(user, id));
  }

  @Get('sales/students/:id/channel/presence')
  @Permissions('self.sales')
  async sales(
    @Param('id', UUID) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPresence> {
    return this.of(user, await this.access.owner(user, id));
  }

  private of(viewer: AuthUser, actor: ChannelActor): Promise<ChannelPresence> {
    const participant = actor.mode === 'participant';
    return this.presence.channel({
      viewer,
      studentId: actor.studentId,
      participant,
      open: actor.open,
    });
  }
}
