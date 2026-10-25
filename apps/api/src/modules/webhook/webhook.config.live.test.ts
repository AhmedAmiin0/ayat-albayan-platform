import { afterEach, describe, expect, it } from 'vitest';
import { setIntegrationOverlay } from '../../common/integrations/integration-overlay';
import { loadEnv } from '../../config/env/env';
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

  it('the Kapso webhook secret applies at once and is never one of the Meta app secrets', () => {
    const config = liveWebhookConfig(() => loadEnv());
    expect(config.kapsoSecret).toBeUndefined();
    setIntegrationOverlay({ KAPSO_WEBHOOK_SECRET: 'kapso-db', WA_APP_SECRET: 'secret-db' });
    expect(config.kapsoSecret).toBe('kapso-db');
    expect(config.appSecrets).toEqual(['secret-db']);
  });
});
