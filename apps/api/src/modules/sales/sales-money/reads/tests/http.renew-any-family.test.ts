import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { systemResolver } from '@/common/auth/auth.guard';
import type { PermissionResolver } from '@/common/auth/permissions';
import {
  STUDENT_ID,
  SUB_ID,
  subRow,
} from '@/modules/finance/subscriptions/money/tests/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';
import { salesMoneyApp } from '@/modules/sales/sales-money/tests/sales-money.test-app';
import { salesDefaults } from '@/modules/sales/sales-money/tests/sales-money.fakes';

// GET /sales/money/family with sales.renew_any (docs/16 row 38): every child, `mine` says whose.
const SIBLING = '5a000000-0000-4000-8000-0000000000aa';
const URL = '/sales/money/family?phone=%2B966551110000';
const withRenewAny: PermissionResolver = async (user) => [
  ...(await systemResolver(user)),
  ...(user.role === 'sales' ? ['sales.renew_any' as const] : []),
];

/** Her child STUDENT_ID (salesA) and a sibling nobody owns, no package owed. */
function twoChildren(m: Mocks): void {
  resetMocks(m);
  salesDefaults(m);
  m.family.studentsOfPhone.mockResolvedValue([
    { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', status: 'active' },
    { id: SIBLING, code: 'AB-0184', name: 'أخوها', status: 'expired' },
  ]);
  m.subs.forStudent.mockResolvedValue([]);
}

describe('GET /sales/money/family and sales.renew_any', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof salesMoneyApp>>['call'];
  const family = async (token: 'salesA' | 'salesB') =>
    (await call({ method: 'GET', url: URL, token })).json().students;

  beforeAll(async () => ({ app, m, call } = await salesMoneyApp(withRenewAny)));
  afterAll(() => app.close());
  beforeEach(() => twoChildren(m));

  it('lists every child of this chat’s family, hers marked mine: true, the others mine: false', async () => {
    expect(
      (await family('salesA')).map((s: { id: string; mine: boolean }) => [s.id, s.mine]),
    ).toEqual([
      [STUDENT_ID, true],
      [SIBLING, false],
    ]);
    expect((await family('salesB')).map((s: { mine: boolean }) => s.mine)).toEqual([false, false]);
    expect(m.family.studentsOfPhone).toHaveBeenCalledWith('+966551110000');
  });

  it('only that phone’s family: the children of another chat never appear', async () => {
    m.family.studentsOfPhone.mockResolvedValue([]);
    expect(await family('salesB')).toEqual([]);
  });

  it('reads the packages owed of every child at once, each child keeping its own', async () => {
    const own = (id: string) => [subRow({ id: id === STUDENT_ID ? SUB_ID : 'sibling-sub' })];
    m.subs.forStudent.mockImplementation(async (id: string) => own(id));
    const students: { open: { id: string }[] }[] = await family('salesA');
    const open = students.map((s) => s.open.map((o) => o.id));
    expect(open).toEqual([[SUB_ID], ['sibling-sub']]);
    expect(m.subs.list).not.toHaveBeenCalled();
    expect(m.family.linkPackages).toHaveBeenCalledTimes(1);
    expect(m.family.linkPackages).toHaveBeenCalledWith([SUB_ID, 'sibling-sub']);
  });
});

describe('GET /sales/money/family without sales.renew_any: unchanged', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof salesMoneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await salesMoneyApp()));
  afterAll(() => app.close());
  beforeEach(() => twoChildren(m));

  it('only her own child (mine: true); nothing for a salesperson who owns none of them', async () => {
    const mine = (await call({ method: 'GET', url: URL, token: 'salesA' })).json().students;
    expect(mine.map((s: { id: string; mine: boolean }) => [s.id, s.mine])).toEqual([
      [STUDENT_ID, true],
    ]);
    expect((await call({ method: 'GET', url: URL, token: 'salesB' })).json()).toEqual({
      students: [],
    });
  });
});
