import type { StripeFeature } from '@ab/shared';
import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { loadEnv } from '@/config/env/env';
import { stripeReady } from '@/config/env/env.stripe';

/** True only when online payment is on and both keys are saved; needs FEATURE_STRIPE. */
@ApiTags('stripe')
@Public()
@Controller('stripe/feature')
export class StripeFeatureController {
  @Get()
  @Header('Cache-Control', 'no-store')
  get(): StripeFeature {
    return { stripe: stripeReady(loadEnv()) };
  }
}
