import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, SUB_ID, subRow, WEEKLY_SA } from './money.fakes';
import { moneyApp, resetMocks, type Mocks } from './test-app';

describe('subscriptions routes (S1–S6, R-SUB-01)', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => resetMocks(m));

  const create = { studentId: STUDENT_ID, startsOn: '2026-10-01', pricing: { tier: 'weekly' } };

  it('S2: priced from the catalog quote with the guardian country, never the body', async () => {
    m.subs.studentForQuote.mockResolvedValue({ id: STUDENT_ID, country: 'SA' });
    m.pricing.quote.mockResolvedValue(WEEKLY_SA);
    m.subs.insert.mockResolvedValue(subRow());
    m.subs.get.mockResolvedValue(subRow());
    const res = await call({ method: 'POST', url: '/subscriptions', body: { ...create, price: 1 } });
    expect(res.statusCode).toBe(201);
    expect(m.pricing.quote).toHaveBeenCalledWith({ tier: 'weekly', duration: 45, discount: 0, students: 1, country: 'SA' });
    expect(m.subs.insert).toHaveBeenCalledWith(
      expect.objectContaining({ package: '4', lessons_total: 4, duration: 90, price: 145, currency: 'SAR', status: 'unpaid' }),
    );
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'subscriptions', action: 'create' }));
    expect(m.subs.forStudent).toHaveBeenCalledWith(STUDENT_ID); // status recompute + alerts
    expect(res.json()).toMatchObject({ id: SUB_ID, price: 145, paid: 0, balance: { remaining: 4 } });
  });

  it('S2: a custom count has no package size; an explicit country wins', async () => {
    m.subs.studentForQuote.mockResolvedValue({ id: STUDENT_ID, country: 'SA' });
    m.pricing.quote.mockResolvedValue({ ...WEEKLY_SA, package: 'custom', lessons: 10 });
    m.subs.insert.mockResolvedValue(subRow());
    m.subs.get.mockResolvedValue(subRow());
    const body = { ...create, pricing: { count: 10, country: 'eg', duration: 30 } };
    expect((await call({ method: 'POST', url: '/subscriptions', body })).statusCode).toBe(201);
    expect(m.pricing.quote).toHaveBeenCalledWith(expect.objectContaining({ count: 10, country: 'EG', duration: 30 }));
    expect(m.subs.insert).toHaveBeenCalledWith(expect.objectContaining({ package: null, lessons_total: 10 }));
  });

  it('S2: 404 student_not_found; 400 without pricing', async () => {
    m.subs.studentForQuote.mockResolvedValue(null);
    const res = await call({ method: 'POST', url: '/subscriptions', body: create });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('student_not_found');
    const bad = await call({ method: 'POST', url: '/subscriptions', body: { studentId: STUDENT_ID } });
    expect(bad.statusCode).toBe(400);
  });

  it('quote preview: the same resolution as S2, nothing written', async () => {
    m.subs.studentForQuote.mockResolvedValue({ id: STUDENT_ID, country: null });
    m.pricing.quote.mockResolvedValue(WEEKLY_SA);
    const res = await call({ method: 'POST', url: '/subscriptions/quote', body: { studentId: STUDENT_ID, pricing: { tier: 'weekly' } } });
    expect(res.statusCode).toBe(200);
    expect(m.pricing.quote).toHaveBeenCalledWith(expect.objectContaining({ tier: 'weekly', country: undefined }));
    expect(res.json()).toMatchObject({ afterDiscount: 145, currency: 'SAR' });
    expect(m.subs.insert).not.toHaveBeenCalled();
  });

  it('S1: a page of views with balances and payments', async () => {
    m.subs.list.mockResolvedValue({ items: [subRow()], total: 1, page: 1, pageSize: 25 });
    m.subs.paid.mockResolvedValue(new Map([[SUB_ID, 145]]));
    const res = await call({ method: 'GET', url: `/subscriptions?status=unpaid&studentId=${STUDENT_ID}` });
    expect(res.statusCode).toBe(200);
    expect(m.subs.list).toHaveBeenCalledWith({ page: 1, pageSize: 25, status: 'unpaid', studentId: STUDENT_ID });
    expect(res.json().items[0]).toMatchObject({ student: { code: 'AB-0183', name: 'سهيلة' }, paid: 145 });
  });

  it('S1: teachers are refused (admin only)', async () => {
    expect((await call({ method: 'GET', url: '/subscriptions', token: 'teacher' })).statusCode).toBe(403);
  });

  it('S4: pause writes paused; resume starts from unpaid and is recomputed', async () => {
    m.subs.get.mockResolvedValue(subRow({ status: 'paused' }));
    m.subs.update.mockResolvedValue(subRow({ status: 'unpaid' }));
    const res = await call({ method: 'PATCH', url: `/subscriptions/${SUB_ID}`, body: { paused: false } });
    expect(res.statusCode).toBe(200);
    expect(m.subs.update).toHaveBeenCalledWith(SUB_ID, { status: 'unpaid' });
    m.subs.get.mockResolvedValue(subRow({ status: 'active' }));
    await call({ method: 'PATCH', url: `/subscriptions/${SUB_ID}`, body: { paused: true } });
    expect(m.subs.update).toHaveBeenLastCalledWith(SUB_ID, { status: 'paused' });
  });

  it('S5: 409 has_payments; 204 otherwise', async () => {
    m.subs.get.mockResolvedValue(subRow());
    m.subs.hasPayments.mockResolvedValue(true);
    const res = await call({ method: 'DELETE', url: `/subscriptions/${SUB_ID}` });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('has_payments');
    m.subs.hasPayments.mockResolvedValue(false);
    expect((await call({ method: 'DELETE', url: `/subscriptions/${SUB_ID}` })).statusCode).toBe(204);
    expect(m.subs.remove).toHaveBeenCalledWith(SUB_ID);
  });

  it('S3: 404 subscription_not_found', async () => {
    m.subs.get.mockResolvedValue(null);
    const res = await call({ method: 'GET', url: `/subscriptions/${SUB_ID}` });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('subscription_not_found');
  });

  it('S6: a teacher reads a student balance after the access check', async () => {
    m.subs.forStudent.mockResolvedValue([subRow({ status: 'active' })]);
    const res = await call({ method: 'GET', url: `/students/${STUDENT_ID}/balance`, token: 'teacher' });
    expect(res.statusCode).toBe(200);
    expect(m.access.check).toHaveBeenCalledWith(expect.objectContaining({ role: 'teacher' }), STUDENT_ID);
    expect(res.json()).toMatchObject({ student_id: STUDENT_ID, remaining: 4 });
    // A teacher gets lesson counts only: no price, paid, fx or quote (and no `current` package row).
    expect(res.json().packages[0]).toMatchObject({ subscription_id: SUB_ID });
    expect(JSON.stringify(res.json())).not.toMatch(/price|paid|currency|fx_rate/);
    const admin = await call({ method: 'GET', url: `/students/${STUDENT_ID}/balance` });
    expect(admin.json()).toMatchObject({ current: { id: SUB_ID, price: expect.any(Number) } });
  });
});
