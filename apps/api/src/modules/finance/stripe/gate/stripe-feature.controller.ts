import type { StripeFeature } from '@ab/shared';
import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../common/auth/decorators';
import { StripeSettingsQueries } from './stripe-settings.queries';

/**
 * GET /stripe/feature (no login): whether the payment links are on. Mounted only with FEATURE_STRIPE=test, so
 * a normal build answers 404 and its clients (which also need their own build flag) show nothing.
 */
@ApiTags('stripe')
@Public()
@Controller('stripe/feature')
export class StripeFeatureController {
  constructor(private readonly settings: StripeSettingsQueries) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async get(): Promise<StripeFeature> {
    return { stripe: (await this.settings.read()).stripe_enabled };
  }
}
