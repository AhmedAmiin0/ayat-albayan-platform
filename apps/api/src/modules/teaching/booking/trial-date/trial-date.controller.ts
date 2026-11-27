import { salesTrialDateRoutes, trialDateRoutes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { clientRequest } from '@/modules/teaching/booking/core/booking.payload';
import { SalesTrialDates } from '@/modules/teaching/booking/trial-date/sales-trial-date.service';
import { TrialDates } from './trial-date.service';

type AdminInput<K extends keyof typeof trialDateRoutes> = RouteInputOf<(typeof trialDateRoutes)[K]>;
type SalesInput<K extends keyof typeof salesTrialDateRoutes> = RouteInputOf<
  (typeof salesTrialDateRoutes)[K]
>;

/** Admin only; an upcoming trial moves (kept as rescheduled), else a new trial is booked. */
@ApiBearerAuth()
@Controller()
export class TrialDateController {
  constructor(private readonly dates: TrialDates) {}

  @Route(trialDateRoutes.history)
  history(@RouteInput() { query }: AdminInput<'history'>) {
    return this.dates.history(query.studentId);
  }

  @Route(trialDateRoutes.check)
  @HttpCode(200)
  async check(@RouteInput() { body }: AdminInput<'check'>) {
    return { conflicts: await this.dates.check(await this.dates.target(body)) };
  }

  @Route(trialDateRoutes.pick)
  async pick(@RouteInput() { body }: AdminInput<'pick'>, @CurrentUser() user: AuthUser) {
    const req = clientRequest(body, user.role);
    return (
      (await this.dates.replay(req, user.id)) ??
      this.dates.pick(await this.dates.target(req), user.id)
    );
  }
}

/** The same for an assistant from the family's chat, scoped like her trial booking. */
@ApiBearerAuth()
@Controller()
export class SalesTrialDateController {
  constructor(private readonly dates: SalesTrialDates) {}

  @Route(salesTrialDateRoutes.history)
  history(@RouteInput() { query }: SalesInput<'history'>, @CurrentUser() user: AuthUser) {
    return this.dates.history(query.studentId, user);
  }

  @Route(salesTrialDateRoutes.check)
  @HttpCode(200)
  async check(@RouteInput() { body }: SalesInput<'check'>, @CurrentUser() user: AuthUser) {
    return { conflicts: await this.dates.check(body, user) };
  }

  @Route(salesTrialDateRoutes.pick)
  pick(@RouteInput() { body }: SalesInput<'pick'>, @CurrentUser() user: AuthUser) {
    return this.dates.pick(body, user);
  }
}
