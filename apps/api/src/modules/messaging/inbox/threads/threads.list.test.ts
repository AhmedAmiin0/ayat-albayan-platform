import { describe, expect, it } from 'vitest';
import type { BalanceQueries } from '@/modules/finance/subscriptions/money/balance.queries';
import type { PackagesService } from '@/modules/finance/subscriptions/money/packages.service';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { teacherListFilter, threadListQuery } from './threads.list';
import { ThreadsRepo } from './threads.repo';

const V = 'v_threads';
const queriesOn = (db: ReturnType<typeof fakeDb>['db']) =>
  new ThreadsRepo(db, {} as PackagesService, {} as BalanceQueries);

describe('GET /threads list query (R-NFR-08)', () => {
  it('accepts sort, dir and a lead status next to the old params', () => {
    expect(threadListQuery.parse({ sort: 'unread', dir: 'desc', status: 'new', unread: 'true' })).toMatchObject({
      sort: 'unread',
      dir: 'desc',
      status: 'new',
      unread: true,
      page: 1,
    });
  });

  it('rejects a key outside the allowlist and an unknown status', () => {
    expect(threadListQuery.safeParse({ sort: 'phone_e164' }).success).toBe(false);
    expect(threadListQuery.safeParse({ status: 'nope' }).success).toBe(false);
  });
});

describe('ThreadsQueries.list order and filters', () => {
  const page = { page: 2, pageSize: 10 };

  it('no sort: newest message first (the old order), windowed', async () => {
    const { db, calls } = fakeDb({ [V]: [{ data: [], count: 0 }] });
    await queriesOn(db).list(page);
    expect(calls.filter((c) => c.method === 'order').map((c) => c.args)).toEqual([['last_message_at', { ascending: false }]]);
    expect(calls.find((c) => c.method === 'range')?.args).toEqual([10, 19]);
  });

  it('unread first: unread_count desc, then newest; the status filter is one .eq', async () => {
    const { db, calls } = fakeDb({ [V]: [{ data: [], count: 0 }] });
    await queriesOn(db).list({ ...page, sort: 'unread', dir: 'desc', status: 'trial_booked' });
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['lead_status', 'trial_booked']]);
    expect(calls.filter((c) => c.method === 'order').map((c) => c.args)).toEqual([
      ['unread_count', { ascending: false }],
      ['last_message_at', { ascending: false }],
    ]);
  });

  it('by name: unnamed numbers last', async () => {
    const { db, calls } = fakeDb({ [V]: [{ data: [], count: 0 }] });
    await queriesOn(db).list({ ...page, sort: 'name' });
    expect(calls.find((c) => c.method === 'order')?.args).toEqual(['display_name', { ascending: true, nullsFirst: false }]);
  });
});

describe('teacherListFilter', () => {
  const phones = ['+966501234567'];

  it('drops the admin unread order and the lead status (a teacher sees neither)', () => {
    expect(teacherListFilter({ page: 1, pageSize: 25, unread: true, sort: 'unread', dir: 'desc', status: 'new' }, phones)).toEqual({
      page: 1,
      pageSize: 25,
      unread: false,
      phones,
    });
  });

  it('keeps search and the name order', () => {
    expect(teacherListFilter({ page: 1, pageSize: 25, search: 'هبة', sort: 'name', dir: 'desc' }, phones)).toEqual({
      page: 1,
      pageSize: 25,
      search: 'هبة',
      unread: false,
      phones,
      sort: 'name',
      dir: 'desc',
    });
  });
});
