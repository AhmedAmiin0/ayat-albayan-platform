import {
  integrationDef,
  stripeApiKey,
  stripeKeyLive,
  stripeMaxDiscountPct,
  stripeWebhookSecret,
  type IntegrationKey,
} from '@ab/shared';
import { z } from 'zod';
import type { Env } from './env';
import { blankIsUnset } from './env.blank';

/**
 * The owner's rule (2026-10-28, go live 2026-11-01): the server env FEATURE_STRIPE, never a DB value.
 * `test`: sandbox keys only. `live`: live keys too (a sandbox key still works, for a dry run). Anything
 * else (unset): no Stripe at all, the module mounts no route and «التكاملات» lists no Stripe key.
 */
const stripeMode = (env: NodeJS.ProcessEnv): 'test' | 'live' | undefined =>
  z.enum(['test', 'live']).safeParse(env.FEATURE_STRIPE).data;

export const stripeFeatureOn = (env: NodeJS.ProcessEnv = process.env): boolean => stripeMode(env) !== undefined;

/** FEATURE_STRIPE=live: a live key is accepted and live events are processed. */
export const stripeLiveAllowed = (env: NodeJS.ProcessEnv = process.env): boolean => stripeMode(env) === 'live';

/**
 * The server's check of STRIPE_API_KEY: the shared format, and a live key only with FEATURE_STRIPE=live
 * (read when a value is checked, like integrationKeyAvailable). Else 'stripe_live_key_refused': one in
 * env fails the boot, one saved by hand in Vault is dropped from the overlay (a warning naming the key),
 * one sent to PUT /settings/integrations/secrets/STRIPE_API_KEY is 400.
 */
export const stripeServerKey = stripeApiKey.refine((key) => !stripeKeyLive(key) || stripeLiveAllowed(), 'stripe_live_key_refused');

/**
 * Stripe payment links (docs/30, with FEATURE_STRIPE test or live), edited in «التكاملات» › «الدفع
 * الإلكتروني» like every integration key: the switch and the cap in integration_config, the two
 * secrets in Vault (integration:STRIPE_*), env the fallback.
 */
export const STRIPE_SHAPE = {
  /** «الدفع الإلكتروني», off by default: off = every Stripe route but the signed webhook is 404. */
  STRIPE_ENABLED: z.preprocess(blankIsUnset, z.stringbool().default(false)),
  STRIPE_API_KEY: z.preprocess(blankIsUnset, stripeServerKey.optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess(blankIsUnset, stripeWebhookSecret.optional()),
  /** Unset = no cap on a link's discount below the calculator price. */
  STRIPE_MAX_DISCOUNT_PCT: z.preprocess(blankIsUnset, stripeMaxDiscountPct.optional()),
};

/**
 * A key this server offers in «التكاملات»: the Stripe group only with FEATURE_STRIPE (test or live). The
 * list and every write go through it, so no Stripe key is listed, stored or cleared elsewhere.
 */
export const integrationKeyAvailable = (
  key: IntegrationKey,
  env: NodeJS.ProcessEnv = process.env,
): boolean => integrationDef(key).group !== 'stripe' || stripeFeatureOn(env);

/** The links can work: the switch on and both keys saved (GET /stripe/feature: the buttons). */
export const stripeReady = (env: Env): boolean =>
  env.STRIPE_ENABLED && env.STRIPE_API_KEY !== undefined && env.STRIPE_WEBHOOK_SECRET !== undefined;

/** The saved key is a live one: live events only are processed, and the pay pages drop the test notice. */
export const stripeKeyIsLive = (env: Env): boolean => stripeKeyLive(env.STRIPE_API_KEY ?? '');
