import { z } from 'zod';
import { blankIsUnset } from './env.blank';

/**
 * Family accounts (docs/30 §3): the HMAC pepper of the WhatsApp sign-in / password codes (>= 32 chars,
 * Vault or env, never committed). Unset = no code is ever issued (GET /auth/code/status says unavailable).
 * Changing it only voids the codes in flight (10 minutes).
 */
export const LOGIN_CODE_SHAPE = {
  LOGIN_CODE_PEPPER: z.preprocess(blankIsUnset, z.string().min(32).optional()),
};
