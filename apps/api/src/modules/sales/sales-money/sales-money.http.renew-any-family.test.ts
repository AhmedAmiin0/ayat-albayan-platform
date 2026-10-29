import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { systemResolver } from '../../../common/auth/auth.guard';
import type { PermissionResolver } from '../../../common/auth/permissions';
import { STUDENT_ID } from '../../finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../../finance/subscriptions/test-app';
import { salesDefaults } from './sales-money.fakes';

// GET /sales/money/family with sales.renew_any (owner 2026-10-29, docs/16 row 38): every child, `mine` says whose.
const SIBLING = '5a000000-0000-4000-8000-0000000000aa';
const URL = '/sales/money/family?phone=%2B966551110000';
const withRenewAny: PermissionResolver = async (user) => [...(await systemResolver(user)), ...(user.role === 'sales' ? ['sales.renew_any' as const] : [])];

/** Her child STUDENT_ID (salesA) and a sibling nobody owns, no package owed. */
function twoChildren(m: Mocks): void {
  resetMocks(m);
  salesDefaults(m);
  m.family.studentsOfPhone.mockResolvedValue([
    { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', status: 'active' },
    { id: SIBLING, code: 'AB-0184', name: 'أخوها', status: 'expired' },
  ]);
  m.subs.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  m.subs.forStudent.mockResolvedValue([]);
}

describe('GET /sales/money/family and sales.renew_any', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];
  const family = async (token: 'salesA' | 'salesB') => (await call({ method: 'GET', url: URL, token })).json().students;

  beforeAll(async () => ({ app, m, call } = await moneyApp(withRenewAny)));
  afterAll(() => app.close());
  beforeEach(() => twoChildren(m));

  it('lists every child of this chat’s family, hers marked mine: true, the others mine: false', async () => {
    expect((await family('salesA')).map((s: { id: string; mine: boolean }) => [s.id, s.mine])).toEqual([[STUDENT_ID, true], [SIBLING, false]]);
    expect((await family('salesB')).map((s: { mine: boolean }) => s.mine)).toEqual([false, false]);
    expect(m.family.studentsOfPhone).toHaveBeenCalledWith('+966551110000');
  });

  it('only that phone’s family: the children of another chat never appear', async () => {
    m.family.studentsOfPhone.mockResolvedValue([]);
    expect(await family('salesB')).toEqual([]);
  });
});

describe('GET /sales/money/family without sales.renew_any: unchanged', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => twoChildren(m));

  it('only her own child (mine: true); nothing for a salesperson who owns none of them', async () => {
    const mine = (await call({ method: 'GET', url: URL, token: 'salesA' })).json().students;
    expect(mine.map((s: { id: string; mine: boolean }) => [s.id, s.mine])).toEqual([[STUDENT_ID, true]]);
    expect((await call({ method: 'GET', url: URL, token: 'salesB' })).json()).toEqual({ students: [] });
  });
});
