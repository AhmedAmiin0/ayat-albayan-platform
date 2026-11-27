import {
  channelSalesRoutes as chatRoutes,
  channelSeatRoutes as seatRoutes,
  type ChannelMessageView,
  type ChannelSeat,
  type ChannelUnread,
} from '@ab/shared';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import { ChannelService } from '@/modules/teaching/student-channels/channel.service';
import { ChannelSeatService } from '@/modules/teaching/student-channels/seat/channel-seat.service';

/**
 * The assistant in the chat writes too (docs/31 §2): sends, read
 * marks and her unread count, as the teacher and the family do, for the one assistant in the
 * chat's seat (any assistant may take it, one at a time); any other
 * assistant is 404. Her send and read mark: 403 family_chat_off while the family chat is off,
 * 409 channel_not_open on a closed chat. The seat: any assistant reads it and takes a free one,
 * the student's bringer takes it from anyone (the bringer comes first), the
 * holder leaves it. Her page stays GET …/messages (MonitorChannelController).
 */
@ApiBearerAuth()
@Controller()
export class SalesChannelController {
  constructor(
    @Inject(ChannelAccess) private readonly access: ChannelAccess,
    @Inject(ChannelService) private readonly channels: ChannelService,
    @Inject(ChannelSeatService) private readonly seats: ChannelSeatService,
  ) {}

  @Route(chatRoutes.post)
  async post(
    @RouteInput() { params, body }: RouteInputOf<typeof chatRoutes.post>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    return this.channels.post(await this.access.assistantWriter(user, params.id), body);
  }

  @Route(chatRoutes.read)
  @HttpCode(204)
  async read(
    @RouteInput() { params, body }: RouteInputOf<typeof chatRoutes.read>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.channels.read(await this.access.assistantWriter(user, params.id), body.at);
  }

  @Route(chatRoutes.unread)
  async unread(
    @RouteInput() { params }: RouteInputOf<typeof chatRoutes.unread>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelUnread> {
    return this.channels.unread(await this.access.assistant(user, params.id));
  }

  @Route(seatRoutes.view)
  seat(
    @RouteInput() { params }: RouteInputOf<typeof seatRoutes.view>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelSeat> {
    return this.seats.view(user.id, params.id);
  }

  /** Take the seat: free, or I brought the student; 409 channel_seat_taken otherwise. */
  @Route(seatRoutes.take)
  takeSeat(
    @RouteInput() { params }: RouteInputOf<typeof seatRoutes.take>,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelSeat> {
    return this.seats.take(user.id, params.id);
  }

  @Route(seatRoutes.leave)
  @HttpCode(204)
  async leaveSeat(
    @RouteInput() { params }: RouteInputOf<typeof seatRoutes.leave>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.seats.leave(user.id, params.id);
  }
}
