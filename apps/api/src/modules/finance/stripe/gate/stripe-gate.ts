import { type CanActivate, Injectable } from '@nestjs/common';
import { notFound } from '@/common/http/errors';
import { loadEnv } from '@/config/env/env';

/**
 * The owner's hard rule (2026-10-28, docs/30): Stripe exists ONLY in the test build. Half one is
 * the server env FEATURE_STRIPE=test (stripeFeatureOn: no route is mounted without it). Half two:
 * «الدفع الإلكتروني» in «التكاملات» (STRIPE_ENABLED, default off): off → every Stripe route but the
 * signed webhook is 404.
 */
@Injectable()
export class StripeEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!loadEnv().STRIPE_ENABLED) throw notFound('not_found');
    return true;
  }
}
