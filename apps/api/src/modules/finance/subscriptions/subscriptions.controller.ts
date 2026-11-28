import type {
  QuoteResponse,
  StudentBalanceAnswer,
  SubscriptionPage,
  SubscriptionView,
} from '@ab/money';
import { studentBalanceRoutes, subscriptionRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SubscriptionCancel } from './cancel/subscription-cancel.service';
import { toTeacherBalance } from './money/balance.teacher';
import { PackagesService } from './money/packages.service';
import { StudentAccess } from './student-lifecycle/student-access';
import { SubscriptionCreator } from './shared/subscription-creator';
import { SubscriptionsService } from './shared/subscriptions.service';
import { assertUsedBefore } from './used-before';

/** Packages (S1–S5, R-SUB-01). Admin only; the price comes from the catalog, never the body. */
@ApiBearerAuth()
@Controller()
export class SubscriptionsController {
  constructor(
    private readonly subs: SubscriptionsService,
    private readonly creator: SubscriptionCreator,
    private readonly cancels: SubscriptionCancel,
  ) {}

  @Route(routes.list)
  list(@RouteInput() { query }: RouteInputOf<typeof routes.list>): Promise<SubscriptionPage> {
    return this.subs.list(query);
  }

  @Route(routes.create)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ): Promise<SubscriptionView> {
    assertUsedBefore(body, user);
    return this.creator.create(body, user.id);
  }

  /** The price the create would store, shown in the dialog before saving. */
  @Route(routes.quote)
  @HttpCode(200)
  quote(@RouteInput() { body }: RouteInputOf<typeof routes.quote>): Promise<QuoteResponse> {
    return this.creator.quote(body);
  }

  @Route(routes.get)
  get(@RouteInput() { params }: RouteInputOf<typeof routes.get>): Promise<SubscriptionView> {
    return this.subs.get(params.id);
  }

  @Route(routes.update)
  update(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.update>,
    @CurrentUser() user: AuthUser,
  ): Promise<SubscriptionView> {
    return this.subs.update(params.id, body, user.id);
  }

  /** The package stays, marked cancelled; 409 already_cancelled, has_payments or has_lessons. */
  @Route(routes.cancel)
  @HttpCode(200)
  async cancel(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.cancel>,
    @CurrentUser() user: AuthUser,
  ): Promise<SubscriptionView> {
    const view = await this.cancels.view(params.id);
    return this.cancels.cancel(view, { ...body, actorId: user.id });
  }

  @Route(routes.remove)
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @RouteInput() { params }: RouteInputOf<typeof routes.remove>,
  ): Promise<void> {
    return this.subs.remove(params.id, user.id);
  }
}

/** GET /students/:id/balance (S6, R-SUB-01/03): admin, or the student's teacher. */
@ApiBearerAuth()
@Controller()
export class StudentBalanceController {
  constructor(
    private readonly packages: PackagesService,
    private readonly access: StudentAccess,
  ) {}

  @Route(studentBalanceRoutes.get)
  async balance(
    @RouteInput() { params }: RouteInputOf<typeof studentBalanceRoutes.get>,
    @CurrentUser() user: AuthUser,
  ): Promise<StudentBalanceAnswer> {
    await this.access.check(user, params.id);
    const balance = await this.packages.studentBalance(params.id);
    // Permission, not scope: who may see the full package money view (the admin; a teacher not).
    return can(user, 'subscriptions.read') ? balance : toTeacherBalance(balance);
  }
}
