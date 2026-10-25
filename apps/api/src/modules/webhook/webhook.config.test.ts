import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../config/env/env';
import { webhookConfig } from './webhook.config';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const WA = {
  WA_API_BASE: 'http://localhost:4010',
  WA_PHONE_NUMBER_ID: 'notif-phone',
  WA_WABA_ID: 'notif-waba',
  WA_ACCESS_TOKEN: 'notif-token',
  WA_APP_SECRET: 'notif-secret',
  WA_VERIFY_TOKEN: 'verify',
};
const CHAT = {
  WA_CHAT_PHONE_NUMBER_ID: 'chat-phone',
  WA_CHAT_WABA_ID: 'chat-waba',
  WA_CHAT_ACCESS_TOKEN: 'chat-token',
  WA_CHAT_APP_SECRET: 'chat-secret',
};
const config = (over: Record<string, string> = {}) => webhookConfig(loadEnv({ ...BASE, ...over }));

describe('webhookConfig (docs/12 §13.6)', () => {
  it('chat unset: the main secret and the notifications number only', () => {
    expect(config(WA)).toEqual({
      appSecrets: ['notif-secret'],
      verifyToken: 'verify',
      numbers: { notifications: 'notif-phone' },
    });
  });

  it('de-duplicates a chat secret equal to the main one', () => {
    expect(config({ ...WA, WA_CHAT_APP_SECRET: 'notif-secret' }).appSecrets).toEqual(['notif-secret']);
  });

  it('chat configured: both numbers and both secrets', () => {
    expect(config({ ...WA, ...CHAT })).toEqual({
      appSecrets: ['notif-secret', 'chat-secret'],
      verifyToken: 'verify',
      numbers: { notifications: 'notif-phone', chat: 'chat-phone' },
    });
  });

  it('an incomplete chat env (only WA_CHAT_PHONE_NUMBER_ID) still receives on the chat number', () => {
    const c = config({ ...WA, WA_CHAT_PHONE_NUMBER_ID: 'chat-phone' });
    expect(c.numbers).toEqual({ notifications: 'notif-phone', chat: 'chat-phone' });
    expect(c.appSecrets).toEqual(['notif-secret']);
  });

  it('nothing configured: no secret (every POST 401), no token, no number filter', () => {
    expect(config()).toEqual({ appSecrets: [], verifyToken: undefined, numbers: {} });
  });
});
