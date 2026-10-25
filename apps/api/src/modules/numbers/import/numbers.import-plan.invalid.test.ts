import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../../config/env/env';
import { LEGACY_ENV, numberRow } from '../numbers.fakes';
import { planAll, type PlanInput } from './numbers.import-plan';

// PR #142 item 16: an id that would fail a wa_numbers check (migration 620, ^[A-Za-z0-9_-]{1,64}$) makes
// its role not importable in the dry run, by field NAME; the value itself is never shown.

const CHAT = { WA_CHAT_PHONE_NUMBER_ID: '1000000002', WA_CHAT_WABA_ID: '2000000002' };
const input = (over: Record<string, string>, rows: PlanInput['rows'] = []): PlanInput => ({
  legacy: loadEnv({ ...LEGACY_ENV, ...CHAT, ...over }),
  db: {},
  env: { ...LEGACY_ENV, ...CHAT, ...over },
  rows,
  status: new Map(),
});

describe('import plan: ids checked like wa_numbers', () => {
  it('an invalid WABA id → that role not importable (no row, no copies); the other role still creates', () => {
    const [notif, chat] = planAll(input({ WA_WABA_ID: 'bad waba id!' }));
    expect(notif).toMatchObject({ action: 'create', row: null, copies: [], secrets_to_copy: [] });
    expect(notif?.not_importable).toEqual({ reason: 'invalid_id', fields: ['waba_id'] });
    expect(notif?.fields).toContainEqual({ field: 'waba_id', secret: false, source: 'env', value: null });
    expect(JSON.stringify(notif)).not.toContain('bad waba id!');
    expect(chat).toMatchObject({ action: 'create', row: { phone_number_id: '1000000002' } });
    expect(chat?.not_importable).toBeUndefined();
  });

  it.each([
    ['phone_number_id', { WA_PHONE_NUMBER_ID: 'x'.repeat(65) }],
    ['app_id', { WA_APP_ID: 'app/id' }],
  ])('an invalid %s is named', (field, over) => {
    expect(planAll(input(over))[0]?.not_importable).toEqual({ reason: 'invalid_id', fields: [field] });
  });

  it('several invalid ids are all named, in field order', () => {
    const [notif] = planAll(input({ WA_WABA_ID: 'w w', WA_APP_ID: 'a.a' }));
    expect(notif?.not_importable?.fields).toEqual(['waba_id', 'app_id']);
  });

  it('valid ids and an absent app id → importable', () => {
    expect(planAll(input({})).map((p) => p.not_importable)).toEqual([undefined, undefined]);
  });

  it('a row already there with that phone id is not blocked (nothing is inserted); the bad value stays hidden', () => {
    const [notif] = planAll(input({ WA_WABA_ID: 'bad waba id!' }, [numberRow()]));
    expect(notif).toMatchObject({ action: 'exists', number_id: numberRow().id });
    expect(notif?.not_importable).toBeUndefined();
    expect(JSON.stringify(notif?.fields)).not.toContain('bad waba id!');
  });
});
