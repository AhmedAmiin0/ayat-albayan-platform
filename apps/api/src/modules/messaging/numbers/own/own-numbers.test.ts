import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../../common/db/db.module';
import type { NumbersQueries } from '../numbers.queries';
import { OwnNumbers, ownPhonesOf, phoneList } from './own-numbers';

// Example numbers only.
const CHAT = '+966500000009';
const NOTIFY = '+966500000008';

function own(rows: { display_phone_e164: string | null }[][]) {
  const all = vi.fn();
  for (const r of rows) all.mockResolvedValueOnce(r);
  return { all, svc: new OwnNumbers({ all } as unknown as NumbersQueries, {} as Db) };
}

beforeEach(() => {
  vi.stubEnv('INTEGRATION_CONFIG_FROM_DB', 'true');
  vi.stubEnv('INTEGRATION_REFRESH_MS', '60000');
});
afterEach(() => vi.unstubAllEnvs());

describe('ownPhonesOf / phoneList', () => {
  it('every row with a display phone, enabled or not, exactly as stored', () => {
    expect([...ownPhonesOf([{ display_phone_e164: CHAT }, { display_phone_e164: null }, { display_phone_e164: NOTIFY }])]).toEqual([CHAT, NOTIFY]);
  });

  it('a quoted PostgREST in-list', () => {
    expect(phoneList([CHAT, NOTIFY])).toBe(`("${CHAT}","${NOTIFY}")`);
  });
});

describe('OwnNumbers', () => {
  it('exact E.164 matches only', async () => {
    const { svc } = own([[{ display_phone_e164: CHAT }]]);
    expect(await svc.has(CHAT)).toBe(true);
    expect(await svc.has('+966500000007')).toBe(false);
    expect(await svc.has('966500000009')).toBe(false);
  });

  it('reads once per refresh period', async () => {
    const { svc, all } = own([[{ display_phone_e164: CHAT }]]);
    await svc.phones(1_000);
    await svc.phones(30_000);
    expect(all).toHaveBeenCalledTimes(1);
  });

  it('a new number row is picked up after a numbers write (forget) or the period', async () => {
    const { svc } = own([[{ display_phone_e164: CHAT }], [{ display_phone_e164: CHAT }, { display_phone_e164: NOTIFY }], [{ display_phone_e164: NOTIFY }]]);
    expect(await svc.has(NOTIFY)).toBe(false);
    svc.forget();
    expect(await svc.has(NOTIFY)).toBe(true);
    expect(await svc.phones(Date.now() + 61_000)).toEqual(new Set([NOTIFY]));
  });

  it('a failed read keeps the last set; none yet = nobody hidden', async () => {
    const all = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce([{ display_phone_e164: CHAT }]).mockRejectedValueOnce(new Error('down'));
    const svc = new OwnNumbers({ all } as unknown as NumbersQueries, {} as Db);
    expect(await svc.has(CHAT)).toBe(false);
    expect(await svc.has(CHAT)).toBe(true);
    svc.forget();
    expect(await svc.has(CHAT)).toBe(true);
    expect(all).toHaveBeenCalledTimes(3);
  });

  it('INTEGRATION_CONFIG_FROM_DB=false: never reads, nobody hidden', async () => {
    vi.stubEnv('INTEGRATION_CONFIG_FROM_DB', 'false');
    const { svc, all } = own([[{ display_phone_e164: CHAT }]]);
    expect(await svc.has(CHAT)).toBe(false);
    expect(all).not.toHaveBeenCalled();
  });
});
