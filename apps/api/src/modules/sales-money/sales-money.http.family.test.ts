import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, SUB_ID, subRow } from '../subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { salesDefaults } from './sales-money.fakes';

const SIBLING = '5a000000-0000-4000-8000-0000000000aa';
const URL = '/sales/money/family?phone=%2B966551110000';

describe('GET /sales/money/family: her students of this chat, with the packages still owed', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
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
    m.subs.list.mockResolvedValue({ items: [subRow()], total: 1, page: 1, pageSize: 20 });
    m.subs.paid.mockResolvedValue(new Map([[SUB_ID, 45]]));
    const res = await call({ method: 'GET', url: URL, token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(m.family.studentsOfPhone).toHaveBeenCalledWith('+966551110000');
    expect(m.subs.list).toHaveBeenCalledWith(expect.objectContaining({ studentId: STUDENT_ID, status: 'unpaid' }));
    const [student, ...rest] = res.json().students;
    expect(rest).toEqual([]);
    expect(student).toMatchObject({ id: STUDENT_ID, status: 'trial', open: [{ id: SUB_ID, price: 145, paid: 45, due: 100 }] });
    expect(Object.keys(student.open[0])).not.toContain('price_source');
    expect(Object.keys(student.open[0])).not.toContain('notes');
  });

  it('a package already paid in full is not offered for a transfer', async () => {
    m.subs.list.mockResolvedValue({ items: [subRow()], total: 1, page: 1, pageSize: 20 });
    m.subs.paid.mockResolvedValue(new Map([[SUB_ID, 145]]));
    const res = await call({ method: 'GET', url: URL, token: 'salesA' });
    expect(res.json().students[0].open).toEqual([]);
  });

  it('a phone that is not E.164 → 400', async () => {
    expect((await call({ method: 'GET', url: '/sales/money/family?phone=abc', token: 'salesA' })).statusCode).toBe(400);
  });
});
