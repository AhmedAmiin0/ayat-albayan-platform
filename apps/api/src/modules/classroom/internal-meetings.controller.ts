import type { MeetingCreated, MeetingView, PublicMeetingView, RoomJoinResult } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Ip, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { InternalMeetingJoinService } from './internal-meetings.join.service';
import { InternalMeetingKickService } from './internal-meetings.kick.service';
import { InternalMeetingsService } from './internal-meetings.service';
import { ShareGrantService } from './share-grant.service';

/** LiveKit identities the API mints: `<role>-<12 hex>` (newIdentity). */
const IDENTITY = /^[a-z]+-[0-9a-f]{12}$/;

/** «اجتماع داخلي», staff side: any staff login creates, lists, joins; the creator or an admin ends it. */
@ApiTags('classroom')
@ApiBearerAuth()
@Controller('meetings')
@Roles('admin', 'teacher', 'assistant', 'sales')
export class InternalMeetingsController {
  constructor(
    private readonly meetings: InternalMeetingsService,
    private readonly joins: InternalMeetingJoinService,
    private readonly kicks: InternalMeetingKickService,
    private readonly shares: ShareGrantService,
  ) {}

  /** 201 {id, url}: the link /m/<token> is shown once. */
  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<MeetingCreated> {
    return this.meetings.create({ user, body });
  }

  /** The newest 20: all of them for an admin, else the caller's own. */
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<MeetingView[]> {
    return this.meetings.list(user);
  }

  /** {id} of the meeting behind /m/<token>: a signed-in staff member enters as staff. 404 link_invalid. */
  @Get('by-link/:token')
  byLink(@Param('token') token: string, @CurrentUser() user: AuthUser): Promise<{ id: string }> {
    return this.joins.idByLink({ user, token });
  }

  /** 204; 404 meeting_not_found, 403 not the creator nor an admin. */
  @Post(':id/end')
  @HttpCode(204)
  async end(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.meetings.end({ user, id });
  }

  /** «رابط جديد»: a fresh link; the previous one stops working. */
  @Post(':id/link')
  @HttpCode(200)
  link(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<MeetingCreated> {
    return this.meetings.newLink({ user, id });
  }

  /** 503 classroom_not_configured, 404 meeting_not_found, 410 meeting_ended. */
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

  /** {allow}: «سماح» / «إيقاف مشاركة» a guest's screen share. 204; 403 cannot_grant_share, 404, 503, 502. */
  @Post(':id/participants/:identity/share')
  @HttpCode(204)
  async share(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('identity') identity: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    if (!IDENTITY.test(identity)) throw notFound('participant_not_found');
    await this.shares.meeting({ user, id, identity, body });
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
