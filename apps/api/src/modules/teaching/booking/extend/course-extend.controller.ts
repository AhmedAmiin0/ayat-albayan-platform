import { courseCardRoutes as routes } from '@ab/shared';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { CourseExtend } from './course-extend.service';

/** courses.reschedule; own students while the ownership rule holds; 404 and 409 codes. */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('courses.reschedule')
@Controller()
export class CourseExtendController {
  constructor(@Inject(CourseExtend) private readonly extend: CourseExtend) {}

  @Route(routes.extendPreview)
  preview(
    @RouteInput() { params, query }: RouteInputOf<typeof routes.extendPreview>,
    @CurrentUser() user: AuthUser,
  ) {
    const { subscriptionId } = query;
    return this.extend.preview({ studentId: params.id, subscriptionId, user });
  }

  @Route(routes.extend)
  @HttpCode(200)
  book(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.extend>,
    @CurrentUser() user: AuthUser,
  ) {
    const { subscriptionId } = body;
    return this.extend.extend({ studentId: params.id, subscriptionId, user });
  }
}
