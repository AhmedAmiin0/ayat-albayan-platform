import {
  channelPostSchema,
  channelSeatRoutes as seatRoutes,
  channelReadSchema,
  type ChannelMessageView,
  type ChannelPost,
  type ChannelSeat,
  type ChannelUnread,
} from '@ab/shared';
import { Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import { ChannelService } from '@/modules/teaching/student-channels/channel.service';
import { ChannelSeatService } from '@/modules/teaching/student-channels/seat/channel-seat.service';

const id = z.uuid();

/**
 * The assistant in the chat writes too (docs/31 §2): sends, read
 * marks and her unread count, as the teacher and the family do, for the one assistant in the
 * chat's seat (any assistant may take it, one at a time); any other
 * assistant is 404. Her send and read mark: 403 family_chat_off while the family chat is off,
 * 409 channel_not_open on a closed chat. The seat: any assistant reads it and takes a free one,
 * the student's bringer takes it from anyone (the bringer comes first), the
 * holder leaves it. Her page stays GET …/messages (MonitorChannelController).
 */
@ApiTags('student-channels')
@ApiBearerAuth()
@Permissions('self.sales')
@Controller()
export class SalesChannelController {
  constructor(
    @Inject(ChannelAccess) private readonly access: ChannelAccess,
    @Inject(ChannelService) private readonly channels: ChannelService,
    @Inject(ChannelSeatService) private readonly seats: ChannelSeatService,
  ) {}

  @Post('sales/students/:id/channel/messages')
  async post(
    @ZodParam('id', id) studentId: string,
    @ZodBody(channelPostSchema) body: ChannelPost,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelMessageView> {
    return this.channels.post(await this.access.assistantWriter(user, studentId), body);
  }

  @Post('sales/students/:id/channel/read')
  @HttpCode(204)
  async read(
    @ZodParam('id', id) studentId: string,
    @ZodBody(channelReadSchema, { orEmpty: true }) body: z.output<typeof channelReadSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.channels.read(await this.access.assistantWriter(user, studentId), body.at);
  }

  @Get('sales/students/:id/channel/unread')
  async unread(
    @ZodParam('id', id) studentId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ChannelUnread> {
    return this.channels.unread(await this.access.assistant(user, studentId));
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
