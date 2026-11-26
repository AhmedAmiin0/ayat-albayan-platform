import { stripeRoutes as routes, type StripeFeature } from '@ab/shared';
import { Controller, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { Route } from '@/common/http/route';
import { loadEnv } from '@/config/env/env';
import { stripeReady } from '@/config/env/env.stripe';

/** True only when online payment is on and both keys are saved; needs FEATURE_STRIPE. */
@ApiTags('stripe')
@Public()
@Controller()
export class StripeFeatureController {
  @Route(routes.feature)
  @Header('Cache-Control', 'no-store')
  get(): StripeFeature {
    return { stripe: stripeReady(loadEnv()) };
  }
}
