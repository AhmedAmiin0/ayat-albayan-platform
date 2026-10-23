import { afterEach, describe, expect, it, vi } from 'vitest';
import { setIntegrationOverlay } from '../../common/integrations/integration-overlay';
import { LiveWhatsappClient } from './live-client';
import { RECORDED, scriptedFetch } from './whatsapp.fakes';

// Integration config in the database (owner, 2026-10-12): a line's client reads its config per
// call, so a token or id the admin saves applies to the next send without a restart.

const LINE = { WA_PHONE_NUMBER_ID: 'p1', WA_WABA_ID: 'w1', WA_ACCESS_TOKEN: 'token-a' };

afterEach(() => {
  setIntegrationOverlay({});
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('LiveWhatsappClient', () => {
  it('unconfigured until the database supplies the line, then sends with it', async () => {
    vi.stubEnv('WA_API_BASE', 'http://127.0.0.1:4010');
    const f = scriptedFetch(RECORDED.sendOk);
    vi.stubGlobal('fetch', f.fetch);
    const client = new LiveWhatsappClient('notifications');
    expect(client.configured()).toBe(false);
    setIntegrationOverlay(LINE);
    expect(client.configured()).toBe(true);
    await client.sendText({ to: '+966551234567', text: 'السلام عليكم' });
    expect(f.requests[0]?.url).toBe('http://127.0.0.1:4010/v21.0/p1/messages');
    expect(f.requests[0]?.init.headers).toMatchObject({ authorization: 'Bearer token-a' });
  });

  it('a new token applies to the next call; the allow-list too', async () => {
    vi.stubEnv('WA_API_BASE', 'http://127.0.0.1:4010');
    const f = scriptedFetch(RECORDED.sendOk, RECORDED.sendOk);
    vi.stubGlobal('fetch', f.fetch);
    const client = new LiveWhatsappClient('notifications');
    setIntegrationOverlay(LINE);
    await client.sendText({ to: '+966551234567', text: 'a' });
    setIntegrationOverlay({ ...LINE, WA_ACCESS_TOKEN: 'token-b', WA_ALLOWED_RECIPIENTS: '+966551234567' });
    await client.sendText({ to: '+966551234567', text: 'b' });
    expect(f.requests[1]?.init.headers).toMatchObject({ authorization: 'Bearer token-b' });
    await expect(client.sendText({ to: '+201001234567', text: 'c' })).rejects.toThrow('recipient not allowed');
    expect(f.requests).toHaveLength(2);
  });

  it('the chat line reads the chat keys (and the token fallback)', () => {
    vi.stubEnv('WA_API_BASE', 'http://127.0.0.1:4010');
    const chat = new LiveWhatsappClient('chat');
    setIntegrationOverlay({ ...LINE, WA_CHAT_PHONE_NUMBER_ID: 'c1', WA_CHAT_WABA_ID: 'cw' });
    expect(chat.configured()).toBe(true);
    expect(chat.canUploadSamples()).toBe(false);
  });
});
