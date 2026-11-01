import type { PublicPaymentLink } from '@ab/shared';
import { Controller, Get, Header, Ip, Param, Redirect, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../common/auth/decorators';
import { notFound } from '../../../../common/http/errors';
import { stripeLiveAllowed } from '../../../../config/env/env.stripe';
import { StripeEnabledGuard } from '../gate/stripe-gate';
import { apiPublicOrigin } from '../links/link-views';
import { toPublicLink } from '../links/payment-links.mapper';
import { PaymentLinksQueries } from '../links/payment-links.queries';
import { CheckoutService } from './checkout.service';
import { notFoundPageHtml, payPageHtml, resultPageHtml } from './pay-html';
import { PayLimit } from './pay-limit';
import { appCookie, appPlatform, appReturnUrl, fromApp } from './pay-return';
import { html, isLinkToken, wantsJson, type HtmlReply, type PayRequest } from './pay-reply';

/**
 * The family's payment pages, served by the API (no login, no web build; docs/30): GET /pay/:token is a small
 * Arabic page (the first name, the package, the amount; no other personal data) whose «ادفع الآن» opens
 * GET /pay/:token/checkout (303 to Stripe Checkout); Stripe comes back to /done or /cancelled (text only;
 * a link the app opened also gets «العودة إلى التطبيق», pay-return.ts).
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
    if (!view) return html(res, { status: 404, body: notFoundPageHtml() });
    // Opened from the app: Stripe's way back to /done or /cancelled carries this mark (pay-return.ts).
    const os = appPlatform(req.query?.from);
    if (os) res.header('Set-Cookie', appCookie(token, os));
    return html(res, { status: 200, body: payPageHtml(view, token) });
  }

  @Get(':token/checkout')
  @Redirect()
  @Header('Cache-Control', 'no-store')
  async go(@Param('token') token: string, @Ip() ip: string): Promise<{ url: string; statusCode: number }> {
    await this.limit.check(ip, token);
    return { url: await this.checkout.target(token), statusCode: 303 };
  }

  @Get(':token/done')
  async done(@Req() req: PayRequest, @Res({ passthrough: true }) res: HtmlReply): Promise<string> {
    return this.result({ kind: 'done', req, res });
  }

  @Get(':token/cancelled')
  async cancelled(@Req() req: PayRequest, @Res({ passthrough: true }) res: HtmlReply): Promise<string> {
    return this.result({ kind: 'cancelled', req, res });
  }

  private async result(r: { kind: 'done' | 'cancelled'; req: PayRequest; res: HtmlReply }): Promise<string> {
    const token = r.req.params.token ?? '';
    await this.limit.check(r.req.ip, token);
    if (!isLinkToken(token) || !(await this.links.byToken(token))) return html(r.res, { status: 404, body: notFoundPageHtml() });
    const os = fromApp(r.req.headers.cookie);
    const back = { token, kind: r.kind, payOrigin: apiPublicOrigin(), android: os === 'android', live: stripeLiveAllowed() };
    const app = os ? appReturnUrl(back) : null;
    const auto = r.req.query?.auto !== '0';
    return html(r.res, { status: 200, body: resultPageHtml({ kind: r.kind, token, app, auto }) });
  }
}
