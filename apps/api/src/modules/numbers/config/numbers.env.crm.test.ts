import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../../config/env/env';
import { numberEnv } from './numbers.env';
import { LEGACY_ENV, numberRow } from '../numbers.fakes';
import { differences, parityRoles } from '../lines/numbers.parity';

// docs/19 «crm driver» in module mode: a crm number sends with WACRM_API_BASE / WACRM_API_KEY, like a kapso
// number with Kapso's project key; its ids only name it and no Meta token is needed.

const CRM = { WACRM_API_BASE: 'http://localhost:4010/crm/api/v1/', WACRM_API_KEY: 'crm-key-fake' };

describe('numberEnv: a crm number', () => {
  it('the CRM base (slash trimmed) and key; no WABA or token of its own needed', () => {
    const env = loadEnv({ ...LEGACY_ENV, ...CRM });
    expect(numberEnv({ row: numberRow({ provider: 'crm', waba_id: null }), secrets: {} }, env)).toEqual({
      provider: 'crm', base: 'http://localhost:4010/crm/api/v1', apiKey: 'crm-key-fake',
    });
  });

  it('cannot send without the CRM keys, or while disabled', () => {
    expect(numberEnv({ row: numberRow({ provider: 'crm' }), secrets: {} }, loadEnv(LEGACY_ENV))).toBeNull();
    const env = loadEnv({ ...LEGACY_ENV, ...CRM });
    expect(numberEnv({ row: numberRow({ provider: 'crm', enabled: false }), secrets: {} }, env)).toBeNull();
  });
});

describe('parity on a crm line', () => {
  it('the same crm config on both sides is no difference; the key shows only as set', () => {
    const env = loadEnv({ ...LEGACY_ENV, ...CRM, WA_PROVIDER: 'crm' });
    const roles = parityRoles({ legacy: env, module: env, numbers: {} });
    expect(differences(roles)).toEqual([]);
    const fields = Object.fromEntries((roles[0]?.fields ?? []).map((f) => [f.field, f.legacy]));
    expect(fields).toMatchObject({ provider: 'crm', api_base: 'http://localhost:4010/crm/api/v1', access_token: 'set', waba_id: null, api_version: null });
    expect(JSON.stringify(roles)).not.toContain('crm-key-fake');
  });
});
