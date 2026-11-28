import { stripeRoutes as routes, type StripeWebhookAnswer } from '@ab/shared';
import { Controller, Headers, HttpCode, Req } from '@nestjs/common';
import { Route } from '@/common/http/route';
import { StripeWebhookService } from './stripe-webhook.service';

/** main.ts boots with rawBody: true, so the exact bytes Stripe signed are on req.rawBody (JSON parsed too). */
interface RawRequest {
  rawBody?: Buffer;
}

/**
 * Authenticated by Stripe's signature (StripeWebhookService). Not mounted without FEATURE_STRIPE (test or live).
 * NOT behind the DB switch: a session opened (or an async payment started) before the admin turned Stripe off
 * must still be recorded, as must its refunds.
 */
@Controller()
export class StripeWebhookController {
  constructor(private readonly webhook: StripeWebhookService) {}

  @Route(routes.webhook)
  @HttpCode(200)
  receive(
    @Req() req: RawRequest,
    @Headers('stripe-signature') signature?: string,
  ): Promise<StripeWebhookAnswer> {
    return this.webhook.handle({ rawBody: req.rawBody, signature });
  }
}
