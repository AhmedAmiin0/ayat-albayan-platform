import { roomModerationRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { LessonEndService } from './lesson-end.service';

/** End for everyone: the lesson's teacher or an admin (the service decides per lesson). */
@ApiBearerAuth()
@Controller()
export class LessonEndController {
  constructor(@Inject(LessonEndService) private readonly ends: LessonEndService) {}

  /** 200 {endedAt} (idempotent: the first end's time); 404 lesson_not_found, 403. */
  @Route(routes.endLesson)
  @HttpCode(200)
  end(
    @RouteInput() { params }: RouteInputOf<typeof routes.endLesson>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ends.end({ user, lessonId: params.id });
  }
}
