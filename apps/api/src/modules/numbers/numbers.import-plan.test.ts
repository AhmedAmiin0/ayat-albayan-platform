import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../env';
import { LEGACY_ENV, numberRow } from './numbers.fakes';
import { planAll, type PlanInput } from './numbers.import-plan';

const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  legacy: loadEnv(LEGACY_ENV),
  db: { WA_ACCESS_TOKEN: 'token-fake' },
  env: { WA_PHONE_NUMBER_ID: '1000000001', WA_WABA_ID: '2000000001', WA_APP_SECRET: 'secret-fake' },
  rows: [],
  status: new Map(),
  ...over,
});

describe('import plan (dry run)', () => {
  it('a configured role → create, each field with its source; secrets never carry a value', () => {
    const [notif, chat] = planAll(input());
    expect(notif).toMatchObject({ role: 'notifications', action: 'create', number_id: null, secrets_to_copy: ['access_token', 'app_secret'] });
    expect(notif?.fields).toContainEqual({ field: 'phone_number_id', secret: false, source: 'env', value: '1000000001' });
    expect(notif?.fields).toContainEqual({ field: 'access_token', secret: true, source: 'db', value: null });
    expect(notif?.copies).toEqual([
      { name: 'access_token', key: 'WA_ACCESS_TOKEN', source: 'db' },
      { name: 'app_secret', key: 'WA_APP_SECRET', source: 'env' },
    ]);
    expect(chat).toMatchObject({ role: 'chat', action: 'unconfigured', secrets_to_copy: [] });
    expect(JSON.stringify(planAll(input()).map((p) => p.fields))).not.toMatch(/token-fake|secret-fake/);
  });

  it('a row with the same phone id and both secrets set → exists, nothing to copy (idempotent)', () => {
    const row = numberRow();
    const status = new Map([[row.id, { access_token: '2026-10-23T08:00:00Z', app_secret: '2026-10-23T08:00:00Z' }]]);
    const [notif] = planAll(input({ rows: [row], status }));
    expect(notif).toMatchObject({ action: 'exists', number_id: row.id, secrets_to_copy: [], copies: [] });
  });

  it('a chat line without its own token copies the notifications token, as the legacy fallback does', () => {
    const legacy = loadEnv({ ...LEGACY_ENV, WA_CHAT_PHONE_NUMBER_ID: '1000000002', WA_CHAT_WABA_ID: '2000000002' });
    const [, chat] = planAll(input({ legacy, env: { WA_CHAT_PHONE_NUMBER_ID: '1000000002' } }));
    expect(chat).toMatchObject({ action: 'create' });
    expect(chat?.copies).toEqual([{ name: 'access_token', key: 'WA_ACCESS_TOKEN', source: 'db' }]);
  });
});
