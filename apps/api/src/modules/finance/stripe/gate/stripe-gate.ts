import { type CanActivate, Injectable } from '@nestjs/common';
import { notFound } from '@/common/http/errors';
import { loadEnv } from '@/config/env/env';

/** Stripe needs FEATURE_STRIPE and STRIPE_ENABLED; off is 404 except the webhook (docs/30). */
@Injectable()
export class StripeEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!loadEnv().STRIPE_ENABLED) throw notFound('not_found');
    return true;
  }
}
