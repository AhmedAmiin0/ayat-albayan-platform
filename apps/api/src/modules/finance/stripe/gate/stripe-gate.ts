import { type CanActivate, Injectable } from '@nestjs/common';
import { notFound } from '../../../../common/http/errors';
import { StripeSettingsQueries } from './stripe-settings.queries';

/**
 * The owner's hard rule (2026-10-28, docs/30): Stripe exists ONLY in the test build. Half one, the server env:
 * FEATURE_STRIPE=test (set nowhere by default; staging only, docs/09) or the module mounts no route at all.
 */
export const stripeFeatureOn = (env: NodeJS.ProcessEnv = process.env): boolean => env.FEATURE_STRIPE === 'test';

/** Half two, the DB switch stripe_settings.stripe_enabled (default false): off → every Stripe route is 404. */
@Injectable()
export class StripeEnabledGuard implements CanActivate {
  constructor(private readonly settings: StripeSettingsQueries) {}

  async canActivate(): Promise<boolean> {
    if (!(await this.settings.read()).stripe_enabled) throw notFound('not_found');
    return true;
  }
}
