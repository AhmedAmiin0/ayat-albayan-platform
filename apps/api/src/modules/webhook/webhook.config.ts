import { overlayNumbers, type OverlayNumber } from '../../common/integrations/numbers-overlay';
import { appSecrets, kapsoWebhookSecret, lineNumbers, type Env } from '../../env';
import type { WebhookConfig } from './webhook.service';

/**
 * Webhook settings from env (docs/12 §13.6). The chat number comes from WA_CHAT_PHONE_NUMBER_ID
 * alone (lineNumbers), so a half-configured chat line still receives and stores its messages.
 */
export function webhookConfig(env: Env): WebhookConfig {
  return { appSecrets: appSecrets(env), verifyToken: env.WA_VERIFY_TOKEN, numbers: lineNumbers(env), kapsoSecret: kapsoWebhookSecret(env) };
}

/**
 * The signature keys. Legacy (numbers null): appSecrets(env) exactly. Module mode (docs/23c decision 7):
 * the role keys loadEnv() already laid from each default number (blank = unset, never a legacy key) plus
 * every number's own non-blank app secret, distinct.
 */
export function signatureSecrets(env: Env, numbers: readonly OverlayNumber[] | null): string[] {
  const base = appSecrets(env);
  if (numbers === null) return base;
  const own = numbers.map((n) => n.appSecret).filter((s): s is string => typeof s === 'string' && s.trim() !== '');
  return [...new Set([...base, ...own])];
}

/**
 * The provider's value: the same fields, read per access from `read()` (loadEnv: env + the
 * database's integration config), so a secret or number the admin saves applies without a restart.
 * `overlay` is the numbers overlay of module mode (null under legacy), read per access too.
 */
export function liveWebhookConfig(read: () => Env): WebhookConfig {
  return {
    get appSecrets() {
      return signatureSecrets(read(), overlayNumbers());
    },
    get verifyToken() {
      return read().WA_VERIFY_TOKEN;
    },
    get numbers() {
      return lineNumbers(read());
    },
    get kapsoSecret() {
      return kapsoWebhookSecret(read());
    },
    get overlay() {
      return overlayNumbers();
    },
  };
}
