import { describe, expect, it } from 'vitest';
import { integrationValueValid } from './checks.js';
import { driverKeys } from './driver-keys.js';
import { evolutionBase, evolutionGapMs } from './evolution.js';
import { integrationDef, integrationEnum, WA_LINE_PROVIDERS } from './keys.js';

// The Evolution driver's config (docs/19 «Evolution driver»): base URL (SSRF), pacing, keys.

describe('Evolution config', () => {
  it('accepts an https base anywhere and an http base on localhost only', () => {
    expect(evolutionBase.safeParse('https://evo.example.com').success).toBe(true);
    expect(evolutionBase.safeParse('https://evo.example.com/api').success).toBe(true);
    expect(evolutionBase.safeParse('http://localhost:8080').success).toBe(true);
    expect(evolutionBase.safeParse('http://127.0.0.1:8080').success).toBe(true);
    expect(evolutionBase.safeParse('http://[::1]:8080').success).toBe(true);
  });

  it('refuses plain http to another host, other schemes, credentials and queries', () => {
    expect(evolutionBase.safeParse('http://10.0.0.5:8080').success).toBe(false);
    expect(evolutionBase.safeParse('http://evo.example.com').success).toBe(false);
    expect(evolutionBase.safeParse('ftp://localhost').success).toBe(false);
    expect(evolutionBase.safeParse('https://u:p@evo.example.com').success).toBe(false);
    expect(evolutionBase.safeParse('https://evo.example.com/?x=1').success).toBe(false);
    expect(evolutionBase.safeParse('not a url').success).toBe(false);
  });

  it('bounds the send gap to 0..60 s', () => {
    expect(evolutionGapMs.safeParse('3000').data).toBe(3000);
    expect(evolutionGapMs.safeParse('-1').success).toBe(false);
    expect(evolutionGapMs.safeParse('60001').success).toBe(false);
  });

  it('keeps Evolution off the legacy line selects and checks the plain keys', () => {
    expect(WA_LINE_PROVIDERS).toEqual(['meta', 'kapso', 'crm']);
    expect(integrationEnum('WA_PROVIDER')).toEqual(['meta', 'kapso', 'crm']);
    expect(integrationValueValid('WA_CHAT_PROVIDER', 'evolution')).toBe(false);
    expect(integrationValueValid('EVOLUTION_API_BASE', 'http://192.168.1.2')).toBe(false);
    expect(integrationDef('EVOLUTION_API_KEY')).toMatchObject({ group: 'evolution', secret: true });
    expect(integrationDef('EVOLUTION_API_BASE')).toMatchObject({ group: 'evolution', secret: false });
  });

  it('an Evolution line needs only the base from «التكاملات»', () => {
    expect(driverKeys('evolution', 'chat')).toEqual(['EVOLUTION_API_BASE']);
  });
});
