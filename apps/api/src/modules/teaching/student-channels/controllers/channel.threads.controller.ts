import {
  channelMonitorRoutes,
  channelPortalRoutes,
  channelSalesRoutes,
  channelTeacherRoutes,
  type ChannelMessageView,
  type ChannelPage,
  type ChannelUnread,
  type TeacherChannelRow,
} from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import {
  ChannelService,
  TeacherChannelList,
} from '@/modules/teaching/student-channels/channel.service';

type Teacher<K extends keyof typeof channelTeacherRoutes> = RouteInputOf<
  (typeof channelTeacherRoutes)[K]
>;
type Family<K extends keyof typeof channelPortalRoutes> = RouteInputOf<
  (typeof channelPortalRoutes)[K]
>;

/** The teacher's channels with the families of their current students (docs/31 §2). */
@ApiBearerAuth()
@Controller()
export class TeacherChannelsController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly channels: ChannelService,
    private readonly list: TeacherChannelList,
  ) {}

  @Route(channelTeacherRoutes.list)
  mine(@CurrentUser() user: AuthUser): Promise<TeacherChannelRow[]> {
    return this.list.list(user);
  }

  /** 404 student_not_found when the student is not (or no longer) one of mine. */
  @Route(channelTeacherRoutes.page)
  async messages(
    @RouteInput() { params, query }: Teacher<'page'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPage> {
    return this.channels.page(await this.access.teacher(user, params.studentId), query.before);
  }

  @Route(channelTeacherRoutes.post)
  async post(
    @RouteInput() { params, body }: Teacher<'post'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    return this.channels.post(await this.access.teacher(user, params.studentId), body);
  }

  @Route(channelTeacherRoutes.read)
  @HttpCode(204)
  async read(@RouteInput() { params, body }: Teacher<'read'>, @CurrentUser() user: AuthUser) {
    await this.channels.read(await this.access.teacher(user, params.studentId), body.at);
  }
}

/** The family portal chat (docs/31 §2): the guardian or the student, for their own student only. */
@ApiBearerAuth()
@Controller()
export class PortalChannelController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly channels: ChannelService,
  ) {}

  @Route(channelPortalRoutes.page)
  async messages(
    @RouteInput() { params, query }: Family<'page'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPage> {
    return this.channels.page(await this.access.family(user, params.id), query.before);
  }

  @Route(channelPortalRoutes.post)
  async post(
    @RouteInput() { params, body }: Family<'post'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    return this.channels.post(await this.access.family(user, params.id), body);
  }

  @Route(channelPortalRoutes.read)
  @HttpCode(204)
  async read(@RouteInput() { params, body }: Family<'read'>, @CurrentUser() user: AuthUser) {
    await this.channels.read(await this.access.family(user, params.id), body.at);
  }

  @Route(channelPortalRoutes.unread)
  async unread(
    @RouteInput() { params }: Family<'unread'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelUnread> {
    return this.channels.unread(await this.access.family(user, params.id));
  }
}

/**
 * The staff pages (docs/31 §2): the monitor's read-only view of any student's channel (no send or
 * read route), and the page of the one assistant in the chat's seat, who writes through
 * SalesChannelController.
 */
@ApiBearerAuth()
@Controller()
export class MonitorChannelController {
  constructor(
    private readonly access: ChannelAccess,
    private readonly channels: ChannelService,
  ) {}

  @Route(channelMonitorRoutes.page)
  async messages(
    @RouteInput() { params, query }: RouteInputOf<typeof channelMonitorRoutes.page>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPage> {
    return this.channels.page(await this.access.monitor(user, params.id), query.before);
  }

  @Route(channelSalesRoutes.page)
  async salesMessages(
    @RouteInput() { params, query }: RouteInputOf<typeof channelSalesRoutes.page>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelPage> {
    return this.channels.page(await this.access.assistant(user, params.id), query.before);
  }
}
