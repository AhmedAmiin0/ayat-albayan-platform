import { meetingRoutes as routes } from '@ab/schedule';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { InstantLessonService } from './instant.service';

/** Admin only. */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('lessons.write')
@Controller()
export class InstantController {
  constructor(private readonly instant: InstantLessonService) {}

  /** 404 teacher / student_not_found. */
  @Route(routes.instant)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.instant>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.instant.create({ req: body, actorId: user.id });
  }
}
