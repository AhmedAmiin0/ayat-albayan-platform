import type { WaLine } from '@ab/shared';
import { z } from 'zod';
import type { Env } from './env';
import { blankIsUnset, optionalSecret } from './env.blank';
import type { CrmLineEnv } from './env.whatsapp';

/**
 * The crm driver (docs/19 «crm driver»): a line sends through the academy's self-hosted WA CRM's public
 * REST API (POST {base}/messages, Bearer key). The number and its templates are the CRM's: a crm line
 * has no phone_number_id, WABA, app id or Meta token of ours.
 */
export const CRM_SHAPE = {
  /**
   * The CRM's API base («https://<crm-host>/api/v1»). No default on purpose, like KAPSO_API_BASE: unset =
   * a line switched to crm is not configured (tests point it at tools/wa-stub's crm prefix).
   */
  WACRM_API_BASE: z.preprocess(blankIsUnset, z.url().optional()),
  /** The CRM's account-scoped API key (scope messages:send): the Bearer of every call (Vault via «التكاملات»). */
  WACRM_API_KEY: optionalSecret,
  /** HMAC key of POST /webhooks/wacrm (X-Wacrm-Signature). Unset = that route answers 401. */
  WACRM_WEBHOOK_SECRET: optionalSecret,
};

/** Both lines on crm would be one CRM account (one number) twice: the chat line then stays off (duplicate). */
export const bothOnCrm = (env: Env): boolean => env.WA_PROVIDER === 'crm' && env.WA_CHAT_PROVIDER === 'crm';

/** A line on crm: the CRM's base and key, nothing else. null (refuses every call, rows stay queued) while either is missing. */
export function crmLine(env: Env, line: WaLine): CrmLineEnv | null {
  const base = env.WACRM_API_BASE?.replace(/\/+$/, '');
  const apiKey = env.WACRM_API_KEY;
  if (!base || !apiKey || (line === 'chat' && bothOnCrm(env))) return null;
  return { provider: 'crm', base, apiKey };
}

/** NAMES (never values) of what a crm line still lacks (both lines on crm is a duplicate flag, not a gap). */
export function crmGaps(env: Env): string[] {
  const present: Record<string, string | undefined> = { WACRM_API_BASE: env.WACRM_API_BASE, WACRM_API_KEY: env.WACRM_API_KEY };
  return Object.keys(present).filter((k) => present[k] === undefined);
}

/** POST /webhooks/wacrm's HMAC key; never a Meta or Kapso secret (docs/19). */
export function crmWebhookSecret(env: Env): string | undefined {
  return env.WACRM_WEBHOOK_SECRET;
}
