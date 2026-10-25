import { vapidPublicKey, vapidSubject } from '@ab/shared';
import { z } from 'zod';
import type { Env } from './env';
import { blankIsUnset } from './env.blank';
import type { VapidKeys } from '../../common/push/web-push.vapid';

/**
 * Browser push (R-NOT-02, docs/09). All three or none: any unset = browser push is off (GET
 * /me/web-push/key answers null, nothing is sent). Generated once with the one-liner in docs/09;
 * the private key is a secret (Vault via «التكاملات», or env), never committed.
 */
export const WEB_PUSH_SHAPE = {
  WEB_PUSH_VAPID_PUBLIC_KEY: z.preprocess(blankIsUnset, vapidPublicKey.optional()),
  /** 32-byte P-256 private key, base64url. */
  WEB_PUSH_VAPID_PRIVATE_KEY: z.preprocess(blankIsUnset, z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional()),
  WEB_PUSH_SUBJECT: z.preprocess(blankIsUnset, vapidSubject.optional()),
};

export function webPushEnv(env: Env): VapidKeys | null {
  const { WEB_PUSH_VAPID_PUBLIC_KEY: publicKey, WEB_PUSH_VAPID_PRIVATE_KEY: privateKey, WEB_PUSH_SUBJECT: subject } = env;
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}
