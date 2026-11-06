import { describe, expect, it } from 'vitest';
import { loadEnv } from '@/config/env/env';
import { evolutionBaseOf } from '@/config/env/whatsapp/env.evolution';
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
      dailyCap: 60, delayMs: 0, linkPreview: false,
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
  it('refuse an http base on another host; an internal docker host only when listed', () => {
    expect(() => loadEnv({ ...LEGACY_ENV, EVOLUTION_API_BASE: 'http://10.0.0.5:8080' })).toThrow();
    expect(loadEnv({ ...LEGACY_ENV, EVOLUTION_API_BASE: 'http://localhost:8080' }).EVOLUTION_API_BASE).toBe('http://localhost:8080');
    const internal = loadEnv({ ...LEGACY_ENV, EVOLUTION_API_BASE: 'http://evolution-api:8080' });
    expect(evolutionBaseOf(internal)).toBe('http://evolution-api:8080');
    const other = loadEnv({ ...LEGACY_ENV, EVOLUTION_API_BASE: 'http://evo-other:8080' });
    expect(evolutionBaseOf(other)).toBeNull();
    expect(evolutionBaseOf({ ...other, EVOLUTION_INTERNAL_HOSTS: 'evo-other' })).toBe('http://evo-other:8080');
    expect(() => loadEnv({ ...LEGACY_ENV, EVOLUTION_INTERNAL_HOSTS: '10.0.0.5' })).toThrow();
  });

  it('reads the gap, cap, typing delay and link preview from the number', () => {
    const env = loadEnv({ ...LEGACY_ENV, ...BASE });
    const config = {
      limits: { gap_ms: 8_000, daily_cap: 20 }, sending: { delay_ms: 1_200, link_preview: true },
    };
    const got = numberEnv({ row: row({ evolution_config: config }), secrets: TOKEN }, env);
    expect(got).toMatchObject({ gapMs: 8_000, dailyCap: 20, delayMs: 1_200, linkPreview: true });
  });
});

describe('the Cloud engine and the webhook marker', () => {
  it('a Cloud instance answers to its Meta access token; the overlay marks the number', () => {
    const env = loadEnv({ ...LEGACY_ENV, ...BASE });
    const cloud = row({ evolution_mode: 'cloud' });
    const got = numberEnv({ row: cloud, secrets: { evolution_cloud_token: 'fake-meta' } }, env);
    expect(got).toMatchObject({ mode: 'cloud', token: 'fake-meta' });
    const off = overlayNumber({ row: row({ enabled: false }), secrets: {} }, env);
    expect(off).toMatchObject({ evolution: true, env: null });
    expect(off.evolutionToken).toBeUndefined();
  });
});
