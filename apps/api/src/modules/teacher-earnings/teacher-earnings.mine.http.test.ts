import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { earning, paymentRow, T1, T2 } from './earnings.fakes';

describe('مستحقاتي: a teacher reads only her own money (docs/11 §8b)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.teachers.idByProfile.mockResolvedValue(T1);
    m.earnings.teacher.mockResolvedValue({ id: T1, display_name_ar: 'أبرار' });
    m.earnings.earnings.mockResolvedValue([earning(1, 3, { paid: 90, outstanding: 0, status: 'paid' }), earning(2, 8)]);
    m.earnings.payments.mockResolvedValue([paymentRow()]);
  });

  it('GET /teachers/me/earnings resolves the teacher from the login, never from the URL', async () => {
    const res = await call({ method: 'GET', url: '/teachers/me/earnings', token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(m.earnings.earnings).toHaveBeenCalledWith(T1);
    expect(res.json().balance).toMatchObject({ earned: 180, paid: 90, outstanding: 90, open_sessions: 1 });
    expect(res.json().teacher.id).toBe(T1);
  });

  it('GET /teachers/me/earnings/payments lists her own payments only', async () => {
    const res = await call({ method: 'GET', url: '/teachers/me/earnings/payments', token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(m.earnings.payments).toHaveBeenCalledWith(T1);
    expect(res.json()[0]).not.toHaveProperty('receipt_path');
  });

  it('404 teacher_not_linked for a login without a teacher row', async () => {
    m.teachers.idByProfile.mockResolvedValue(null);
    const res = await call({ method: 'GET', url: '/teachers/me/earnings', token: 'teacher' });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('teacher_not_linked');
    expect(m.earnings.earnings).not.toHaveBeenCalled();
  });

  it('a teacher cannot read another teacher through the admin route, and cannot write', async () => {
    for (const [method, url] of [
      ['GET', `/teachers/${T2}/earnings`],
      ['GET', `/teachers/${T2}/earnings/payments`],
      ['POST', `/teachers/${T2}/earnings/payments`],
    ] as const) expect((await call({ method, url, token: 'teacher', body: {} })).statusCode).toBe(403);
    expect(m.earnings.earnings).not.toHaveBeenCalled();
    expect((await call({ method: 'POST', url: '/teachers/me/earnings/payments', token: 'teacher', body: {} })).statusCode).toBe(403);
  });

  it('an admin has no «مستحقاتي» (role teacher only)', async () => {
    expect((await call({ method: 'GET', url: '/teachers/me/earnings' })).statusCode).toBe(403);
  });
});
