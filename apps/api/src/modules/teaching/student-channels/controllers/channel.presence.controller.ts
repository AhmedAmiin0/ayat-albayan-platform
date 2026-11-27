import { channelPresenceRoutes as routes, type ChannelPresence } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { PresenceService } from '@/modules/people/presence';
import {
  ChannelAccess,
  requireAdmin,
  type ChannelActor,
} from '@/modules/teaching/student-channels/channel-access';

/** Presence (docs/33 §2): same access check as messages; a custom monitor role sees no presence. */
@ApiBearerAuth()
@Controller()
export class ChannelPresenceController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly presence: PresenceService,
  ) {}

  @Route(routes.teacher)
  async teacher(
    @RouteInput() { params }: RouteInputOf<typeof routes.teacher>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPresence> {
    return this.of(user, await this.access.teacher(user, params.id));
  }

  @Route(routes.portal)
  async portal(
    @RouteInput() { params }: RouteInputOf<typeof routes.portal>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPresence> {
    return this.of(user, await this.access.family(user, params.id));
  }

  @Route(routes.monitor)
  async monitor(
    @RouteInput() { params }: RouteInputOf<typeof routes.monitor>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPresence> {
    const actor = await this.access.monitor(user, params.id);
    requireAdmin(user, 'presence_admin_only');
    return this.of(user, actor);
  }

  @Route(routes.sales)
  async sales(
    @RouteInput() { params }: RouteInputOf<typeof routes.sales>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPresence> {
    return this.of(user, await this.access.assistant(user, params.id));
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
