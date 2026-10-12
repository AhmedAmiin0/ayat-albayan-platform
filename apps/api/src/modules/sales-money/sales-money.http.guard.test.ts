import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, SUB_ID } from '../subscriptions/money.fakes';
import { moneyApp, resetMocks, type InjectArgs, type Mocks } from '../subscriptions/test-app';
import { AUTO_ASSIGN_OFF, CREATE, MSG, PAY, salesDefaults } from './sales-money.fakes';

const ROUTES: InjectArgs[] = [
  { method: 'POST', url: '/sales/subscriptions/quote', body: { studentId: STUDENT_ID, pricing: { tier: 'weekly' } } },
  { method: 'POST', url: '/sales/subscriptions', body: CREATE },
  { method: 'POST', url: '/sales/payments', body: PAY },
  { method: 'POST', url: '/sales/payments/receipt-upload-url', body: { subscriptionId: SUB_ID, mime: 'image/jpeg', size: 1000 } },
  { method: 'POST', url: '/sales/payments/receipt-from-chat', body: { subscriptionId: SUB_ID, messageId: MSG } },
  { method: 'GET', url: `/sales/money/chat-receipts?studentId=${STUDENT_ID}` },
  { method: 'GET', url: `/sales/money/chat-receipts/${MSG}?studentId=${STUDENT_ID}` },
];

describe('/sales money routes: self.sales_money, and only for her own students', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  const nothingWritten = () => {
    expect(m.subs.insert).not.toHaveBeenCalled();
    expect(m.payments.insert).not.toHaveBeenCalled();
    expect(m.storage.signedUpload).not.toHaveBeenCalled();
    expect(m.storage.copy).not.toHaveBeenCalled();
    expect(m.media.load).not.toHaveBeenCalled();
  };

  it('the admin and a teacher are 403 on every sales money route (they use the admin routes); nothing runs', async () => {
    for (const r of [...ROUTES, { method: 'GET' as const, url: '/sales/money/family?phone=%2B966551110000' }])
      for (const token of ['admin', 'teacher'] as const) expect([r.url, token, (await call({ ...r, token })).statusCode]).toEqual([r.url, token, 403]);
    nothingWritten();
  });

  it('another salesperson’s student → 403 not_your_student on every handler, before any write or file', async () => {
    for (const r of ROUTES) {
      const res = await call({ ...r, token: 'salesB' });
      expect([r.url, res.statusCode, res.json().code]).toEqual([r.url, 403, 'not_your_student']);
    }
    nothingWritten();
  });

  it('settings.sales_auto_assign OFF still blocks money for a student she does not own (docs/16 row 13 is booking-only)', async () => {
    m.settings.all.mockResolvedValue(AUTO_ASSIGN_OFF);
    for (const r of ROUTES) expect((await call({ ...r, token: 'salesB' })).json().code).toBe('not_your_student');
    nothingWritten();
  });

  it('her family view never lists a child she does not own', async () => {
    m.family.studentsOfPhone.mockResolvedValue([{ id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة', status: 'trial' }]);
    m.subs.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const res = await call({ method: 'GET', url: '/sales/money/family?phone=%2B966551110000', token: 'salesB' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ students: [] });
  });
});
