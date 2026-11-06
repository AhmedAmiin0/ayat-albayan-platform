import { describe, expect, it } from 'vitest';
import { integrationValueValid } from './checks.js';
import { driverKeys } from './driver-keys.js';
import {
  evolutionBase, evolutionBaseAllowed, evolutionInternalHosts, evolutionInternalList,
} from './evolution.js';
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
    expect(evolutionBase.safeParse('https://192.168.1.10').success).toBe(false);
    expect(evolutionBase.safeParse('ftp://localhost').success).toBe(false);
    expect(evolutionBase.safeParse('https://u:p@evo.example.com').success).toBe(false);
    expect(evolutionBase.safeParse('https://evo.example.com/?x=1').success).toBe(false);
    expect(evolutionBase.safeParse('not a url').success).toBe(false);
  });

  it('allows plain http to a listed internal docker host only (SSRF allow-list)', () => {
    const internal = evolutionInternalList(undefined);
    expect(internal).toEqual(['evolution-api']);
    expect(evolutionBaseAllowed('http://evolution-api:8080', internal)).toBe(true);
    expect(evolutionBaseAllowed('http://other-svc:8080', internal)).toBe(false);
    expect(evolutionBaseAllowed('http://10.0.0.5:8080', ['10.0.0.5'])).toBe(false);
    expect(evolutionBaseAllowed('https://10.0.0.5', internal)).toBe(false);
    expect(evolutionBaseAllowed('https://[fd00::1]', internal)).toBe(false);
    expect(evolutionBaseAllowed('http://169.254.169.254/latest', internal)).toBe(false);
    expect(evolutionBase.safeParse('http://evolution-api:8080').success).toBe(true);
  });

  it('keeps the internal list to one-word host names', () => {
    expect(evolutionInternalHosts.safeParse('evolution-api, evo2').success).toBe(true);
    expect(evolutionInternalList('Evo-API , ')).toEqual(['evo-api']);
    expect(evolutionInternalHosts.safeParse('evo.example.com').success).toBe(false);
    expect(evolutionInternalHosts.safeParse('192.168.1.2').success).toBe(false);
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
