import { pushTokenRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { MeService } from './me.service';

/** The admin app's device registration (R-MOB-01). Always the caller's own profile, never an id. */
@ApiTags('me')
@ApiBearerAuth()
@Permissions('notifications.push')
@Controller()
export class MeController {
  constructor(private readonly me: MeService) {}

  /** (Re)binds the token to the caller's session, taking it off any other profile. */
  @Route(routes.add)
  @HttpCode(200)
  add(@RouteInput() { body }: RouteInputOf<typeof routes.add>, @CurrentUser() user: AuthUser) {
    const { token, deviceKey } = body;
    return this.me.addPushToken({
      userId: user.id,
      token,
      deviceKey,
      sessionId: user.sessionId ?? null,
    });
  }

  /** The client sends the token URL-encoded (the brackets). */
  @Route(routes.remove)
  @HttpCode(204)
  remove(
    @RouteInput() { params }: RouteInputOf<typeof routes.remove>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.me.removePushToken(user.id, params.token);
  }
}
