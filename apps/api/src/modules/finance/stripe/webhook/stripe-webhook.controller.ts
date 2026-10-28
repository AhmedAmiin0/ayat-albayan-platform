import { Controller, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../common/auth/decorators';
import { StripeEnabledGuard } from '../gate/stripe-gate';
import { StripeWebhookService } from './stripe-webhook.service';

/** main.ts boots with rawBody: true, so the exact bytes Stripe signed are on req.rawBody (JSON parsed too). */
interface RawRequest {
  rawBody?: Buffer;
}

/** Public: authenticated by Stripe's signature (StripeWebhookService). Not mounted without FEATURE_STRIPE=test. */
@ApiTags('stripe')
@Public()
@UseGuards(StripeEnabledGuard)
@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private readonly webhook: StripeWebhookService) {}

  @Post()
  @HttpCode(200)
  receive(@Req() req: RawRequest, @Headers('stripe-signature') signature?: string): Promise<{ received: true }> {
    return this.webhook.handle({ rawBody: req.rawBody, signature });
  }
}
