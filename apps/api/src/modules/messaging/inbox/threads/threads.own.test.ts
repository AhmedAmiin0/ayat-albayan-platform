import { describe, expect, it } from 'vitest';
import type { BalanceQueries } from '../../../finance/subscriptions/money/balance.queries';
import type { PackagesService } from '../../../finance/subscriptions/money/packages.service';
import { fakeDb } from '../../../people/guardians/fake-db';
import { teacherListFilter } from './threads.list';
import { ThreadsQueries } from './threads.queries';

// The academy's own numbers (owner 2026-10-27) leave the list in SQL, so total and pages agree. Example numbers.
const OWN = ['+966500000009', '+966500000008'];
const page = { page: 1, pageSize: 25 };
const queriesOn = (db: ReturnType<typeof fakeDb>['db']) => new ThreadsQueries(db, {} as PackagesService, {} as BalanceQueries);

describe('ThreadsQueries.list — hide', () => {
  it('one exact not-in on phone_e164 (v_threads and a chat list alike)', async () => {
    for (const [table, f] of [['v_threads', { ...page, hide: OWN }], ['v_list_threads', { ...page, hide: OWN, list: 'l1' }]] as const) {
      const { db, argsOf } = fakeDb({ [table]: [{ data: [], count: 0 }] });
      await queriesOn(db).list(f);
      expect(argsOf(table, 'not')).toEqual(['phone_e164', 'in', '("+966500000009","+966500000008")']);
    }
  });

  it('nothing to hide: no filter at all', async () => {
    const { db, calls } = fakeDb({ v_threads: [{ data: [], count: 0 }] });
    await queriesOn(db).list({ ...page, hide: [] });
    expect(calls.some((c) => c.method === 'not')).toBe(false);
  });

  it('teacher mode keeps hiding them', () => {
    expect(teacherListFilter({ ...page, hide: OWN }, ['+966501234567'])).toMatchObject({ hide: OWN, phones: ['+966501234567'] });
  });
});
