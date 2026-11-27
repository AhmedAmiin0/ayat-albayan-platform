import { courseStopRoutes as routes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { CourseStop } from './course-stop.service';

/** subscriptions.stop (migration 990); 404, 409 already_cancelled or has_future_lessons, 400. */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('subscriptions.stop')
@Controller()
export class CourseStopController {
  constructor(private readonly stops: CourseStop) {}

  /** What the confirm sheet says (lessons to cancel, rules to end, money kept). */
  @Route(routes.preview)
  preview(
    @RouteInput() { params, query }: RouteInputOf<typeof routes.preview>,
    @CurrentUser() user: AuthUser,
  ) {
    const { subscriptionId } = query;
    return this.stops.preview({ studentId: params.id, subscriptionId, user });
  }

  @Route(routes.stop)
  stop(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.stop>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.stops.stop({ studentId: params.id, body, actor: user });
  }
}
