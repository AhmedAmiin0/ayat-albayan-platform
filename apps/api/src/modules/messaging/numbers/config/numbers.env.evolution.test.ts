import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env/env';
import { numberEnv, overlayNumber } from './numbers.env';
import { LEGACY_ENV, numberRow } from '@/modules/messaging/numbers/numbers.fakes';

// docs/19 «Evolution driver»: an Evolution number sends with EVOLUTION_API_BASE, its instance (the
// row's phone_number_id), ITS token (never the global key) and its engine.

const BASE = { EVOLUTION_API_BASE: 'https://evo.example.test/' };
const row = (over = {}) =>
  numberRow({ provider: 'evolution', phone_number_id: 'secondary-1', waba_id: null, evolution_mode: 'baileys', ...over });
const TOKEN = { evolution_token: 'fake-instance-token' };

describe('numberEnv: an Evolution number', () => {
  it('base (slash trimmed), instance, token, engine, switch and the default 3 s gap', () => {
    const env = loadEnv({ ...LEGACY_ENV, ...BASE });
    expect(numberEnv({ row: row(), secrets: TOKEN }, env)).toEqual({
      provider: 'evolution', base: 'https://evo.example.test', instance: 'secondary-1',
      token: 'fake-instance-token', mode: 'baileys', autoSends: false, gapMs: 3_000,
    });
  });

  it('cannot send without the base, its own token (the global key never stands in), or disabled', () => {
    const withKey = loadEnv({ ...LEGACY_ENV, ...BASE, EVOLUTION_API_KEY: 'global-fake' });
    expect(numberEnv({ row: row(), secrets: TOKEN }, loadEnv(LEGACY_ENV))).toBeNull();
    expect(numberEnv({ row: row(), secrets: {} }, withKey)).toBeNull();
    expect(numberEnv({ row: row({ enabled: false }), secrets: TOKEN }, withKey)).toBeNull();
  });

  it('the webhook token rides along on the overlay, enabled or not; never on another driver', () => {
    const env = loadEnv({ ...LEGACY_ENV, ...BASE });
    expect(overlayNumber({ row: row({ enabled: false }), secrets: TOKEN }, env).evolutionToken).toBe('fake-instance-token');
    expect(overlayNumber({ row: numberRow(), secrets: TOKEN }, env).evolutionToken).toBeUndefined();
  });
});

describe('the Evolution config keys', () => {
  it('refuse an http base on another host; the gap defaults to 3 s and is bounded', () => {
    expect(() => loadEnv({ ...LEGACY_ENV, EVOLUTION_API_BASE: 'http://10.0.0.5:8080' })).toThrow();
    expect(loadEnv({ ...LEGACY_ENV, EVOLUTION_API_BASE: 'http://localhost:8080' }).EVOLUTION_API_BASE).toBe('http://localhost:8080');
    expect(loadEnv({ ...LEGACY_ENV, EVOLUTION_SEND_GAP_MS: '5000' }).EVOLUTION_SEND_GAP_MS).toBe(5000);
    expect(() => loadEnv({ ...LEGACY_ENV, EVOLUTION_SEND_GAP_MS: '999999' })).toThrow();
  });
});
