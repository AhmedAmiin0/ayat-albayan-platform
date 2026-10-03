import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { earning, OTHER_TEACHER, PAYMENT, paymentRow, session, TEACHER } from './earnings.fakes';

describe('teachers/me/earnings (a teacher reads only their own)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];
  const mine = (url: string) => call({ method: 'GET', url: `/teachers/me/earnings${url}`, token: 'teacher' });

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.teachers.idByProfile.mockResolvedValue(TEACHER);
    m.earnings.teacher.mockResolvedValue({ id: TEACHER, display_name_ar: 'أبرار' });
  });

  it('the teacher’s balance totals only what the countable view returned', async () => {
    m.earnings.money.mockResolvedValue([earning(1)]); // a churned student's session is not in the view
    expect((await mine('')).json()).toMatchObject({ earned: 70, outstanding: 70, sessions: 1 });
  });

  it('balance, sessions and payments are read for the teacher behind the token', async () => {
    m.earnings.money.mockResolvedValue([earning(1, { paid_amount: 70, status: 'paid' }), earning(2)]);
    expect((await mine('')).json()).toMatchObject({ earned: 140, paid: 70, outstanding: 70 });
    m.earnings.sessions.mockResolvedValue({ items: [session(2)], total: 1, page: 1, pageSize: 25 });
    expect((await mine('/sessions?status=earned')).statusCode).toBe(200);
    expect(m.earnings.sessions).toHaveBeenCalledWith(TEACHER, expect.objectContaining({ status: 'earned' }));
    m.earnings.payments.mockResolvedValue({ items: [paymentRow()], total: 1, page: 1, pageSize: 25 });
    expect((await mine('/payments')).json().items[0]).toMatchObject({ amount: 100, has_receipt: false });
    expect(m.earnings.money).toHaveBeenCalledWith(TEACHER);
  });

  it('there is no way to name another teacher: a teacherId in the query is ignored', async () => {
    m.earnings.sessions.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
    await mine(`/sessions?teacherId=${OTHER_TEACHER}`);
    expect(m.earnings.sessions).toHaveBeenCalledWith(TEACHER, expect.anything());
    expect((await call({ method: 'GET', url: `/teacher-earnings/${OTHER_TEACHER}`, token: 'teacher' })).statusCode).toBe(403);
  });

  it('another teacher’s receipt is 404, their own is signed', async () => {
    m.earnings.payment.mockResolvedValue(paymentRow({ teacher_id: OTHER_TEACHER, receipt_path: `${OTHER_TEACHER}/a.png` }));
    const other = await mine(`/payments/${PAYMENT}/receipt`);
    expect(other.statusCode).toBe(404);
    expect(m.storage.signedDownload).not.toHaveBeenCalled();
    m.earnings.payment.mockResolvedValue(paymentRow({ receipt_path: `${TEACHER}/a.png` }));
    m.storage.signedDownload.mockResolvedValue({ url: 'u', expires_at: 'e' });
    expect((await mine(`/payments/${PAYMENT}/receipt`)).statusCode).toBe(200);
  });

  it('a teacher account without a teachers row → 404 teacher_not_linked; an admin token → 403', async () => {
    m.teachers.idByProfile.mockResolvedValue(null);
    expect((await mine('')).json().code).toBe('teacher_not_linked');
    expect((await call({ method: 'GET', url: '/teachers/me/earnings' })).statusCode).toBe(403);
  });

  it('read only: no write verb exists on the teacher routes', async () => {
    for (const method of ['POST', 'PATCH', 'DELETE'] as const) {
      const res = await call({ method, url: '/teachers/me/earnings/payments', token: 'teacher', body: {} });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    }
    expect(m.earnings.record).not.toHaveBeenCalled();
  });
});
