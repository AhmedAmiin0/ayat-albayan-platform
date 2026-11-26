import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, SUB_ID, subRow } from '@/modules/finance/subscriptions/money/tests/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';
import { salesMoneyApp } from '@/modules/sales/sales-money/tests/sales-money.test-app';
import { salesDefaults } from '@/modules/sales/sales-money/tests/sales-money.fakes';

const SIBLING = '5a000000-0000-4000-8000-0000000000aa';
const URL = '/sales/money/family?phone=%2B966551110000';

describe('GET /sales/money/family: her students of this chat, with the packages still owed', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof salesMoneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await salesMoneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
    m.family.studentsOfPhone.mockResolvedValue([
      { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', status: 'trial' },
      { id: SIBLING, code: 'AB-0184', name: 'أخوها', status: 'active' },
    ]);
  });

  it('only her own child (not the sibling brought by someone else), with its unpaid package, whitelisted', async () => {
    m.subs.forStudent.mockResolvedValue([subRow()]);
    m.subs.paid.mockResolvedValue(new Map([[SUB_ID, 45]]));
    const res = await call({ method: 'GET', url: URL, token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(m.family.studentsOfPhone).toHaveBeenCalledWith('+966551110000');
    expect(m.subs.withStudentFor).toHaveBeenCalledWith([STUDENT_ID]);
    expect(m.subs.list).not.toHaveBeenCalled();
    const [student, ...rest] = res.json().students;
    expect(rest).toEqual([]);
    expect(student).toMatchObject({ id: STUDENT_ID, status: 'trial', open: [{ id: SUB_ID, price: 145, paid: 45, due: 100 }] });
    expect(Object.keys(student.open[0])).not.toContain('price_source');
    expect(Object.keys(student.open[0])).not.toContain('notes');
  });

  it('a package already paid in full is not offered for a transfer', async () => {
    m.subs.forStudent.mockResolvedValue([subRow()]);
    m.subs.paid.mockResolvedValue(new Map([[SUB_ID, 145]]));
    const res = await call({ method: 'GET', url: URL, token: 'salesA' });
    expect(res.json().students[0].open).toEqual([]);
  });

  it('a package a payment link is still open for is the link’s to pay: never offered for a transfer too', async () => {
    m.subs.forStudent.mockResolvedValue([subRow()]);
    m.family.linkPackages.mockResolvedValue([SUB_ID]);
    const res = await call({ method: 'GET', url: URL, token: 'salesA' });
    expect(m.family.linkPackages).toHaveBeenCalledWith([SUB_ID]);
    expect(res.json().students[0].open).toEqual([]);
  });

  it('offers at most the newest twenty unpaid packages of a child', async () => {
    const day = (i: number) => `2026-09-${String(i + 1).padStart(2, '0')}T09:00:00Z`;
    const sub = (i: number) => subRow({ id: `sub-${i}`, created_at: day(i) });
    const many = Array.from({ length: 21 }, (_, i) => sub(i));
    m.subs.forStudent.mockResolvedValue(many);
    const res = await call({ method: 'GET', url: URL, token: 'salesA' });
    const open: { id: string }[] = res.json().students[0].open;
    expect(open).toHaveLength(20);
    expect(open.map((o) => o.id)).not.toContain('sub-0');
  });

  it('a phone that is not E.164 → 400', async () => {
    expect((await call({ method: 'GET', url: '/sales/money/family?phone=abc', token: 'salesA' })).statusCode).toBe(400);
  });
});
