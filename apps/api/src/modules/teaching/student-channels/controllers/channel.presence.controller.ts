import type { ChannelPresence } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden } from '@/common/http/errors';
import { PresenceService } from '@/modules/people/presence';
import {
  ChannelAccess,
  type ChannelActor,
} from '@/modules/teaching/student-channels/channel-access';
import { UuidParam } from '@/common/http/uuid-param';

/**
 * «متصل الآن» / «آخر ظهور» in the chat header (docs/33 §2): each audience's route runs the same
 * access check as its messages route (another family, teacher or assistant: 404), then the
 * presence rule keeps only the people this caller may see. The monitor route is the admin's alone:
 * a custom role holding student_channels.monitor reads the chat but sees nobody's presence (§2).
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
    @UuidParam('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPresence> {
    return this.of(user, await this.access.teacher(user, id));
  }

  @Get('portal/students/:id/channel/presence')
  @Permissions('self.portal')
  async portal(
    @UuidParam('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPresence> {
    return this.of(user, await this.access.family(user, id));
  }

  @Get('students/:id/channel/presence')
  @Permissions('student_channels.monitor')
  async monitor(
    @UuidParam('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPresence> {
    const actor = await this.access.monitor(user, id);
    if (user.role !== 'admin') throw forbidden('presence_admin_only');
    return this.of(user, actor);
  }

  @Get('sales/students/:id/channel/presence')
  @Permissions('self.sales')
  async sales(
    @UuidParam('id') id: string,
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
