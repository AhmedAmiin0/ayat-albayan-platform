import { WA_PROVIDERS } from '@ab/shared';
import { z } from 'zod';
import type { Env } from '../env';
import { blankIsUnset, optionalSecret } from '../env.blank';
import type { KapsoLineEnv } from './env.whatsapp';

const provider = z.preprocess(blankIsUnset, z.enum(WA_PROVIDERS).default('meta'));

/**
 * WhatsApp drivers (docs/19-messaging-drivers.md): each line sends through Meta's Cloud API
 * directly (meta, the default) or through Kapso's Meta proxy (kapso). A manual per-line switch only,
 * never an automatic failover (an uncertain send could go out twice).
 */
export const KAPSO_SHAPE = {
  /** The notifications line's driver. */
  WA_PROVIDER: provider,
  /** The chat line's driver. */
  WA_CHAT_PROVIDER: provider,
  /**
   * Kapso's Meta proxy base. No default on purpose, like WA_API_BASE: unset = a line switched to
   * kapso is not configured (e2e points it at tools/wa-stub's kapso prefix).
   */
  KAPSO_API_BASE: z.preprocess(blankIsUnset, z.url().optional()),
  KAPSO_API_VERSION: z.preprocess(blankIsUnset, z.string().regex(/^v\d+\.\d+$/).default('v24.0')),
  /** Kapso project API key: the X-API-Key of every proxied call (Vault via «التكاملات», or env). */
  KAPSO_API_KEY: optionalSecret,
  /** HMAC key of POST /webhooks/kapso (X-Webhook-Signature). Unset = that route answers 401. */
  KAPSO_WEBHOOK_SECRET: optionalSecret,
};

type KapsoLine = 'notifications' | 'chat';

/** The per-line ids a kapso line reuses (the same WA_* / WA_CHAT_* keys as under meta), by key name. */
function idsOf(env: Env, line: KapsoLine) {
  return line === 'chat'
    ? { WA_CHAT_PHONE_NUMBER_ID: env.WA_CHAT_PHONE_NUMBER_ID, WA_CHAT_WABA_ID: env.WA_CHAT_WABA_ID }
    : { WA_PHONE_NUMBER_ID: env.WA_PHONE_NUMBER_ID, WA_WABA_ID: env.WA_WABA_ID };
}

/** A chat id equal to the notifications one would make two lines of one number: refused under either driver. */
export const duplicateChatPhone = (env: Env): boolean =>
  env.WA_CHAT_PHONE_NUMBER_ID !== undefined && env.WA_CHAT_PHONE_NUMBER_ID === env.WA_PHONE_NUMBER_ID;
const sameNumber = (env: Env, line: KapsoLine) => line === 'chat' && duplicateChatPhone(env);

/**
 * A line on kapso: Kapso's base and version, the line's own ids, the project key; never an app id
 * or a Meta token. null (refuses every call, rows stay queued) while any piece is missing.
 */
export function kapsoLine(env: Env, line: KapsoLine): KapsoLineEnv | null {
  const [phoneNumberId, wabaId] = Object.values(idsOf(env, line));
  const base = env.KAPSO_API_BASE?.replace(/\/+$/, '');
  const apiKey = env.KAPSO_API_KEY;
  if (!base || !phoneNumberId || !wabaId || !apiKey || sameNumber(env, line)) return null;
  return { provider: 'kapso', base, version: env.KAPSO_API_VERSION, phoneNumberId, wabaId, apiKey };
}

/** NAMES (never values) of what a kapso line still lacks (a duplicate chat id is duplicateChatPhone, not a gap). */
export function kapsoGaps(env: Env, line: KapsoLine): string[] {
  const present: Record<string, string | undefined> = {
    ...idsOf(env, line),
    KAPSO_API_BASE: env.KAPSO_API_BASE,
    KAPSO_API_KEY: env.KAPSO_API_KEY,
  };
  return Object.keys(present).filter((k) => present[k] === undefined);
}
