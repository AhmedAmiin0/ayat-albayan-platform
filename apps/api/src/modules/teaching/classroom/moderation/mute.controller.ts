import { participantIdentitySchema, roomModerationRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ZodParam } from '@/common/http/zod-inputs';
import { MuteLimit } from './mute-limit';
import { MeetingMuteService, MuteService } from './mute.service';
import { participantNotFound } from './participant-param';

// The identity keeps its own 404 on ZodParam; it comes before @RouteInput because Nest runs the
// later param's pipe first, so a bad body or id still answers 400 first.

/** 204; 400, 403 cannot_mute, 404 participant_not_found, 429, 503, 502. */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('classroom.moderate')
@Controller()
export class LessonMuteController {
  constructor(
    private readonly mutes: MuteService,
    private readonly limit: MuteLimit,
  ) {}

  @Route(routes.muteInLesson)
  @HttpCode(204)
  async mute(
    @ZodParam('identity', participantIdentitySchema, participantNotFound) identity: string,
    @RouteInput() { params, body }: RouteInputOf<typeof routes.muteInLesson>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    this.limit.assert(user);
    await this.mutes.lesson({ user, id: params.id, identity, source: body.source });
  }
}

/** The same for internal meetings; the service then applies canMute. */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('meetings.write')
@Controller()
export class MeetingMuteController {
  constructor(
    private readonly mutes: MeetingMuteService,
    private readonly limit: MuteLimit,
  ) {}

  @Route(routes.muteInMeeting)
  @HttpCode(204)
  async mute(
    @ZodParam('identity', participantIdentitySchema, participantNotFound) identity: string,
    @RouteInput() { params, body }: RouteInputOf<typeof routes.muteInMeeting>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    this.limit.assert(user);
    await this.mutes.meeting({ user, id: params.id, identity, source: body.source });
  }
}
