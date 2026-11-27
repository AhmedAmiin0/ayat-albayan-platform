import { salesPackageCancelRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { AnyPackageCancel } from './any-package-cancel.service';

/** Own students only if the ownership rule is enforced. */
@ApiBearerAuth()
@Controller()
export class AnyPackageCancelController {
  constructor(private readonly cancels: AnyPackageCancel) {}

  @Route(routes.check)
  async check(
    @RouteInput() { params }: RouteInputOf<typeof routes.check>,
    @CurrentUser() user: AuthUser,
  ) {
    return asResponse(routes.check.response, await this.cancels.check(params.id, user));
  }

  @Route(routes.cancel)
  @HttpCode(200)
  cancel(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.cancel>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cancels.cancel(params.id, body, user);
  }
}
