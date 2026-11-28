import { describe, expect, it } from 'vitest';
import { integrationRoutes as routes } from '..';

const ITEM = {
  key: 'WA_WABA_ID',
  group: 'wa_notifications',
  secret: false,
  value: 'waba-1',
  set: true,
  source: 'db',
  updated_at: '2026-11-27T10:00:00.123456+00:00',
};

describe('integrationRoutes', () => {
  it('keeps the paths, tag and permissions of today', () => {
    const lines = Object.values(routes).map(
      (r) => `${r.method} ${r.path} ${r.permissions.join()} ${r.tags.join()}`,
    );
    expect(lines).toEqual([
      'GET /settings/integrations settings.read settings',
      'PUT /settings/integrations settings.write settings',
      'PUT /settings/integrations/secrets/:key settings.write settings',
      'DELETE /settings/integrations/secrets/:key settings.write settings',
      'POST /settings/integrations/storage-probe settings.write settings',
    ]);
  });

  it('answers each key with where its value comes from', () => {
    const unset = { ...ITEM, value: null, set: false, source: 'unset', updated_at: null };
    expect(routes.list.response.parse([ITEM, unset])).toEqual([ITEM, unset]);
    expect(routes.saveValues.response.parse([])).toEqual([]);
  });

  it('refuses an unknown key, an unknown source and a time without offset', () => {
    const bad = [
      { ...ITEM, key: 'NOT_A_KEY' },
      { ...ITEM, source: 'vault' },
      { ...ITEM, updated_at: '2026-11-27 10:00' },
      { ...ITEM, group: 'fax' },
    ];
    for (const item of bad) expect(routes.list.response.safeParse([item]).success).toBe(false);
  });

  it('takes a secret key in the path and refuses a plain one', () => {
    const { params } = routes.saveSecret;
    expect(params.parse({ key: 'WA_ACCESS_TOKEN' })).toEqual({ key: 'WA_ACCESS_TOKEN' });
    expect(params.safeParse({ key: 'WA_WABA_ID' }).success).toBe(false);
    expect(routes.clearSecret.params.safeParse({ key: 'nope' }).success).toBe(false);
  });

  it('trims a secret and refuses a blank one', () => {
    expect(routes.saveSecret.body.parse({ value: ' tok ' })).toEqual({ value: 'tok' });
    expect(routes.saveSecret.body.safeParse({ value: '  ' }).success).toBe(false);
  });

  it('clears a blank plain value and refuses an unknown key', () => {
    const body = routes.saveValues.body;
    expect(body.parse({ values: { WA_WABA_ID: ' ' } })).toEqual({ values: { WA_WABA_ID: null } });
    expect(body.safeParse({ values: { NOPE: 'x' } }).success).toBe(false);
  });

  it('answers a storage probe with its round trip time only', () => {
    const probe = routes.storageProbe.response;
    expect(probe.parse({ data: { ok: true, ms: 42 } })).toEqual({ data: { ok: true, ms: 42 } });
    expect(probe.safeParse({ data: { ok: false, ms: 42 } }).success).toBe(false);
  });
});
