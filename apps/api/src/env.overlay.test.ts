import { afterEach, describe, expect, it, vi } from 'vitest';
import { setIntegrationOverlay } from './common/integrations/integration-overlay';
import { lineEnvs, loadEnv, validOverlay } from './env';

// Integration config in the database (owner, 2026-10-12): loadEnv() = env + the DB overlay.

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };

afterEach(() => {
  setIntegrationOverlay({});
  vi.unstubAllEnvs();
});

describe('loadEnv(): the database overlay over process.env', () => {
  it('a non-empty DB value wins over env; env fills every key the DB lacks', () => {
    vi.stubEnv('WA_WABA_ID', 'env-waba');
    vi.stubEnv('WA_API_VERSION', 'v21.0');
    setIntegrationOverlay({ WA_WABA_ID: 'db-waba' });
    const env = loadEnv();
    expect(env.WA_WABA_ID).toBe('db-waba');
    expect(env.WA_API_VERSION).toBe('v21.0');
  });

  it('a cleared DB value (overlay without the key) falls back to env at once', () => {
    vi.stubEnv('FX_API_URL', 'https://env.example.test/latest/SAR');
    setIntegrationOverlay({ FX_API_URL: 'https://db.example.test/latest/SAR' });
    expect(loadEnv().FX_API_URL).toBe('https://db.example.test/latest/SAR');
    setIntegrationOverlay({});
    expect(loadEnv().FX_API_URL).toBe('https://env.example.test/latest/SAR');
  });

  it('DB values reach the derived configs (a WhatsApp line configured from the database alone)', () => {
    vi.stubEnv('WA_API_BASE', 'http://localhost:4010');
    setIntegrationOverlay({ WA_PHONE_NUMBER_ID: 'p1', WA_WABA_ID: 'w1', WA_ACCESS_TOKEN: 'db-token-fake' });
    expect(lineEnvs(loadEnv()).notifications).toMatchObject({ phoneNumberId: 'p1', wabaId: 'w1', accessToken: 'db-token-fake' });
  });

  it('an explicit source stays pure: no overlay is added', () => {
    setIntegrationOverlay({ WA_WABA_ID: 'db-waba' });
    expect(loadEnv(BASE).WA_WABA_ID).toBeUndefined();
  });

  it('never throws because of the overlay: an invalid merge falls back to env alone', () => {
    // validOverlay keeps such a value out; this is the belt behind it.
    setIntegrationOverlay({ WA_API_BASE: 'not a url' });
    expect(() => loadEnv()).not.toThrow();
    expect(loadEnv().WA_API_BASE).toBeUndefined();
  });
});

describe('validOverlay(): DB values checked key by key', () => {
  it('drops a bad value and reports its KEY only; keeps the good ones', () => {
    const bad: string[] = [];
    const out = validOverlay(
      { WA_API_BASE: 'nope', WA_API_VERSION: '21', WA_ALLOWED_RECIPIENTS: '+1, x', WA_WABA_ID: 'w', LIVEKIT_URL: 'wss://lk.example.test' },
      (key) => bad.push(key),
    );
    expect(out).toEqual({ WA_WABA_ID: 'w', LIVEKIT_URL: 'wss://lk.example.test' });
    expect(bad.sort()).toEqual(['WA_ALLOWED_RECIPIENTS', 'WA_API_BASE', 'WA_API_VERSION']);
  });

  it('ignores blank values and every key outside the registry (env-only keys can never be overridden)', () => {
    const bad: string[] = [];
    const out = validOverlay(
      { WA_WABA_ID: '  ', SUPABASE_URL: 'http://evil.example.test', MESSAGING_ENABLED: 'true', PORT: '1' },
      (key) => bad.push(key),
    );
    expect(out).toEqual({});
    expect(bad).toEqual([]);
  });

  it('accepts the env forms of the special keys', () => {
    const out = validOverlay({ WA_TEMPLATE_SYNC: 'false', WA_ALLOWED_RECIPIENTS: '+966500000001' }, () => undefined);
    setIntegrationOverlay(out);
    const env = loadEnv();
    expect(env.WA_TEMPLATE_SYNC).toBe(false);
    expect(env.WA_ALLOWED_RECIPIENTS).toEqual(['+966500000001']);
  });
});
