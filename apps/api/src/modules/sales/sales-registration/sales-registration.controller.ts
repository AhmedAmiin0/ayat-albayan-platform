import { registrationCheckRoutes as routes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SalesRegistrationService } from './sales-registration.service';

/** docs/16 row 23: at most 10 children, no ids, phones, money or notes; rate-limited. */
@ApiBearerAuth()
@Controller()
export class SalesRegistrationController {
  constructor(private readonly registration: SalesRegistrationService) {}

  @Route(routes.check)
  check(@RouteInput() { query }: RouteInputOf<typeof routes.check>, @CurrentUser() user: AuthUser) {
    return this.registration.check(user, query);
  }
}
