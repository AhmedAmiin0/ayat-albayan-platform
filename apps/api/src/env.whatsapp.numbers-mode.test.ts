import { afterEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from './common/integrations/numbers-overlay';
import { envFrom, lineEnvs, lineGaps, lineNumbers, loadEnv } from './env';

// PR #142 item 15: in numbers mode (module) the chat line never borrows the notifications token. A chat
// number without a token is not configured (nothing sends from it), but its phone id still receives.
// Legacy keeps the fallback exactly as before.

const NOTIF = { WA_API_BASE: 'http://localhost:4010', WA_PHONE_NUMBER_ID: '1000000001', WA_WABA_ID: '2000000001', WA_ACCESS_TOKEN: 'notif-token-fake' };
const CHAT_NO_TOKEN = { WA_CHAT_PHONE_NUMBER_ID: '1000000002', WA_CHAT_WABA_ID: '2000000002', WA_CHAT_ACCESS_TOKEN: '' };

afterEach(() => {
  setNumbersOverlay(null);
  vi.unstubAllEnvs();
});

const stubBase = () => {
  vi.stubEnv('SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'k');
  vi.stubEnv('WA_API_BASE', NOTIF.WA_API_BASE);
};

describe('module mode: no chat token fallback', () => {
  it('a chat number without a token → chat unconfigured, the notifications token is never used', () => {
    stubBase();
    const env = envFrom({ ...NOTIF, ...CHAT_NO_TOKEN });
    expect(env.linesFromNumbers).toBe(true);
    const lines = lineEnvs(env);
    expect(lines.chat).toBeNull();
    expect(lines.notifications).toMatchObject({ accessToken: 'notif-token-fake' });
    expect(JSON.stringify(lines.chat)).not.toContain('notif-token-fake');
  });

  it('the chat phone id still routes inbound, and «افحص الخطوط» names the missing chat token', () => {
    stubBase();
    const env = envFrom({ ...NOTIF, ...CHAT_NO_TOKEN });
    expect(lineNumbers(env)).toEqual({ notifications: '1000000001', chat: '1000000002' });
    expect(lineGaps(env, 'chat')).toEqual(['WA_CHAT_ACCESS_TOKEN']);
  });

  it('loadEnv() under the numbers overlay is marked too; a chat number with its own token still sends', () => {
    stubBase();
    setNumbersOverlay({ values: { ...NOTIF, ...CHAT_NO_TOKEN, WA_CHAT_ACCESS_TOKEN: 'chat-token-fake' }, numberIds: {} });
    expect(lineEnvs(loadEnv()).chat).toMatchObject({ phoneNumberId: '1000000002', accessToken: 'chat-token-fake' });
  });

  it('the server env WA_CHAT_ACCESS_TOKEN cannot sneak in either: numbers blank it', () => {
    stubBase();
    vi.stubEnv('WA_CHAT_ACCESS_TOKEN', 'env-chat-token-fake');
    expect(lineEnvs(envFrom({ ...NOTIF, ...CHAT_NO_TOKEN })).chat).toBeNull();
  });
});

describe('legacy mode keeps the fallback', () => {
  it('envFrom(null) is not marked and chat borrows WA_ACCESS_TOKEN as before', () => {
    stubBase();
    for (const [k, v] of Object.entries({ ...NOTIF, ...CHAT_NO_TOKEN })) vi.stubEnv(k, v);
    const env = envFrom(null);
    expect(env).not.toHaveProperty('linesFromNumbers');
    expect(lineEnvs(env).chat).toMatchObject({ accessToken: 'notif-token-fake' });
    expect(lineGaps(env, 'chat')).toEqual([]);
    expect(loadEnv()).toEqual(env);
  });
});
