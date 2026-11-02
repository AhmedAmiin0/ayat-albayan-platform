import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../common/auth/decorators';
import { StripeWebhookService } from './stripe-webhook.service';

/** main.ts boots with rawBody: true, so the exact bytes Stripe signed are on req.rawBody (JSON parsed too). */
interface RawRequest {
  rawBody?: Buffer;
}

/**
 * Public: authenticated by Stripe's signature (StripeWebhookService). Not mounted without FEATURE_STRIPE (test or live).
 * NOT behind the DB switch: a session opened (or an async payment started) before the admin turned Stripe off
 * must still be recorded, as must its refunds.
 */
@ApiTags('stripe')
@Public()
@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private readonly webhook: StripeWebhookService) {}

  @Post()
  @HttpCode(200)
  receive(@Req() req: RawRequest, @Headers('stripe-signature') signature?: string): Promise<{ received: true }> {
    return this.webhook.handle({ rawBody: req.rawBody, signature });
  }
}
