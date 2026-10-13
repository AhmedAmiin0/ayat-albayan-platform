import type { MeetingCreated, MeetingCreateResult, MeetingView, PublicMeetingView, RoomJoinResult } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Injectable, Ip, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions, Public } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { InternalMeetingJoinService } from './internal-meetings.join.service';
import { InternalMeetingKickService } from './internal-meetings.kick.service';
import { InternalMeetingsService } from './internal-meetings.service';
import { MeetingCreateService } from './meeting-create.service';
import { MeetingListService } from './meeting-list.service';

/** The staff routes' services (one injectable, so the controller stays at ≤ 3 params). */
@Injectable()
export class InternalMeetingRoutes {
  constructor(
    readonly creates: MeetingCreateService,
    readonly lists: MeetingListService,
    readonly meetings: InternalMeetingsService,
  ) {}
}

/** LiveKit identities the API mints: `<role>-<12 hex>` (newIdentity). */
const IDENTITY = /^[a-z]+-[0-9a-f]{12}$/;

/**
 * «اجتماع داخلي», staff side: any staff login creates (now or scheduled, with invitees: R-MEET-01/02),
 * lists, joins; the creator or an admin ends it. Scheduling and invitees: MeetingInvitesController.
 */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('meetings.write')
@Controller('meetings')
export class InternalMeetingsController {
  constructor(
    private readonly routes: InternalMeetingRoutes,
    private readonly joins: InternalMeetingJoinService,
    private readonly kicks: InternalMeetingKickService,
  ) {}

  /**
   * 201 {id, url, invitees, replayed}: the link /m/<token> and each personal link are shown once.
   * 400 starts_in_past | too_far_ahead | invalid_phone | too_many_invitees, 404 staff_not_found |
   * student_not_found, 409 invite_limit.
   */
  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<MeetingCreateResult> {
    return this.routes.creates.create({ user, body });
  }

  /** Created OR invited (an admin: all): the coming scheduled ones first, then the newest. */
  @Get()
  @Permissions('meetings.read')
  list(@CurrentUser() user: AuthUser): Promise<MeetingView[]> {
    return this.routes.lists.list(user);
  }

  /** {id} of the meeting behind /m/<token>: a signed-in staff member enters as staff. 404 link_invalid. */
  @Get('by-link/:token')
  @Permissions('meetings.read')
  byLink(@Param('token') token: string, @CurrentUser() user: AuthUser): Promise<{ id: string }> {
    return this.joins.idByLink({ user, token });
  }

  /** 204; 404 meeting_not_found, 403 not the creator nor an admin, 409 meeting_not_started (scheduled, window not open). */
  @Post(':id/end')
  @HttpCode(204)
  async end(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.routes.meetings.end({ user, id });
  }

  /** «رابط جديد»: a fresh link; the previous one stops working. */
  @Post(':id/link')
  @HttpCode(200)
  link(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<MeetingCreated> {
    return this.routes.meetings.newLink({ user, id });
  }

  /** 503 classroom_not_configured, 404 meeting_not_found, 410 meeting_ended | join_closed, 403 join_not_open_yet. */
  @Post(':id/join')
  @HttpCode(200)
  join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RoomJoinResult> {
    return this.joins.staff({ user, id });
  }

  /** 204; 404 participant_not_found, 403 cannot_remove, 503, 502 LiveKit refused. */
  @Post(':id/participants/:identity/remove')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Param('identity') identity: string, @CurrentUser() user: AuthUser): Promise<void> {
    if (!IDENTITY.test(identity)) throw notFound('participant_not_found');
    await this.kicks.remove({ user, id, identity });
  }
}

/** The link's door (no login): the token in the path is the whole credential. */
@ApiTags('classroom')
@Public()
@Controller('public/meetings')
export class InternalMeetingsPublicController {
  constructor(private readonly joins: InternalMeetingJoinService) {}

  /** {title, state}; 404 link_invalid, 429. */
  @Get(':token')
  view(@Param('token') token: string, @Ip() ip: string): Promise<PublicMeetingView> {
    return this.joins.view({ token, ip });
  }

  /** {name} → a guest token; 404 link_invalid, 410 meeting_ended, 429, 400, 503. */
  @Post(':token/join')
  @HttpCode(200)
  join(@Param('token') token: string, @Body() body: unknown, @Ip() ip: string): Promise<RoomJoinResult> {
    return this.joins.guest({ token, ip, body });
  }
}
