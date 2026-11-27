import { meetingRoomRoutes as routes, type RoomJoinResult } from '@ab/schedule';
import { Body, Controller, HttpCode, Injectable, Ip, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions, Public } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { mintedIdentity } from '@/modules/teaching/classroom/moderation/participant-param';
import { InternalMeetingJoinService } from './internal-meetings.join.service';
import { InternalMeetingKickService } from './internal-meetings.kick.service';
import { InternalMeetingsService } from './internal-meetings.service';
import { MeetingCreateService } from '@/modules/teaching/classroom/meetings/schedule/meeting-create.service';
import { MeetingListService } from '@/modules/teaching/classroom/meetings/schedule/meeting-list.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** The staff routes' services (one injectable, so the controller stays at ≤ 3 params). */
@Injectable()
export class InternalMeetingRoutes {
  constructor(
    readonly creates: MeetingCreateService,
    readonly lists: MeetingListService,
    readonly meetings: InternalMeetingsService,
  ) {}
}

/** Internal meetings, staff side (R-MEET-01/02): the creator or an admin ends it. */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('meetings.write')
@Controller()
export class InternalMeetingsController {
  constructor(
    private readonly routes: InternalMeetingRoutes,
    private readonly joins: InternalMeetingJoinService,
    private readonly kicks: InternalMeetingKickService,
  ) {}

  /**
   * 400 starts_in_past | too_far_ahead | invalid_phone | too_many_invitees, 404 staff_not_found |
   * student_not_found, 409 invite_limit.
   */
  @Route(routes.create)
  create(@RouteInput() { body }: In<'create'>, @CurrentUser() user: AuthUser) {
    return this.routes.creates.create({ user, body });
  }

  @Route(routes.list)
  @Permissions('meetings.read')
  list(@CurrentUser() user: AuthUser) {
    return this.routes.lists.list(user);
  }

  /** A signed-in staff member who opens /m/<token> enters as staff. 404 link_invalid. */
  @Route(routes.byLink)
  @Permissions('meetings.read')
  byLink(@RouteInput() { params }: In<'byLink'>, @CurrentUser() user: AuthUser) {
    return this.joins.idByLink({ user, token: params.token });
  }

  /** 404 meeting_not_found, 403 not the creator nor an admin, 409 meeting_not_started. */
  @Route(routes.end)
  @HttpCode(204)
  async end(@RouteInput() { params }: In<'end'>, @CurrentUser() user: AuthUser): Promise<void> {
    await this.routes.meetings.end({ user, id: params.id });
  }

  @Route(routes.newLink)
  @HttpCode(200)
  link(@RouteInput() { params }: In<'newLink'>, @CurrentUser() user: AuthUser) {
    return this.routes.meetings.newLink({ user, id: params.id });
  }

  /** 503 classroom_not_configured, 404 meeting_not_found, 410 meeting_ended | join_closed, 403. */
  @Route(routes.join)
  @HttpCode(200)
  join(@RouteInput() { params }: In<'join'>, @CurrentUser() user: AuthUser) {
    return this.joins.staff({ user, id: params.id });
  }

  /** 204; 400 bad id, then 404 participant_not_found, 403 cannot_remove, 503, 502. */
  @Route(routes.remove)
  @HttpCode(204)
  async remove(
    @RouteInput() { params }: In<'remove'>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const identity = mintedIdentity(params.identity);
    await this.kicks.remove({ user, id: params.id, identity });
  }
}

/** The link's door (no login): the token in the path is the whole credential. */
@ApiTags('classroom')
@Public()
@Controller()
export class InternalMeetingsPublicController {
  constructor(private readonly joins: InternalMeetingJoinService) {}

  /** {title, state}; 404 link_invalid, 429. */
  @Route(routes.publicView)
  view(@RouteInput() { params }: In<'publicView'>, @Ip() ip: string) {
    return this.joins.view({ token: params.token, ip });
  }

  // The name stays unparsed here: the rate limit (429) and LiveKit (503) answer before it does.
  /** {name} → a guest token; 404 link_invalid, 410 meeting_ended, 429, 400, 503. */
  @Post('public/meetings/:token/join')
  @HttpCode(200)
  join(
    @Param('token') token: string,
    @Body() body: unknown,
    @Ip() ip: string,
  ): Promise<RoomJoinResult> {
    return this.joins.guest({ token, ip, body });
  }
}
