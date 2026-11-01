import { stripeApiKey, stripeMaxDiscountPct, stripeWebhookSecret } from '@ab/shared';
import { z } from 'zod';
import type { Env } from './env';
import { blankIsUnset } from './env.blank';

/**
 * Stripe payment links (docs/30, TEST BUILD ONLY), edited in «التكاملات» › «الدفع الإلكتروني» like
 * every integration key: the switch and the cap in integration_config, the two secrets in Vault
 * (integration:STRIPE_*), env the fallback. The key checks refuse a live key: one saved by hand in
 * Vault is dropped from the overlay (a warning naming the key), one in env fails the boot.
 */
export const STRIPE_SHAPE = {
  /** «الدفع الإلكتروني», off by default: off = every Stripe route but the signed webhook is 404. */
  STRIPE_ENABLED: z.preprocess(blankIsUnset, z.stringbool().default(false)),
  STRIPE_API_KEY: z.preprocess(blankIsUnset, stripeApiKey.optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess(blankIsUnset, stripeWebhookSecret.optional()),
  /** Unset = no cap on a link's discount below the calculator price. */
  STRIPE_MAX_DISCOUNT_PCT: z.preprocess(blankIsUnset, stripeMaxDiscountPct.optional()),
};

/**
 * The owner's rule (2026-10-28): the server env FEATURE_STRIPE=test, never a DB value (staging
 * only, docs/09). Without it the module mounts no route and «التكاملات» lists no Stripe key.
 */
export const stripeFeatureOn = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.FEATURE_STRIPE === 'test';

/** The links can work: the switch on and both keys saved (GET /stripe/feature: the buttons). */
export const stripeReady = (env: Env): boolean =>
  env.STRIPE_ENABLED && env.STRIPE_API_KEY !== undefined && env.STRIPE_WEBHOOK_SECRET !== undefined;
