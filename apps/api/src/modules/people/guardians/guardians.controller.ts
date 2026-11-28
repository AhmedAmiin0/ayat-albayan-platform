import { guardianRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { GuardianPhonesService } from './guardian-phones.service';
import { GuardiansService } from './guardians.service';

/** Admin-only guardians CRUD (R-STU-02, R-STU-04). */
@ApiBearerAuth()
@Controller()
export class GuardiansController {
  constructor(
    private readonly guardians: GuardiansService,
    private readonly phones: GuardianPhonesService,
  ) {}

  @Route(routes.list)
  list(@RouteInput() { query }: RouteInputOf<typeof routes.list>) {
    return this.guardians.list(query);
  }

  @Route(routes.get)
  get(@RouteInput() { params }: RouteInputOf<typeof routes.get>) {
    return this.guardians.get(params.id);
  }

  @Route(routes.create)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.guardians.create(body, user.id);
  }

  @Route(routes.update)
  update(@RouteInput() { params, body }: RouteInputOf<typeof routes.update>) {
    return this.guardians.update(params.id, body);
  }

  @Route(routes.remove)
  @HttpCode(204)
  remove(@RouteInput() { params }: RouteInputOf<typeof routes.remove>) {
    return this.guardians.remove(params.id);
  }

  /** `phone` arrives URL-encoded (%2B…). */
  @Route(routes.removePhone)
  @HttpCode(204)
  removePhone(
    @RouteInput() { params }: RouteInputOf<typeof routes.removePhone>,
    @CurrentUser() user: AuthUser,
  ) {
    const { id: guardianId, phone } = params;
    return this.phones.removeSecond({ guardianId, phone, actorId: user.id });
  }
}
