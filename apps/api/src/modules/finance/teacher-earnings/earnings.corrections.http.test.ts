import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { conflict } from '../../../common/http/errors';
import { ADMIN, moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { PAYMENT, paymentRow, TEACHER } from './earnings.fakes';

describe('teacher earnings corrections and summary (admin)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => resetMocks(m));

  it('POST payments/:id/void voids through the RPC and returns the payment struck through', async () => {
    m.earnings.payment.mockResolvedValue(paymentRow({ voided_at: '2026-10-05T09:00:00Z', void_reason: 'مبلغ خطأ' }));
    const res = await call({ method: 'POST', url: `/teacher-earnings/payments/${PAYMENT}/void`, body: { reason: 'مبلغ خطأ' } });
    expect(res.statusCode).toBe(200);
    expect(m.corrections.voidPayment).toHaveBeenCalledWith({ paymentId: PAYMENT, actorId: ADMIN.id, reason: 'مبلغ خطأ' });
    expect(res.json()).toMatchObject({ id: PAYMENT, voided_at: '2026-10-05T09:00:00Z', void_reason: 'مبلغ خطأ' });
  });

  it('a reason is required; a second void is 409 already_voided; teachers are refused', async () => {
    expect((await call({ method: 'POST', url: `/teacher-earnings/payments/${PAYMENT}/void`, body: { reason: ' ' } })).statusCode).toBe(400);
    m.corrections.voidPayment.mockRejectedValue(conflict('already_voided'));
    const again = await call({ method: 'POST', url: `/teacher-earnings/payments/${PAYMENT}/void`, body: { reason: 'مكرر' } });
    expect(again.json().code).toBe('already_voided');
    const teacher = await call({ method: 'POST', url: `/teacher-earnings/payments/${PAYMENT}/void`, body: { reason: 'مكرر' }, token: 'teacher' });
    expect(teacher.statusCode).toBe(403);
  });

  it('GET summary is not mistaken for a teacher id and totals what every teacher is owed', async () => {
    m.corrections.summary.mockResolvedValue([
      { teacher_id: TEACHER, display_name_ar: 'أبرار', sessions: 4, earned: 280, paid: 70, owed: 210, unpaid_sessions: 3, oldest_unpaid_at: '2026-09-02T15:00:00Z' },
    ]);
    const res = await call({ method: 'GET', url: '/teacher-earnings/summary' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ currency: 'EGP', totals: { owed: 210, teachers_owed: 1 }, rows: [{ teacher: { id: TEACHER } }] });
    expect((await call({ method: 'GET', url: '/teacher-earnings/summary', token: 'teacher' })).statusCode).toBe(403);
  });
});
