import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { STUDENT_ID, SUB_ID, subRow, WEEKLY_SA } from '../../finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, SALES_A, type Mocks } from '../../finance/subscriptions/test-app';
import { CREATE, REQ, salesDefaults } from './sales-money.fakes';

const SUB_KEYS = ['currency', 'due', 'duration', 'id', 'lessons_total', 'lessons_used_before', 'package', 'paid', 'price', 'starts_on', 'status', 'student'];

describe('POST /sales/subscriptions(/quote): her student, the admin’s SubscriptionCreator, a whitelisted view', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    salesDefaults(m);
  });

  it('quote: the catalog quote of the guardian’s country, without the fx internals (she tells the family the price)', async () => {
    m.pricing.quote.mockResolvedValue({ ...WEEKLY_SA, fx: { quote: 'USD', rate: 3.75, date: null, provider: 'peg', fallback: true, ageHours: null } });
    const res = await call({ method: 'POST', url: '/sales/subscriptions/quote', token: 'salesA', body: { studentId: STUDENT_ID, pricing: { tier: 'weekly' } } });
    expect(res.statusCode).toBe(200);
    expect(Object.keys(res.json()).sort()).toEqual(['afterDiscount', 'currency', 'discount', 'duration', 'lessons', 'package', 'perLesson']);
    expect(res.json()).toMatchObject({ afterDiscount: 145, currency: 'SAR', lessons: 4 });
    expect(m.pricing.quote).toHaveBeenCalledWith(expect.objectContaining({ tier: 'weekly', country: 'SA', students: 1 }));
  });

  it('create: priced by the API, created_by = her, audited, the lead converted; the view keeps only the whitelisted keys', async () => {
    const res = await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: CREATE });
    expect(res.statusCode).toBe(201);
    expect(m.subs.insert).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: STUDENT_ID, price: 145, currency: 'SAR', status: 'unpaid', created_by: SALES_A.id, client_request_id: REQ, notes: null }),
    );
    expect(m.audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: SALES_A.id, entity: 'subscriptions', action: 'create' }));
    expect(m.leads.afterPackage).toHaveBeenCalledWith(STUDENT_ID, SALES_A.id);
    expect(Object.keys(res.json()).sort()).toEqual(SUB_KEYS);
    expect(res.json()).toMatchObject({ id: SUB_ID, price: 145, paid: 0, due: 145, student: { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة' } });
    expect(Object.keys(res.json().student).sort()).toEqual(['code', 'id', 'name']);
  });

  it('a double click (same clientRequestId) replays the first package: nothing inserted twice', async () => {
    m.subs.byRequest.mockResolvedValue({ id: SUB_ID });
    const res = await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: CREATE });
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe(SUB_ID);
    expect(m.subs.insert).not.toHaveBeenCalled();
  });

  it('a clientRequestId already used for another student is a 409, never that package', async () => {
    m.subs.byRequest.mockResolvedValue({ id: SUB_ID });
    m.subs.get.mockResolvedValue(subRow({ student_id: 'other', student: { id: '5a000000-0000-4000-8000-0000000000ff', code: 'AB-0999', name: 'غيره' } }));
    const res = await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body: CREATE });
    expect([res.statusCode, res.json().code]).toEqual([409, 'client_request_reused']);
  });

  it('a typed price, notes, a missing clientRequestId → 400, nothing created', async () => {
    const noKey = { ...CREATE, clientRequestId: undefined }; // dropped by JSON
    for (const body of [{ ...CREATE, price: 1 }, { ...CREATE, notes: 'x' }, noKey])
      expect((await call({ method: 'POST', url: '/sales/subscriptions', token: 'salesA', body })).statusCode).toBe(400);
    expect(m.subs.insert).not.toHaveBeenCalled();
  });
});
