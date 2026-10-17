import { describe, expect, it } from 'vitest';
import { duplicatePhone, lineEnvs, lineGaps, lineProvider, loadEnv, sendingAllowed } from './env';

// docs/19: each line resolves its own driver; default meta, so nothing changes until an admin switches.

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const WA = { WA_API_BASE: 'http://localhost:4010', WA_PHONE_NUMBER_ID: 'n-phone', WA_WABA_ID: 'n-waba', WA_ACCESS_TOKEN: 'meta-token', WA_APP_ID: 'app-1' };
const CHAT = { WA_CHAT_PHONE_NUMBER_ID: 'c-phone', WA_CHAT_WABA_ID: 'c-waba' };
const KAPSO = { KAPSO_API_BASE: 'http://localhost:4010/kapso/', KAPSO_API_KEY: 'fake-kapso-key' };
const env = (over: Record<string, string> = {}) => loadEnv({ ...BASE, ...over });

describe('line providers', () => {
  it('default meta on both lines: lineEnvs exactly as before (no provider field)', () => {
    const e = env({ ...WA, ...KAPSO });
    expect([lineProvider(e, 'notifications'), lineProvider(e, 'chat')]).toEqual(['meta', 'meta']);
    expect(lineEnvs(e).notifications).toEqual({ base: 'http://localhost:4010', version: 'v21.0', phoneNumberId: 'n-phone', wabaId: 'n-waba', accessToken: 'meta-token', appId: 'app-1' });
  });

  it('a kapso line: Kapso base (slash trimmed) and version v24.0, the same ids, the key; no app id or token', () => {
    const lines = lineEnvs(env({ ...WA, ...KAPSO, WA_PROVIDER: 'kapso' }));
    expect(lines.notifications).toEqual({
      provider: 'kapso', base: 'http://localhost:4010/kapso', version: 'v24.0', phoneNumberId: 'n-phone', wabaId: 'n-waba', apiKey: 'fake-kapso-key',
    });
  });

  it('a kapso line needs no Meta token or WA_API_BASE; the version is configurable', () => {
    const e = env({ WA_PHONE_NUMBER_ID: 'n-phone', WA_WABA_ID: 'n-waba', ...KAPSO, KAPSO_API_VERSION: 'v25.0', WA_PROVIDER: 'kapso' });
    expect(lineEnvs(e).notifications).toMatchObject({ provider: 'kapso', version: 'v25.0' });
    expect(lineGaps(e, 'notifications')).toEqual([]);
  });

  it('half-configured kapso: null (refuses every call, rows stay queued) and the missing keys NAMED', () => {
    const e = env({ ...WA, KAPSO_API_KEY: 'fake-kapso-key', WA_PROVIDER: 'kapso' });
    expect(lineEnvs(e).notifications).toBeNull();
    expect(lineGaps(e, 'notifications')).toEqual(['KAPSO_API_BASE']);
    expect(sendingAllowed(loadEnv({ ...BASE, ...WA, KAPSO_API_KEY: 'k', WA_PROVIDER: 'kapso', MESSAGING_ENABLED: 'true' }), true)).toBe(false);
    expect(lineGaps(env({ WA_PROVIDER: 'kapso' }), 'notifications')).toEqual(['WA_PHONE_NUMBER_ID', 'WA_WABA_ID', 'KAPSO_API_BASE', 'KAPSO_API_KEY']);
  });

  it('sending is allowed once the notifications line is configured under its provider', () => {
    const on = { MESSAGING_ENABLED: 'true', WA_PROVIDER: 'kapso' };
    expect(sendingAllowed(env({ WA_PHONE_NUMBER_ID: 'n', WA_WABA_ID: 'w', ...KAPSO, ...on }), true)).toBe(true);
    expect(sendingAllowed(env({ ...WA, ...on }), true)).toBe(false);
  });

  it('the chat line switches on its own; a kapso chat line with the notifications number is refused', () => {
    const e = env({ ...WA, ...CHAT, ...KAPSO, WA_CHAT_PROVIDER: 'kapso' });
    expect(lineEnvs(e).notifications).toMatchObject({ accessToken: 'meta-token' });
    expect(lineEnvs(e).chat).toMatchObject({ provider: 'kapso', phoneNumberId: 'c-phone', wabaId: 'c-waba' });
    const same = env({ ...WA, ...KAPSO, WA_CHAT_PHONE_NUMBER_ID: 'n-phone', WA_CHAT_WABA_ID: 'c-waba', WA_CHAT_PROVIDER: 'kapso' });
    expect(lineEnvs(same).chat).toBeNull();
    expect(lineGaps(same, 'chat')).toEqual([]);
    expect([duplicatePhone(same, 'chat'), duplicatePhone(same, 'notifications')]).toEqual([true, false]);
    expect(lineGaps(env({ ...KAPSO, WA_CHAT_PROVIDER: 'kapso' }), 'chat')).toEqual(['WA_CHAT_PHONE_NUMBER_ID', 'WA_CHAT_WABA_ID']);
  });

  it('meta gaps: the chat line keeps chatGaps; notifications names its four required keys', () => {
    expect(lineGaps(env(WA), 'notifications')).toEqual([]);
    expect(lineGaps(env({ WA_PHONE_NUMBER_ID: 'n' }), 'notifications')).toEqual(['WA_API_BASE', 'WA_WABA_ID', 'WA_ACCESS_TOKEN']);
    expect(lineGaps(env({ ...WA, WA_CHAT_PHONE_NUMBER_ID: 'c' }), 'chat')).toEqual(['WA_CHAT_WABA_ID']);
    expect(lineGaps(env({ ...WA, WA_CHAT_PHONE_NUMBER_ID: 'n-phone', WA_CHAT_WABA_ID: 'w' }), 'chat')).toEqual([]);
  });

  it('notifications on kapso, WA_API_BASE unset: a full meta chat line names WA_API_BASE (else no gap)', () => {
    const mix = { WA_PHONE_NUMBER_ID: 'n', WA_WABA_ID: 'w', ...KAPSO, WA_PROVIDER: 'kapso', ...CHAT, WA_CHAT_ACCESS_TOKEN: 't' };
    expect(lineEnvs(env(mix)).chat).toBeNull();
    expect(lineGaps(env(mix), 'chat')).toEqual(['WA_API_BASE']);
    expect(lineGaps(env({ ...mix, WA_API_BASE: 'http://localhost:4010' }), 'chat')).toEqual([]);
    expect(lineGaps(env({ WA_PHONE_NUMBER_ID: 'n', ...KAPSO, WA_PROVIDER: 'kapso' }), 'chat')).toEqual([]);
  });

  it('a meta chat line next to a kapso notifications line names a missing WA_API_BASE', () => {
    const chat = { ...CHAT, WA_CHAT_ACCESS_TOKEN: 'chat-token' };
    const e = env({ WA_PHONE_NUMBER_ID: 'n-phone', WA_WABA_ID: 'n-waba', ...KAPSO, ...chat, WA_PROVIDER: 'kapso' });
    expect(lineEnvs(e).chat).toBeNull();
    expect(lineGaps(e, 'chat')).toEqual(['WA_API_BASE']);
    expect(lineGaps(env({ ...WA, ...chat }), 'chat')).toEqual([]);
    expect(lineGaps(env({ WA_PHONE_NUMBER_ID: 'n' }), 'chat')).toEqual([]);
  });

  it('a provider outside meta | kapso fails the boot; blank means meta', () => {
    expect(() => env({ WA_PROVIDER: 'twilio' })).toThrow();
    expect(env({ WA_PROVIDER: ' ', WA_CHAT_PROVIDER: '' }).WA_PROVIDER).toBe('meta');
  });
});
