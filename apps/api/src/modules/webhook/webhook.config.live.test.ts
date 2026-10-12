import { afterEach, describe, expect, it } from 'vitest';
import { setIntegrationOverlay } from '../../config/integration-overlay';
import { loadEnv } from '../../env';
import { liveWebhookConfig } from './webhook.config';

// The provider's WEBHOOK_CONFIG reads loadEnv() on every access (integration config in the DB).

afterEach(() => setIntegrationOverlay({}));

describe('liveWebhookConfig', () => {
  it('a verify token, app secret or number saved by the admin applies at once', () => {
    const config = liveWebhookConfig(() => loadEnv());
    expect(config.verifyToken).toBeUndefined();
    setIntegrationOverlay({ WA_VERIFY_TOKEN: 'verify-db', WA_APP_SECRET: 'secret-db', WA_CHAT_APP_SECRET: 'chat-db', WA_PHONE_NUMBER_ID: 'p1' });
    expect(config.verifyToken).toBe('verify-db');
    expect(config.appSecrets).toEqual(['secret-db', 'chat-db']);
    expect(config.numbers).toEqual({ notifications: 'p1' });
    setIntegrationOverlay({});
    expect(config.appSecrets).toEqual([]);
  });
});
