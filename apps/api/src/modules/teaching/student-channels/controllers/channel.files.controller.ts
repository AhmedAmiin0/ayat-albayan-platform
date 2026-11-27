import {
  channelMonitorMessageRoutes,
  channelPortalMessageRoutes,
  channelSalesMessageRoutes,
  channelTeacherMessageRoutes,
  type ChannelReads,
  type SignedUpload,
} from '@ab/shared';
import { Controller, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import { ChannelMedia } from '@/modules/teaching/student-channels/media/channel-media.service';
import { ChannelReadsService } from '@/modules/teaching/student-channels/reads/channel-reads.service';

type Teacher<K extends keyof typeof channelTeacherMessageRoutes> = RouteInputOf<
  (typeof channelTeacherMessageRoutes)[K]
>;
type Upload = RouteInputOf<typeof channelPortalMessageRoutes.upload>;
type Reads = RouteInputOf<typeof channelPortalMessageRoutes.reads>;

/** Chat upgrade (docs/31 §2): participants upload media; anyone let in sees message read info. */
@ApiBearerAuth()
@Controller()
export class ChannelFilesController {
  constructor(
    @Inject(ChannelAccess) private readonly access: ChannelAccess,
    @Inject(ChannelMedia) private readonly media: ChannelMedia,
    @Inject(ChannelReadsService) private readonly reads: ChannelReadsService,
  ) {}

  @Route(channelTeacherMessageRoutes.upload)
  async teacherUpload(
    @RouteInput() { params, body }: Teacher<'upload'>,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.media.uploadUrl(await this.access.teacher(user, params.studentId), body);
  }

  @Route(channelPortalMessageRoutes.upload)
  async familyUpload(
    @RouteInput() { params, body }: Upload,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.media.uploadUrl(await this.access.family(user, params.id), body);
  }

  @Route(channelSalesMessageRoutes.upload)
  async salesUpload(
    @RouteInput() { params, body }: Upload,
    @CurrentUser() user: AuthUser,
  ): Promise<SignedUpload> {
    return this.media.uploadUrl(await this.access.assistant(user, params.id), body);
  }

  @Route(channelTeacherMessageRoutes.reads)
  async teacherReads(
    @RouteInput() { params }: Teacher<'reads'>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelReads> {
    return this.reads.reads(await this.access.teacher(user, params.studentId), params.messageId);
  }

  @Route(channelPortalMessageRoutes.reads)
  async familyReads(
    @RouteInput() { params }: Reads,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelReads> {
    return this.reads.reads(await this.access.family(user, params.id), params.messageId);
  }

  @Route(channelSalesMessageRoutes.reads)
  async salesReads(
    @RouteInput() { params }: Reads,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelReads> {
    return this.reads.reads(await this.access.assistant(user, params.id), params.messageId);
  }

  @Route(channelMonitorMessageRoutes.reads)
  async monitorReads(
    @RouteInput() { params }: Reads,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelReads> {
    return this.reads.reads(await this.access.monitor(user, params.id), params.messageId);
  }
}
