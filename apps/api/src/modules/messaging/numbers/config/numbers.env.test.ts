import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../../../config/env/env';
import { numberEnv, overlayNumber } from './numbers.env';
import { LEGACY_ENV, numberRow } from '../numbers.fakes';

// docs/23c: each number sends with its own ids and ITS Vault token only; never a legacy key or another number's.

const ENV = loadEnv({ ...LEGACY_ENV, WA_ACCESS_TOKEN: 'legacy-token-fake', KAPSO_API_BASE: 'http://localhost:4010/kapso/', KAPSO_API_KEY: 'kapso-key-fake' });
const own = { access_token: 'own-token-fake', app_secret: 'own-secret-fake' };

describe('numberEnv: one number\'s own client config', () => {
  it('meta: its ids, its token, WA_API_BASE / WA_API_VERSION; app id only when set', () => {
    expect(numberEnv({ row: numberRow(), secrets: own }, ENV)).toEqual({
      base: 'http://localhost:4010', version: 'v21.0', phoneNumberId: '1000000001', wabaId: '2000000001', accessToken: 'own-token-fake',
    });
    expect(numberEnv({ row: numberRow({ app_id: '3000000001' }), secrets: own }, ENV)).toMatchObject({ appId: '3000000001' });
  });

  it('no token of its own → null; the legacy WA_ACCESS_TOKEN is never borrowed', () => {
    expect(numberEnv({ row: numberRow(), secrets: {} }, ENV)).toBeNull();
    expect(numberEnv({ row: numberRow({ purpose: 'chat' }), secrets: { app_secret: 'x' } }, ENV)).toBeNull();
  });

  it('disabled, no WABA, no base, or a value the schema refuses → null', () => {
    expect(numberEnv({ row: numberRow({ enabled: false }), secrets: own }, ENV)).toBeNull();
    expect(numberEnv({ row: numberRow({ waba_id: null }), secrets: own }, ENV)).toBeNull();
    expect(numberEnv({ row: numberRow(), secrets: own }, loadEnv({ ...LEGACY_ENV, WA_API_BASE: '' }))).toBeNull();
    expect(numberEnv({ row: numberRow({ provider: 'other' }), secrets: own }, ENV)).toBeNull();
  });

  it('kapso: Kapso\'s base (trailing slash dropped) and the project key, never a Meta token', () => {
    const env = numberEnv({ row: numberRow({ provider: 'kapso', purpose: 'chat' }), secrets: own }, ENV);
    expect(env).toEqual({
      provider: 'kapso', base: 'http://localhost:4010/kapso', version: 'v24.0', phoneNumberId: '1000000001', wabaId: '2000000001', apiKey: 'kapso-key-fake',
    });
    expect(numberEnv({ row: numberRow({ provider: 'kapso' }), secrets: own }, loadEnv(LEGACY_ENV))).toBeNull();
  });
});

describe('overlayNumber', () => {
  it('carries the routing fields, its env and its own app secret', () => {
    const n = overlayNumber({ row: numberRow({ fallback_rank: 7 }), secrets: own }, ENV);
    expect(n).toMatchObject({ id: numberRow().id, purpose: 'notifications', enabled: true, is_default: true, fallback_rank: 7, appSecret: 'own-secret-fake' });
    expect(n.env).toMatchObject({ accessToken: 'own-token-fake' });
  });

  it('a disabled number keeps its app secret (inbound is still logged) but cannot send', () => {
    const n = overlayNumber({ row: numberRow({ enabled: false }), secrets: own }, ENV);
    expect(n.env).toBeNull();
    expect(n.appSecret).toBe('own-secret-fake');
    expect(overlayNumber({ row: numberRow(), secrets: {} }, ENV).appSecret).toBeNull();
  });
});
