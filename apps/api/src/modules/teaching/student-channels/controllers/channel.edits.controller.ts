import {
  channelMonitorMessageRoutes,
  channelPortalMessageRoutes,
  channelSalesMessageRoutes,
  channelTeacherMessageRoutes,
  type ChannelMessageView,
} from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ChannelAccess, requireAdmin } from '@/modules/teaching/student-channels/channel-access';
import { ChannelEdits } from '@/modules/teaching/student-channels/channel-edits.service';

type Teacher<K extends keyof typeof channelTeacherMessageRoutes> = RouteInputOf<
  (typeof channelTeacherMessageRoutes)[K]
>;
type Edit = RouteInputOf<typeof channelPortalMessageRoutes.edit>;
type Remove = RouteInputOf<typeof channelPortalMessageRoutes.remove>;

/** Edit and delete for everyone: sender limits 15 min and 48 h; the admin deletes via monitor. */
@ApiBearerAuth()
@Controller()
export class ChannelEditsController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly edits: ChannelEdits,
  ) {}

  @Route(channelTeacherMessageRoutes.edit)
  async teacherEdit(
    @RouteInput() { params, body }: Teacher<'edit'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const actor = await this.access.teacher(user, params.studentId);
    return this.edits.edit({ actor, messageId: params.messageId, body: body.body });
  }

  @Route(channelTeacherMessageRoutes.remove)
  async teacherDelete(
    @RouteInput() { params }: Teacher<'remove'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const actor = await this.access.teacher(user, params.studentId);
    return this.edits.remove({ actor, messageId: params.messageId });
  }

  @Route(channelPortalMessageRoutes.edit)
  async familyEdit(
    @RouteInput() { params, body }: Edit,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const actor = await this.access.family(user, params.id);
    return this.edits.edit({ actor, messageId: params.messageId, body: body.body });
  }

  @Route(channelPortalMessageRoutes.remove)
  async familyDelete(
    @RouteInput() { params }: Remove,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const actor = await this.access.family(user, params.id);
    return this.edits.remove({ actor, messageId: params.messageId });
  }

  @Route(channelSalesMessageRoutes.edit)
  async salesEdit(
    @RouteInput() { params, body }: Edit,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const actor = await this.access.assistant(user, params.id);
    return this.edits.edit({ actor, messageId: params.messageId, body: body.body });
  }

  @Route(channelSalesMessageRoutes.remove)
  async salesDelete(
    @RouteInput() { params }: Remove,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    const actor = await this.access.assistant(user, params.id);
    return this.edits.remove({ actor, messageId: params.messageId });
  }

  /** Moderation: the admin only (another holder of student_channels.monitor is 403). */
  @Route(channelMonitorMessageRoutes.remove)
  async moderate(
    @RouteInput() { params }: Remove,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    requireAdmin(user, 'moderation_admin_only');
    const actor = await this.access.monitor(user, params.id);
    return this.edits.remove({ actor, messageId: params.messageId, moderator: true });
  }
}
