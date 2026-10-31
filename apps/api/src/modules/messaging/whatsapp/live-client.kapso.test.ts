import { afterEach, describe, expect, it, vi } from 'vitest';
import { setIntegrationOverlay } from '@/common/configuration/integrations/integration-overlay';
import { LiveWhatsappClient } from './live-client';
import { RECORDED, scriptedFetch } from './whatsapp.fakes';

// docs/19: switching a line's driver (or the Kapso key) in «التكاملات» applies to the next call.

const LINE = { WA_PHONE_NUMBER_ID: 'p1', WA_WABA_ID: 'w1', WA_ACCESS_TOKEN: 'token-a' };
const KAPSO = { KAPSO_API_BASE: 'http://127.0.0.1:4010/kapso', KAPSO_API_KEY: 'key-a' };

afterEach(() => {
  setIntegrationOverlay({});
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('LiveWhatsappClient across drivers', () => {
  it('meta → kapso → a new key → meta again, each on the next call, with that driver\'s credential', async () => {
    vi.stubEnv('WA_API_BASE', 'http://127.0.0.1:4010');
    const f = scriptedFetch(RECORDED.sendOk, RECORDED.sendOk, RECORDED.sendOk, RECORDED.sendOk);
    vi.stubGlobal('fetch', f.fetch);
    const client = new LiveWhatsappClient('notifications');
    const send = () => client.sendText({ to: '+966551234567', text: 'x' });
    setIntegrationOverlay({ ...LINE, ...KAPSO });
    await send();
    setIntegrationOverlay({ ...LINE, ...KAPSO, WA_PROVIDER: 'kapso' });
    await send();
    setIntegrationOverlay({ ...LINE, ...KAPSO, KAPSO_API_KEY: 'key-b', WA_PROVIDER: 'kapso' });
    await send();
    setIntegrationOverlay({ ...LINE, ...KAPSO, WA_PROVIDER: 'meta' });
    await send();
    expect(f.requests.map((r) => r.url)).toEqual([
      'http://127.0.0.1:4010/v21.0/p1/messages',
      'http://127.0.0.1:4010/kapso/v24.0/p1/messages',
      'http://127.0.0.1:4010/kapso/v24.0/p1/messages',
      'http://127.0.0.1:4010/v21.0/p1/messages',
    ]);
    const headers = f.requests.map((r) => r.init.headers as Record<string, string>);
    expect(headers.map((h) => h['authorization'] ?? h['x-api-key'])).toEqual(['Bearer token-a', 'key-a', 'key-b', 'Bearer token-a']);
    expect(headers[1]).not.toHaveProperty('authorization');
  });

  it('a kapso line without its key is unconfigured and refuses before any request', async () => {
    const f = scriptedFetch();
    vi.stubGlobal('fetch', f.fetch);
    const client = new LiveWhatsappClient('notifications');
    setIntegrationOverlay({ ...LINE, KAPSO_API_BASE: KAPSO.KAPSO_API_BASE, WA_PROVIDER: 'kapso' });
    expect(client.configured()).toBe(false);
    await expect(client.sendText({ to: '+966551234567', text: 'x' })).rejects.toThrow('WhatsApp is not configured');
    expect(f.requests).toHaveLength(0);
  });
});
