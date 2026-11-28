import { assistantsRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { AssistantsService } from './assistants.service';

/** The admin assigns assistants per student; an assistant reads only their own sessions. */
@ApiBearerAuth()
@Controller()
export class AssistantsController {
  constructor(private readonly assistants: AssistantsService) {}

  /** Every assistant login, for the picker. */
  @Route(routes.all)
  all() {
    return this.assistants.all();
  }

  @Route(routes.mine)
  mine(
    @RouteInput() { query }: RouteInputOf<typeof routes.mine>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assistants.mine({ profileId: user.id, day: query });
  }

  @Route(routes.forStudent)
  forStudent(@RouteInput() { params }: RouteInputOf<typeof routes.forStudent>) {
    return this.assistants.forStudent(params.id);
  }

  @Route(routes.assign)
  @HttpCode(200)
  assign(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.assign>,
    @CurrentUser() user: AuthUser,
  ) {
    const pick = { studentId: params.id, profileId: body.profileId };
    return this.assistants.assign({ ...pick, actorId: user.id });
  }

  @Route(routes.remove)
  remove(@RouteInput() { params }: RouteInputOf<typeof routes.remove>) {
    return this.assistants.remove(params.id, params.profileId);
  }
}
