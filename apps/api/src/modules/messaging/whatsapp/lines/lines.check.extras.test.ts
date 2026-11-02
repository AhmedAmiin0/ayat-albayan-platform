import { afterEach, describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env/env';
import { stubEnvs, TWO_LINES_ENV } from '@/modules/messaging/whatsapp/whatsapp.lines.fakes';
import { driverOf } from './lines.check.driver';

// The per-driver extras of «افحص الخطوط» (docs/36 h4: a Record per provider, no ternary chain).

const KAPSO = { WA_CHAT_PROVIDER: 'kapso', KAPSO_API_BASE: 'http://localhost:4010/kapso' };

describe('driverOf', () => {
  afterEach(() => stubEnvs(null));

  it('a meta line: no webhook-secret flag at all', () => {
    stubEnvs(TWO_LINES_ENV);
    const driver = driverOf(loadEnv(), 'chat');
    expect(driver.provider).toBe('meta');
    expect(driver).not.toHaveProperty('kapso_webhook_secret');
    expect(driver).not.toHaveProperty('crm_webhook_secret');
  });

  it('a kapso line: whether KAPSO_WEBHOOK_SECRET is set, never its value', () => {
    stubEnvs({ ...TWO_LINES_ENV, ...KAPSO });
    expect(driverOf(loadEnv(), 'chat')).toMatchObject({
      provider: 'kapso',
      kapso_webhook_secret: false,
    });
    stubEnvs({ ...TWO_LINES_ENV, ...KAPSO, KAPSO_WEBHOOK_SECRET: 'fake-kapso-webhook-secret' });
    const driver = driverOf(loadEnv(), 'chat');
    expect(driver).toMatchObject({ kapso_webhook_secret: true });
    expect(JSON.stringify(driver)).not.toContain('fake-kapso-webhook-secret');
  });

  it('a crm line: whether WACRM_WEBHOOK_SECRET is set', () => {
    stubEnvs({ ...TWO_LINES_ENV, WA_CHAT_PROVIDER: 'crm', WACRM_WEBHOOK_SECRET: 'fake-hook' });
    const driver = driverOf(loadEnv(), 'chat');
    expect(driver).toMatchObject({ provider: 'crm', crm_webhook_secret: true });
    expect(driver).not.toHaveProperty('kapso_webhook_secret');
  });
});
