import type { PublicPaymentLink } from '@ab/shared';
import { Controller, Get, Header, Ip, Param, Redirect, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../common/auth/decorators';
import { notFound } from '../../../../common/http/errors';
import { StripeEnabledGuard } from '../gate/stripe-gate';
import { toPublicLink } from '../links/payment-links.mapper';
import { PaymentLinksQueries } from '../links/payment-links.queries';
import { CheckoutService } from './checkout.service';
import { notFoundPageHtml, payPageHtml, resultPageHtml } from './pay-html';
import { PayLimit } from './pay-limit';
import { html, isLinkToken, wantsJson, type HtmlReply, type PayRequest } from './pay-reply';

/**
 * The family's payment pages, served by the API (no login, no web build; docs/30): GET /pay/:token is a small
 * Arabic page (the first name, the package, the amount; no other personal data) whose «ادفع الآن» opens
 * GET /pay/:token/checkout (303 to Stripe Checkout); Stripe comes back to /done or /cancelled (text only).
 * The web PayPage still reads GET /pay/:token as JSON (Accept: application/json). Rate-limited; 404 while
 * Stripe is off.
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
  async get(@Req() req: PayRequest, @Res({ passthrough: true }) res: HtmlReply): Promise<PublicPaymentLink | string> {
    const token = req.params.token ?? '';
    await this.limit.check(req.ip, token);
    const row = isLinkToken(token) ? await this.links.byToken(token) : null;
    const view = row ? toPublicLink(row, new Date()) : null;
    res.header('Vary', 'Accept');
    if (wantsJson(req)) {
      if (!view) throw notFound('link_not_found');
      return view;
    }
    return view ? html(res, { status: 200, body: payPageHtml(view, token) }) : html(res, { status: 404, body: notFoundPageHtml() });
  }

  @Get(':token/checkout')
  @Redirect()
  @Header('Cache-Control', 'no-store')
  async go(@Param('token') token: string, @Ip() ip: string): Promise<{ url: string; statusCode: number }> {
    await this.limit.check(ip, token);
    return { url: await this.checkout.target(token), statusCode: 303 };
  }

  @Get(':token/done')
  async done(@Param('token') token: string, @Ip() ip: string, @Res({ passthrough: true }) res: HtmlReply): Promise<string> {
    return this.result({ kind: 'done', token, ip, res });
  }

  @Get(':token/cancelled')
  async cancelled(@Param('token') token: string, @Ip() ip: string, @Res({ passthrough: true }) res: HtmlReply): Promise<string> {
    return this.result({ kind: 'cancelled', token, ip, res });
  }

  private async result(r: { kind: 'done' | 'cancelled'; token: string; ip: string; res: HtmlReply }): Promise<string> {
    await this.limit.check(r.ip, r.token);
    if (!isLinkToken(r.token) || !(await this.links.byToken(r.token))) return html(r.res, { status: 404, body: notFoundPageHtml() });
    return html(r.res, { status: 200, body: resultPageHtml(r.kind, r.token) });
  }
}
