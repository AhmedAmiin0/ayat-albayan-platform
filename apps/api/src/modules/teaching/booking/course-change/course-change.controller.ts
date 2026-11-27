import { courseChangeRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@/common/auth/verify-token';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { CourseChange } from './course-change.service';
import { CourseChangeViews } from './course-change.view';

/** Same CourseChange as the assistant's route; any student; override with a reason allowed. */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('lessons.write')
@Controller()
export class CourseChangeController {
  constructor(
    private readonly course: CourseChange,
    private readonly views: CourseChangeViews,
  ) {}

  @Route(routes.view)
  view(@RouteInput() { query }: RouteInputOf<typeof routes.view>) {
    return this.views.view(query.subscriptionId);
  }

  @Route(routes.check)
  @HttpCode(200)
  check(
    @RouteInput() { body }: RouteInputOf<typeof routes.check>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.course.check(body, { user, role: 'admin' });
  }

  /** Codes: CourseChange.change. */
  @Route(routes.change)
  change(
    @RouteInput() { body }: RouteInputOf<typeof routes.change>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.course.change(body, { user, role: 'admin' });
  }
}
