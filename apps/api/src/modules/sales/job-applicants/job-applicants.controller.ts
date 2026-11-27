import { jobApplicantRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { JobApplicantsService } from './job-applicants.service';

/** Admin CRUD for job applicants (R-LEAD-04). */
@ApiTags('job-applicants')
@ApiBearerAuth()
@Permissions('applicants.write')
@Controller()
export class JobApplicantsController {
  constructor(private readonly applicants: JobApplicantsService) {}

  @Route(routes.list)
  @Permissions('applicants.read')
  list(@RouteInput() { query }: RouteInputOf<typeof routes.list>) {
    return this.applicants.list(query);
  }

  @Route(routes.get)
  @Permissions('applicants.read')
  get(@RouteInput() { params }: RouteInputOf<typeof routes.get>) {
    return this.applicants.get(params.id);
  }

  @Route(routes.create)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.applicants.create(body, user.id);
  }

  @Route(routes.update)
  update(@RouteInput() { params, body }: RouteInputOf<typeof routes.update>) {
    return this.applicants.update(params.id, body);
  }

  @Route(routes.changeStatus)
  changeStatus(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.changeStatus>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.applicants.changeStatus({ id: params.id, to: body.status, actorId: user.id });
  }

  @Route(routes.remove)
  @HttpCode(204)
  remove(
    @RouteInput() { params }: RouteInputOf<typeof routes.remove>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.applicants.remove({ id: params.id, actorId: user.id });
  }
}
