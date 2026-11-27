import { participantIdentitySchema, roomModerationRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ZodParam } from '@/common/http/zod-inputs';
import { KickService } from './kick.service';
import { participantNotFound } from './participant-param';
import { RecordingListService } from '@/modules/teaching/classroom/recordings/recording-list.service';

/** Classroom moderation and recordings, staff side (the services decide who, per lesson). */
@ApiBearerAuth()
@Controller()
export class ModerationController {
  constructor(
    private readonly kicks: KickService,
    private readonly recordings: RecordingListService,
  ) {}

  // The identity keeps its own 404 on ZodParam; it comes before @RouteInput because Nest runs the
  // later param's pipe first, so a bad id still answers 400 first.
  /** 204; 404 participant_not_found, 403 cannot_remove, 503, 502 LiveKit refused. */
  @Route(routes.removeFromLesson)
  @HttpCode(204)
  async remove(
    @ZodParam('identity', participantIdentitySchema, participantNotFound) identity: string,
    @RouteInput() { params }: RouteInputOf<typeof routes.removeFromLesson>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.kicks.remove({ user, lessonId: params.id, identity });
  }

  @Route(routes.lessonRecordings)
  recordingsOf(
    @RouteInput() { params }: RouteInputOf<typeof routes.lessonRecordings>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.recordings.list({ user, lessonId: params.id });
  }
}
