import { appSecrets, lineNumbers, type Env } from '../../env';
import type { WebhookConfig } from './webhook.service';

/**
 * Webhook settings from env (docs/12 §13.6). The chat number comes from WA_CHAT_PHONE_NUMBER_ID
 * alone (lineNumbers), so a half-configured chat line still receives and stores its messages.
 */
export function webhookConfig(env: Env): WebhookConfig {
  return { appSecrets: appSecrets(env), verifyToken: env.WA_VERIFY_TOKEN, numbers: lineNumbers(env) };
}
