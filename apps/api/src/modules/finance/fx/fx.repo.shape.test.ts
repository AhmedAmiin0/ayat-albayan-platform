import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { FxRepo } from './fx.repo';

type Calls = ReturnType<typeof fakeDb>['calls'];
const argsAll = (calls: Calls, method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.args);

const NOW = '2026-11-23T10:00:00.000Z';
const snapshot = (rates: Record<string, number>) => ({
  base: 'SAR' as const,
  rates,
  updatedAt: '2026-11-23T00:00:01.000Z',
  provider: 'open.er-api.com',
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FxRepo reads: the single newest SAR→quote row', () => {
  it('newest: SAR and the quote, newest fetched_at first, limit 1, maybeSingle', async () => {
    const row = { quote: 'USD', rate: 0.27 };
    const { db, calls, trips } = fakeDb({ fx_rates: [{ data: row }] });
    expect(await new FxRepo(db).newest('USD')).toBe(row);
    expect(trips).toEqual(['fx_rates']);
    expect(argsAll(calls, 'select')).toEqual([['*']]);
    expect(argsAll(calls, 'eq')).toEqual([['base', 'SAR'], ['quote', 'USD']]);
    expect(argsAll(calls, 'order')).toEqual([['fetched_at', { ascending: false }]]);
    expect(argsAll(calls, 'limit')).toEqual([[1]]);
    expect(argsAll(calls, 'maybeSingle')).toEqual([[]]);
  });

  it('atOrBefore: provider_updated_at ≤ at, newest provider update first', async () => {
    const { db, calls, trips } = fakeDb({ fx_rates: [{ data: null }] });
    expect(await new FxRepo(db).atOrBefore('EGP', NOW)).toBeNull();
    expect(trips).toEqual(['fx_rates']);
    expect(argsAll(calls, 'select')).toEqual([['*']]);
    expect(argsAll(calls, 'eq')).toEqual([['base', 'SAR'], ['quote', 'EGP']]);
    expect(argsAll(calls, 'lte')).toEqual([['provider_updated_at', NOW]]);
    expect(argsAll(calls, 'order')).toEqual([['provider_updated_at', { ascending: false }]]);
    expect(argsAll(calls, 'limit')).toEqual([[1]]);
  });

  it('a read error is thrown as «db: <message>»', async () => {
    const errors = [{ error: { message: 'boom' } }, { error: { message: 'x' } }];
    const { db } = fakeDb({ fx_rates: errors });
    await expect(new FxRepo(db).newest('USD')).rejects.toThrow('db: boom');
    await expect(new FxRepo(db).atOrBefore('USD', NOW)).rejects.toThrow('db: x');
  });
});

describe('FxRepo.save: one upsert of the valid rates', () => {
  it('keeps ISO quotes with a positive rate, all stamped with one fetched_at', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    const rates = { USD: 0.27, EGP: 13.2, usd: 1, EURO: 2, XAU: 0, GBP: -1 };
    const { db, calls, trips } = fakeDb({ fx_rates: [{}] });
    await new FxRepo(db).save(snapshot(rates));
    expect(trips).toEqual(['fx_rates']);
    const base = {
      base: 'SAR',
      provider: 'open.er-api.com',
      provider_updated_at: '2026-11-23T00:00:01.000Z',
      fetched_at: NOW,
    };
    expect(argsAll(calls, 'upsert')).toEqual([
      [
        [
          { ...base, quote: 'USD', rate: 0.27 },
          { ...base, quote: 'EGP', rate: 13.2 },
        ],
        { onConflict: 'base,quote,provider_updated_at' },
      ],
    ]);
  });

  it('no valid rate still sends one upsert of an empty list', async () => {
    const { db, calls, trips } = fakeDb({ fx_rates: [{}] });
    await new FxRepo(db).save(snapshot({ usd: 1 }));
    expect(trips).toEqual(['fx_rates']);
    expect(argsAll(calls, 'upsert')[0]?.[0]).toEqual([]);
  });

  it('an upsert error is thrown as «db: <message>»', async () => {
    const { db } = fakeDb({ fx_rates: [{ error: { message: 'boom' } }] });
    await expect(new FxRepo(db).save(snapshot({ USD: 0.27 }))).rejects.toThrow('db: boom');
  });
});
