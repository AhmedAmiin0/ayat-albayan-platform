import type { courseTeacherRoutes, courseTimesRoutes } from '@ab/shared';
import { HttpCode } from '@nestjs/common';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import type { ProfileCourse } from './profile-course.service';

type MoveRoutes = typeof courseTimesRoutes | typeof courseTeacherRoutes;

/**
 * The course, its check and its change of one profile course action; the subclass names the
 * route table and its permission (CourseTeacherController, CourseTimesController).
 */
export function courseMoveRoutes(routes: MoveRoutes) {
  abstract class CourseMoveRoutes {
    constructor(protected readonly course: ProfileCourse) {}

    @Route(routes.view)
    view(
      @RouteInput() { params, query }: RouteInputOf<MoveRoutes['view']>,
      @CurrentUser() user: AuthUser,
    ) {
      return this.course.view(params.id, query.subscriptionId, user);
    }

    @Route(routes.check)
    @HttpCode(200)
    check(
      @RouteInput() { params, body }: RouteInputOf<MoveRoutes['check']>,
      @CurrentUser() user: AuthUser,
    ) {
      return this.course.check({ studentId: params.id, body, user });
    }

    @Route(routes.change)
    change(
      @RouteInput() { params, body }: RouteInputOf<MoveRoutes['change']>,
      @CurrentUser() user: AuthUser,
    ) {
      return this.course.change({ studentId: params.id, body, user });
    }
  }
  return CourseMoveRoutes;
}
