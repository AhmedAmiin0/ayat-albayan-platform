import {
  integrationDef,
  stripeApiKey,
  stripeKeyLive,
  stripeMaxDiscountPct,
  stripeWebhookSecret,
  type IntegrationKey,
} from '@ab/catalog';
import { z } from 'zod';
import type { Env } from './env';
import { blankIsUnset } from './env.blank';

/** FEATURE_STRIPE is env only: test takes sandbox keys, live takes live keys, unset means none. */
const stripeMode = (env: NodeJS.ProcessEnv): 'test' | 'live' | undefined =>
  z.enum(['test', 'live']).safeParse(env.FEATURE_STRIPE).data;

export const stripeFeatureOn = (env: NodeJS.ProcessEnv = process.env): boolean =>
  stripeMode(env) !== undefined;

/** FEATURE_STRIPE=live: a live key is accepted and live events are processed. */
export const stripeLiveAllowed = (env: NodeJS.ProcessEnv = process.env): boolean =>
  stripeMode(env) === 'live';

/**
 * The server's check of STRIPE_API_KEY: the shared format, and the key's mode is the server's (a
 * live key only with FEATURE_STRIPE=live, a sandbox key only without; read when a value is checked,
 * like integrationKeyAvailable). Else 'stripe_live_key_refused': one in env fails the boot, one
 * saved in Vault is dropped from the overlay (a warning naming the key), one sent to
 * PUT .../secrets/STRIPE_API_KEY is 400.
 */
export const stripeServerKey = stripeApiKey.refine(
  (key) => stripeKeyLive(key) === stripeLiveAllowed(),
  'stripe_live_key_refused',
);

/** Stripe payment links (docs/30): switch and cap in integration_config, secrets in Vault. */
export const STRIPE_SHAPE = {
  /** Off by default: when off every Stripe route but the signed webhook is 404. */
  STRIPE_ENABLED: z.preprocess(blankIsUnset, z.stringbool().default(false)),
  STRIPE_API_KEY: z.preprocess(blankIsUnset, stripeServerKey.optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess(blankIsUnset, stripeWebhookSecret.optional()),
  /** Unset = no cap on a link's discount below the calculator price. */
  STRIPE_MAX_DISCOUNT_PCT: z.preprocess(blankIsUnset, stripeMaxDiscountPct.optional()),
};

/** Stripe keys are offered only with FEATURE_STRIPE; every list and write goes through this. */
export const integrationKeyAvailable = (
  key: IntegrationKey,
  env: NodeJS.ProcessEnv = process.env,
): boolean => integrationDef(key).group !== 'stripe' || stripeFeatureOn(env);

/** The links can work: the switch on and both keys saved (GET /stripe/feature: the buttons). */
export const stripeReady = (env: Env): boolean =>
  env.STRIPE_ENABLED && env.STRIPE_API_KEY !== undefined && env.STRIPE_WEBHOOK_SECRET !== undefined;

/** The saved key is live (= FEATURE_STRIPE=live, once a key is saved): no «test» on the pages. */
export const stripeKeyIsLive = (env: Env): boolean => stripeKeyLive(env.STRIPE_API_KEY ?? '');
