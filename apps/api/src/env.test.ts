import { describe, expect, it } from 'vitest';
import { loadEnv, sendingAllowed, whatsappEnv } from './env';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const WA = {
  WA_API_BASE: 'http://localhost:4010/',
  WA_PHONE_NUMBER_ID: 'stub-phone',
  WA_WABA_ID: 'stub-waba',
  WA_ACCESS_TOKEN: 'local-token',
};

describe('env: feedback link secret (optional, >= 32 chars)', () => {
  it('unset or blank is fine; a short one fails the boot', () => {
    expect(loadEnv(BASE).FEEDBACK_TOKEN_SECRET).toBeUndefined();
    expect(loadEnv({ ...BASE, FEEDBACK_TOKEN_SECRET: '' }).FEEDBACK_TOKEN_SECRET).toBeUndefined();
    expect(() => loadEnv({ ...BASE, FEEDBACK_TOKEN_SECRET: 'short' })).toThrow();
    expect(loadEnv({ ...BASE, FEEDBACK_TOKEN_SECRET: 'x'.repeat(32) }).FEEDBACK_TOKEN_SECRET).toHaveLength(32);
  });
});

describe('env: WhatsApp is optional and off by default (docs/12 §3)', () => {
  it('boots without any WhatsApp or Expo value; sending is off', () => {
    const env = loadEnv(BASE);
    expect(env).not.toHaveProperty('MESSAGING_ENABLED');
    expect(env.WA_API_BASE).toBeUndefined();
    expect(whatsappEnv(env)).toBeNull();
    expect(sendingAllowed(env, true)).toBe(false);
  });

  it('never defaults the Graph base to Meta', () => {
    expect(loadEnv({ ...BASE, WA_PHONE_NUMBER_ID: 'p', WA_WABA_ID: 'w', WA_ACCESS_TOKEN: 't' }).WA_API_BASE).toBeUndefined();
  });

  it('a full config yields the client settings, trailing slash trimmed, version defaulted', () => {
    expect(whatsappEnv(loadEnv({ ...BASE, ...WA }))).toEqual({
      base: 'http://localhost:4010',
      version: 'v21.0',
      phoneNumberId: 'stub-phone',
      wabaId: 'stub-waba',
      accessToken: 'local-token',
    });
  });

  it('WA_APP_ID is optional: it only adds the app id for sample uploads (blank = unset)', () => {
    expect(whatsappEnv(loadEnv({ ...BASE, ...WA, WA_APP_ID: '1234567890' }))).toMatchObject({ appId: '1234567890' });
    expect(whatsappEnv(loadEnv({ ...BASE, ...WA, WA_APP_ID: ' ' }))).not.toHaveProperty('appId');
    expect(whatsappEnv(loadEnv({ ...BASE, WA_APP_ID: '1234567890' }))).toBeNull();
  });

  it('a partial config is still off', () => {
    expect(whatsappEnv(loadEnv({ ...BASE, ...WA, WA_ACCESS_TOKEN: '' }))).toBeNull();
  });

  it.each([
    { name: 'configured, setting on', extra: { ...WA }, setting: true, allowed: true },
    { name: 'admin kill switch off', extra: { ...WA }, setting: false, allowed: false },
    { name: 'a leftover env MESSAGING_ENABLED=true does not open it', extra: { MESSAGING_ENABLED: 'true', ...WA }, setting: false, allowed: false },
    { name: 'setting on but not configured', extra: {}, setting: true, allowed: false },
  ])('sendingAllowed: $name → $allowed', ({ extra, setting, allowed }) => {
    expect(sendingAllowed(loadEnv({ ...BASE, ...extra }), setting)).toBe(allowed);
  });

  it('rejects a malformed version instead of guessing; a stale MESSAGING_ENABLED is ignored, never a boot failure', () => {
    expect(() => loadEnv({ ...BASE, WA_API_VERSION: '21' })).toThrow();
    expect(() => loadEnv({ ...BASE, MESSAGING_ENABLED: 'maybe' })).not.toThrow();
  });
});
