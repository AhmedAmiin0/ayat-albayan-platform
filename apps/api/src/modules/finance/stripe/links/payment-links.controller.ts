import { paymentLinkCreateSchema, paymentLinkListSchema, paymentLinkQuoteSchema, type PaymentLinkQuoteView, type PaymentLinkView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { StripeEnabledGuard } from '../gate/stripe-gate';
import { LinkCancel } from './link-cancel';
import { LinkCreate } from './link-create';
import { LinkDeps } from './link-deps';

/**
 * «رابط دفع» from the sales chat (owner 2026-10-28, docs/30; mounted with FEATURE_STRIPE (test or live),
 * 404 while «الدفع الإلكتروني» (STRIPE_ENABLED) is off). self.sales_money, like «اشتراك جديد». Her links only; an
 * admin sees every link.
 */
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('self.sales_money')
@UseGuards(StripeEnabledGuard)
@Controller('sales/payment-links')
export class PaymentLinksController {
  constructor(
    private readonly creates: LinkCreate,
    private readonly cancels: LinkCancel,
    private readonly deps: LinkDeps,
  ) {}

  @Post('quote')
  @HttpCode(200)
  quote(@Body() body: unknown): Promise<PaymentLinkQuoteView> {
    return this.creates.quote(parseOrThrow(paymentLinkQuoteSchema, body));
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<PaymentLinkView> {
    return this.creates.create(parseOrThrow(paymentLinkCreateSchema, body), user);
  }

  @Get()
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<PaymentLinkView[]> {
    const { status } = parseOrThrow(paymentLinkListSchema, query);
    const rows = await this.deps.links.list({ createdBy: user.role === 'admin' ? null : user.id });
    const now = new Date();
    // By the status it reads as now: an open link past its expiry is listed as expired.
    return rows.map((r) => this.deps.views.one(r, now)).filter((v) => !status || v.status === status);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<PaymentLinkView> {
    return this.cancels.cancel(id, user);
  }
}
