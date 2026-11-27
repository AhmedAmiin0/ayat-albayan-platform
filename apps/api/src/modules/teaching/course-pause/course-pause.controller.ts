import { coursePauseRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { CoursePausePreviews } from './preview/course-pause.preview';
import { CoursePauseService } from './course-pause.service';

/** Course pause (docs/11 §7b): courses.pause for any student; a pause queues no message. */
@ApiTags('course-pause')
@ApiBearerAuth()
@Permissions('courses.pause')
@Controller()
export class CoursePauseController {
  constructor(
    private readonly pauses: CoursePauseService,
    private readonly previews: CoursePausePreviews,
  ) {}

  @Route(routes.state)
  state(@RouteInput() { params }: RouteInputOf<typeof routes.state>) {
    return this.pauses.state(params.id);
  }

  @Route(routes.preview)
  preview(@RouteInput() { params, query }: RouteInputOf<typeof routes.preview>) {
    return this.previews.preview(params.id, query);
  }

  @Route(routes.resumePreview)
  resumePreview(@RouteInput() { params }: RouteInputOf<typeof routes.resumePreview>) {
    return this.previews.resume(params.id);
  }

  @Route(routes.start)
  @HttpCode(201)
  start(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.start>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pauses.start({ studentId: params.id, body, actor: user });
  }

  @Route(routes.until)
  until(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.until>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pauses.setUntil({ studentId: params.id, body, actor: user });
  }

  @Route(routes.resume)
  @HttpCode(200)
  resume(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.resume>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pauses.resume({ studentId: params.id, body, actor: user });
  }
}
