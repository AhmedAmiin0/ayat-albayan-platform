import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID } from '@/modules/finance/subscriptions/money/tests/money.fakes';
import { resetMocks, type Mocks } from '@/modules/finance/subscriptions/tests/test-app';
import { salesMoneyApp } from '@/modules/sales/sales-money/tests/sales-money.test-app';
import { salesDefaults } from '@/modules/sales/sales-money/tests/sales-money.fakes';

const URL = '/sales/money/family?phone=%2B966551110000';
const CHILD = { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', teacher_id: null };

describe('GET /sales/money/family served from its route object', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof salesMoneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await salesMoneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  it('a malformed phone answers the validation_failed envelope before anything is read', async () => {
    const res = await call({ method: 'GET', url: '/sales/money/family?phone=abc', token: 'salesA' });
    expect([res.statusCode, res.json<{ message: string }>().message]).toEqual([
      400,
      'validation_failed',
    ]);
    expect(m.family.studentsOfPhone).not.toHaveBeenCalled();
  });

  it('a stored student status outside its enum is a 500 response_invalid', async () => {
    m.family.studentsOfPhone.mockResolvedValue([{ ...CHILD, status: 'gone' }]);
    const res = await call({ method: 'GET', url: URL, token: 'salesA' });
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([500, 'response_invalid']);
  });

  it('a child answers with its teacher, its renewal seed and nothing owed', async () => {
    m.family.studentsOfPhone.mockResolvedValue([{ ...CHILD, status: 'trial' }]);
    const res = await call({ method: 'GET', url: URL, token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      students: [{ id: STUDENT_ID, status: 'trial', teacher_id: null, mine: true, open: [] }],
    });
  });
});
