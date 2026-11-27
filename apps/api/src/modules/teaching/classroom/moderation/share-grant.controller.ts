import { participantIdentitySchema, roomModerationRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ZodParam } from '@/common/http/zod-inputs';
import { MeetingShareGrantService, ShareGrantService } from './share-grant.service';
import { participantNotFound } from './participant-param';

// The identity keeps its own 404 on ZodParam; it comes before @RouteInput because Nest runs the
// later param's pipe first, so a bad body or id still answers 400 first.

/** 204; 403 cannot_grant_share, 404, 503, 502. */
@ApiBearerAuth()
@Controller()
export class LessonShareController {
  constructor(private readonly shares: ShareGrantService) {}

  @Route(routes.shareInLesson)
  @HttpCode(204)
  async share(
    @ZodParam('identity', participantIdentitySchema, participantNotFound) identity: string,
    @RouteInput() { params, body }: RouteInputOf<typeof routes.shareInLesson>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.shares.lesson({ user, id: params.id, identity, allow: body.allow });
  }
}

/** The same for internal meetings; the service requires teacher, admin or assistant. */
@ApiBearerAuth()
@Controller()
export class MeetingShareController {
  constructor(private readonly shares: MeetingShareGrantService) {}

  @Route(routes.shareInMeeting)
  @HttpCode(204)
  async share(
    @ZodParam('identity', participantIdentitySchema, participantNotFound) identity: string,
    @RouteInput() { params, body }: RouteInputOf<typeof routes.shareInMeeting>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.shares.meeting({ user, id: params.id, identity, allow: body.allow });
  }
}
