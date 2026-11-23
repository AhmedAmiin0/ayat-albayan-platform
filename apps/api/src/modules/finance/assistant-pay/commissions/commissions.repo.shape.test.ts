import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { COMMISSION_SELECT } from './commissions.mapper';
import { CommissionsRepo } from './commissions.repo';

interface Call { table: string; method: string; args: unknown[] }
const argsAll = (calls: Call[], method: string) =>
  calls.filter((c) => c.method === method).map((c) => c.args);

describe('CommissionsRepo.list shape', () => {
  it('no filter: the ledger newest first then id, capped at 500, one trip', async () => {
    const rows = [{ id: 'c1' }, { id: 'c2' }];
    const { db, calls, trips } = fakeDb({ assistant_commissions: [{ data: rows }] });
    expect(await new CommissionsRepo(db).list({})).toEqual(rows);
    expect(calls.every((c) => c.table === 'assistant_commissions')).toBe(true);
    expect(argsAll(calls, 'select')).toEqual([[COMMISSION_SELECT]]);
    expect([...argsAll(calls, 'eq'), ...argsAll(calls, 'gte'), ...argsAll(calls, 'lt')]).toEqual([]);
    expect(argsAll(calls, 'order')).toEqual([['earned_at', { ascending: false }], ['id']]);
    expect(argsAll(calls, 'limit')).toEqual([[500]]);
    expect(trips).toEqual(['assistant_commissions']);
  });

  it('every filter: eq assistant and status, half-open earned_at window', async () => {
    const { db, calls } = fakeDb({ assistant_commissions: [{ data: [] }] });
    const f = { assistantId: 'a1', status: 'earned' as const, from: 'F', to: 'T' };
    await new CommissionsRepo(db).list(f);
    expect(argsAll(calls, 'eq')).toEqual([
      ['assistant_id', 'a1'],
      ['status', 'earned'],
    ]);
    expect(argsAll(calls, 'gte')).toEqual([['earned_at', 'F']]);
    expect(argsAll(calls, 'lt')).toEqual([['earned_at', 'T']]);
  });

  it('a db error is thrown, never an empty ledger', async () => {
    const error = { code: 'XX000', message: 'boom' };
    const { db } = fakeDb({ assistant_commissions: [{ error }] });
    await expect(new CommissionsRepo(db).list({})).rejects.toThrow('db error XX000: boom');
  });
});
