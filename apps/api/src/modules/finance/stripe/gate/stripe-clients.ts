import { isStripeTestKey } from '@ab/shared';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { StripeSettingsQueries } from './stripe-settings.queries';

/** The API version this integration is written and tested against (stripe-node 23.x). */
const STRIPE_API_VERSION = '2026-09-30.endive';

/** The part of the SDK we call: Checkout Sessions, Refunds (read) and webhook verification. */
export type StripeApi = Pick<Stripe, 'checkout' | 'refunds' | 'webhooks'>;
type StripeFactory = (key: string) => StripeApi;
export const STRIPE_FACTORY = Symbol('STRIPE_FACTORY');

/** One client per key (never the global key): the SDK's own retries, the pinned API version. */
export const stripeFactory: StripeFactory = (key) => new Stripe(key, { apiVersion: STRIPE_API_VERSION, maxNetworkRetries: 2 });

const unavailable = (code: string) => new HttpException({ code, message: code }, HttpStatus.SERVICE_UNAVAILABLE);

/**
 * A Stripe client from the restricted key the owner saved in Vault (/admin/settings). The test build accepts
 * TEST keys only: a live key (saved before the DB check existed, or edited in Vault by hand) is refused here
 * as well (503 stripe_live_key_refused); no key → 503 stripe_not_configured. Keys are never logged.
 */
@Injectable()
export class StripeClients {
  private cached: { key: string; api: StripeApi } | null = null;

  constructor(
    private readonly settings: StripeSettingsQueries,
    @Inject(STRIPE_FACTORY) private readonly factory: StripeFactory,
  ) {}

  async client(): Promise<StripeApi> {
    const key = await this.settings.secret('api_key');
    if (!key) throw unavailable('stripe_not_configured');
    if (!isStripeTestKey(key)) throw unavailable('stripe_live_key_refused');
    if (this.cached?.key !== key) this.cached = { key, api: this.factory(key) };
    return this.cached.api;
  }

  async webhookSecret(): Promise<string> {
    const secret = await this.settings.secret('webhook_secret');
    if (!secret) throw unavailable('stripe_not_configured');
    return secret;
  }
}
