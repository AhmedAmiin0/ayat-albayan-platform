import type { StripeFeature } from '@ab/shared';
import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { loadEnv } from '@/config/env/env';
import { stripeReady } from '@/config/env/env.stripe';

/**
 * GET /stripe/feature (no login): whether the apps show the online-payment buttons, i.e.
 * «الدفع الإلكتروني» is on AND both keys are saved. Mounted only with FEATURE_STRIPE=test, so a
 * normal build answers 404 and its clients (which also need their own build flag) show nothing.
 */
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
