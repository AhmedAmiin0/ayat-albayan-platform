import { describe, expect, it } from 'vitest';
import { appSecrets, chatGaps, lineEnvs, lineNumbers, loadEnv, sendingAllowed, whatsappEnv } from './env';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const WA = {
  WA_API_BASE: 'http://localhost:4010/',
  WA_PHONE_NUMBER_ID: 'stub-phone',
  WA_WABA_ID: 'stub-waba',
  WA_ACCESS_TOKEN: 'local-token',
  WA_APP_ID: 'app-1',
};
const CHAT = { WA_CHAT_PHONE_NUMBER_ID: 'chat-phone', WA_CHAT_WABA_ID: 'chat-waba', WA_CHAT_ACCESS_TOKEN: 'chat-token' };
const env = (over: Record<string, string> = {}) => loadEnv({ ...BASE, ...over });

describe('lineEnvs (docs/12 §13.1)', () => {
  it('notifications keeps today’s config with appId; chat has its own ids and NO appId', () => {
    const lines = lineEnvs(env({ ...WA, ...CHAT, WA_CHAT_APP_ID: 'app-2' }));
    expect(lines.notifications).toEqual({
      base: 'http://localhost:4010',
      version: 'v21.0',
      phoneNumberId: 'stub-phone',
      wabaId: 'stub-waba',
      accessToken: 'local-token',
      appId: 'app-1',
    });
    expect(lines.chat).toEqual({
      base: 'http://localhost:4010',
      version: 'v21.0',
      phoneNumberId: 'chat-phone',
      wabaId: 'chat-waba',
      accessToken: 'chat-token',
    });
  });

  it('the chat token falls back to WA_ACCESS_TOKEN', () => {
    expect(lineEnvs(env({ ...WA, ...CHAT, WA_CHAT_ACCESS_TOKEN: '' })).chat?.accessToken).toBe('local-token');
  });

  it.each([
    ['WA_API_BASE', { ...WA, ...CHAT, WA_API_BASE: '' }],
    ['WA_CHAT_PHONE_NUMBER_ID', { ...WA, ...CHAT, WA_CHAT_PHONE_NUMBER_ID: '' }],
    ['WA_CHAT_WABA_ID', { ...WA, ...CHAT, WA_CHAT_WABA_ID: '' }],
    ['both tokens', { ...WA, ...CHAT, WA_ACCESS_TOKEN: '', WA_CHAT_ACCESS_TOKEN: '' }],
    ['the notifications phone id reused', { ...WA, ...CHAT, WA_CHAT_PHONE_NUMBER_ID: 'stub-phone' }],
  ])('chat is null without %s', (_name, over) => {
    expect(lineEnvs(env(over)).chat).toBeNull();
  });

  it('chat alone (no notifications line) still builds the chat env', () => {
    const lines = lineEnvs(env({ WA_API_BASE: 'http://x', ...CHAT }));
    expect(lines.notifications).toBeNull();
    expect(lines.chat?.phoneNumberId).toBe('chat-phone');
  });
});

describe('whatsappEnv / sendingAllowed keep today’s behaviour', () => {
  it('whatsappEnv is the notifications line; chat does not change it', () => {
    expect(whatsappEnv(env({ ...WA, ...CHAT }))).toEqual(lineEnvs(env(WA)).notifications);
    expect(whatsappEnv(env(CHAT))).toBeNull();
  });

  it('sending needs MESSAGING_ENABLED, the notifications line and the setting; chat is optional', () => {
    expect(sendingAllowed(env({ ...WA, MESSAGING_ENABLED: 'true' }), true)).toBe(true);
    expect(sendingAllowed(env({ ...WA, MESSAGING_ENABLED: 'true' }), false)).toBe(false);
    expect(sendingAllowed(env({ ...WA }), true)).toBe(false);
    expect(sendingAllowed(env({ WA_API_BASE: 'http://x', ...CHAT, MESSAGING_ENABLED: 'true' }), true)).toBe(false);
  });
});

describe('lineNumbers (what the webhook RECEIVES)', () => {
  it('chat comes from its phone id alone: no token, WABA or base needed', () => {
    expect(lineNumbers(env({ WA_PHONE_NUMBER_ID: 'n', WA_CHAT_PHONE_NUMBER_ID: 'c' }))).toEqual({
      notifications: 'n',
      chat: 'c',
    });
  });

  it('chat is omitted when it equals the notifications id; notifications omitted when unset', () => {
    expect(lineNumbers(env({ WA_PHONE_NUMBER_ID: 'n', WA_CHAT_PHONE_NUMBER_ID: 'n' }))).toEqual({ notifications: 'n' });
    expect(lineNumbers(env({ WA_CHAT_PHONE_NUMBER_ID: 'c' }))).toEqual({ chat: 'c' });
    expect(lineNumbers(env())).toEqual({});
  });
});

describe('appSecrets', () => {
  it('keeps the order, drops blanks and duplicates', () => {
    expect(appSecrets(env({ WA_APP_SECRET: 'a', WA_CHAT_APP_SECRET: 'b' }))).toEqual(['a', 'b']);
    expect(appSecrets(env({ WA_APP_SECRET: 'a', WA_CHAT_APP_SECRET: 'a' }))).toEqual(['a']);
    expect(appSecrets(env({ WA_APP_SECRET: ' ', WA_CHAT_APP_SECRET: 'b' }))).toEqual(['b']);
    expect(appSecrets(env())).toEqual([]);
  });
});

describe('chatGaps (names only, never values)', () => {
  const ALL = ['WA_CHAT_PHONE_NUMBER_ID', 'WA_CHAT_WABA_ID', 'WA_CHAT_ACCESS_TOKEN'];
  it.each<[string, Record<string, string>, string[]]>([
    ['nothing set', {}, []],
    ['only the notifications line', WA, []],
    ['only WA_CHAT_APP_SECRET', { WA_CHAT_APP_SECRET: 'secret-value' }, ALL],
    ['only WA_CHAT_APP_ID', { WA_CHAT_APP_ID: 'app-2' }, ALL],
    ['phone id only, WA_ACCESS_TOKEN present', { WA_ACCESS_TOKEN: 't', WA_CHAT_PHONE_NUMBER_ID: 'c' }, ['WA_CHAT_WABA_ID']],
    ['phone id only, no token at all', { WA_CHAT_PHONE_NUMBER_ID: 'c' }, ['WA_CHAT_WABA_ID', 'WA_CHAT_ACCESS_TOKEN']],
    ['fully set', CHAT, []],
  ])('%s', (_name, over, gaps) => {
    const out = chatGaps(env(over));
    expect(out).toEqual(gaps);
    for (const v of Object.values(over)) expect(out.join(' ')).not.toContain(v);
  });
});

describe('WA_TEMPLATE_SYNC', () => {
  it('defaults to true (also when blank); "false" turns it off', () => {
    expect(env().WA_TEMPLATE_SYNC).toBe(true);
    expect(env({ WA_TEMPLATE_SYNC: '' }).WA_TEMPLATE_SYNC).toBe(true);
    expect(env({ WA_TEMPLATE_SYNC: 'false' }).WA_TEMPLATE_SYNC).toBe(false);
  });
});
