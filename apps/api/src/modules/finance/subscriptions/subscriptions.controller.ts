import type { QuoteResponse, SubscriptionPage, SubscriptionView } from '@ab/money';
import { subscriptionRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SubscriptionCancel } from './cancel/subscription-cancel.service';
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
