import { paymentLinkRoutes as routes, type PaymentLinkQuoteView, type PaymentLinkView } from '@ab/shared';
import { Controller, HttpCode, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import { isAdmin } from '@/common/auth/roles';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { StripeEnabledGuard } from '@/modules/finance/stripe/gate/stripe-gate';
import { LinkCancel } from './link-cancel';
import { LinkCreate } from './link-create';
import { LinkDeps } from './link-deps';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** Needs FEATURE_STRIPE and STRIPE_ENABLED (docs/30); her links only, admins see all. */
@ApiBearerAuth()
@UseGuards(StripeEnabledGuard)
@Controller()
export class PaymentLinksController {
  constructor(
    private readonly creates: LinkCreate,
    private readonly cancels: LinkCancel,
    private readonly deps: LinkDeps,
  ) {}

  @Route(routes.quote)
  @HttpCode(200)
  quote(@RouteInput() { body }: In<'quote'>): Promise<PaymentLinkQuoteView> {
    return this.creates.quote(body);
  }

  @Route(routes.create)
  create(@RouteInput() { body }: In<'create'>, @CurrentUser() user: AuthUser): Promise<PaymentLinkView> {
    return this.creates.create(body, user);
  }

  @Route(routes.list)
  async list(@RouteInput() { query }: In<'list'>, @CurrentUser() user: AuthUser): Promise<PaymentLinkView[]> {
    const rows = await this.deps.links.list({ createdBy: isAdmin(user) ? null : user.id });
    return this.deps.views.listed(rows, { status: query.status, now: new Date() });
  }

  @Route(routes.cancel)
  @HttpCode(200)
  cancel(@RouteInput() { params }: In<'cancel'>, @CurrentUser() user: AuthUser): Promise<PaymentLinkView> {
    return this.cancels.cancel(params.id, user);
  }
}
