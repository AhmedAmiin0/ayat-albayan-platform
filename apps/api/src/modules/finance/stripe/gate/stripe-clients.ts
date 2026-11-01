import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { loadEnv } from '@/config/env/env';

/** The API version this integration is written and tested against (stripe-node 23.x). */
const STRIPE_API_VERSION = '2026-09-30.endive';

/** The part of the SDK we call: Checkout Sessions, Refunds (read) and webhook verification. */
export type StripeApi = Pick<Stripe, 'checkout' | 'refunds' | 'webhooks'>;
type StripeFactory = (key: string) => StripeApi;
export const STRIPE_FACTORY = Symbol('STRIPE_FACTORY');

/** One client per key (never the global key): the SDK's own retries, the pinned API version. */
export const stripeFactory: StripeFactory = (key) =>
  new Stripe(key, { apiVersion: STRIPE_API_VERSION, maxNetworkRetries: 2 });

const notConfigured = () =>
  new HttpException({ code: 'stripe_not_configured', message: 'stripe_not_configured' }, HttpStatus.SERVICE_UNAVAILABLE);

/**
 * A Stripe client from the keys in «التكاملات» (STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET: Vault or
 * env, read per call through the integration overlay like every integration key). The env schema
 * takes sandbox keys only, so a live key never gets here; no key → 503 stripe_not_configured.
 * Keys are never logged.
 */
@Injectable()
export class StripeClients {
  private cached: { key: string; api: StripeApi } | null = null;

  constructor(@Inject(STRIPE_FACTORY) private readonly factory: StripeFactory) {}

  client(): Promise<StripeApi> {
    const key = loadEnv().STRIPE_API_KEY;
    if (!key) return Promise.reject(notConfigured());
    if (this.cached?.key !== key) this.cached = { key, api: this.factory(key) };
    return Promise.resolve(this.cached.api);
  }

  webhookSecret(): Promise<string> {
    const secret = loadEnv().STRIPE_WEBHOOK_SECRET;
    return secret ? Promise.resolve(secret) : Promise.reject(notConfigured());
  }
}
