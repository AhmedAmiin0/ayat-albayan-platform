import { type CanActivate, Injectable } from '@nestjs/common';
import { notFound } from '@/common/http/errors';
import { loadEnv } from '@/config/env/env';

/**
 * The owner's rule (2026-10-28, go live 2026-11-01, docs/30): Stripe exists only with
 * FEATURE_STRIPE (test or live). Half one is that server env (stripeFeatureOn: no route is
 * mounted without it). Half two:
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
