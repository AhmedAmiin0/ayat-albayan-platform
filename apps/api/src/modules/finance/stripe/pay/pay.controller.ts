import type { PublicPaymentLink } from '@ab/shared';
import { Controller, Get, Header, Ip, Param, Redirect, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../common/auth/decorators';
import { notFound } from '../../../../common/http/errors';
import { StripeEnabledGuard } from '../gate/stripe-gate';
import { toPublicLink } from '../links/payment-links.mapper';
import { PaymentLinksQueries } from '../links/payment-links.queries';
import { CheckoutService } from './checkout.service';
import { PayLimit } from './pay-limit';

/**
 * The family's payment page (no login; docs/30): GET /pay/:token is what the platform page shows (the first
 * name, the amount, the package; no other personal data), GET /pay/:token/checkout sends the browser to
 * Stripe Checkout (303). Rate-limited; 404 while Stripe is off.
 */
@ApiTags('stripe')
@Public()
@UseGuards(StripeEnabledGuard)
@Controller('pay')
export class PayController {
  constructor(
    private readonly links: PaymentLinksQueries,
    private readonly checkout: CheckoutService,
    private readonly limit: PayLimit,
  ) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  async get(@Param('token') token: string, @Ip() ip: string): Promise<PublicPaymentLink> {
    await this.limit.check(ip, token);
    const row = /^[A-Za-z0-9_-]{32,64}$/.test(token) ? await this.links.byToken(token) : null;
    if (!row) throw notFound('link_not_found');
    return toPublicLink(row, new Date());
  }

  @Get(':token/checkout')
  @Redirect()
  @Header('Cache-Control', 'no-store')
  async go(@Param('token') token: string, @Ip() ip: string): Promise<{ url: string; statusCode: number }> {
    await this.limit.check(ip, token);
    return { url: await this.checkout.target(token), statusCode: 303 };
  }
}
