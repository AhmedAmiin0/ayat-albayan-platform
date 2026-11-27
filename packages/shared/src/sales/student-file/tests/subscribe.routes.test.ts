import { describe, expect, it } from 'vitest';
import { salesSubscribeRoutes as routes } from '../subscribe.routes';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const SUB = '22222222-2222-4222-8222-222222222222';
const REQ = '33333333-3333-4333-8333-333333333333';
const QUOTE = {
  package: 'standard',
  lessons: 4,
  duration: 30,
  currency: 'SAR',
  discount: 0,
  afterDiscount: 145,
  perLesson: 36.25,
};
const SUBSCRIPTION = {
  id: SUB,
  student: { id: STUDENT, code: 'AB-0183', name: 'سهيلة' },
  package: '4',
  duration: 30,
  lessons_total: 4,
  lessons_used_before: 0,
  price: 145,
  currency: 'SAR',
  starts_on: '2026-11-27',
  status: 'unpaid',
  paid: 0,
  due: 145,
};

describe('salesSubscribeRoutes', () => {
  it('keeps the paths, the permission and the tag the api serves today', () => {
    const wire = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    const access = [['self.sales_money'], ['sales']];
    expect(wire).toEqual([
      ['GET', '/sales/subscriptions/teachers', ...access],
      ['POST', '/sales/subscriptions/quote', ...access],
      ['POST', '/sales/subscriptions', ...access],
      ['POST', '/sales/subscriptions/:id/cancel', ...access],
    ]);
  });

  it('answers the active teachers by name only', () => {
    const teachers = [{ id: STUDENT, name: 'أ. سارة' }];
    expect(routes.teachers.response.parse(teachers)).toEqual(teachers);
    expect(routes.teachers.response.safeParse([{ id: STUDENT }]).success).toBe(false);
    expect(routes.teachers.response.safeParse([{ id: 'x', name: 'y' }]).success).toBe(false);
  });

  it('quotes her student with the pricing and answers no fx internals', () => {
    const body = { studentId: STUDENT, pricing: { tier: 'weekly' } };
    expect(routes.quote.body.safeParse(body).success).toBe(true);
    expect(routes.quote.body.safeParse({ ...body, price: 10 }).success).toBe(false);
    expect(routes.quote.response.parse({ ...QUOTE, fx: null })).toEqual(QUOTE);
    expect(routes.quote.response.safeParse({ ...QUOTE, currency: undefined }).success).toBe(false);
  });

  it('creates with its clientRequestId and answers the whitelisted package', () => {
    const body = { studentId: STUDENT, pricing: { tier: 'weekly' }, clientRequestId: REQ };
    expect(routes.create.body.safeParse(body).success).toBe(true);
    expect(routes.create.body.safeParse({ ...body, clientRequestId: undefined }).success).toBe(
      false,
    );
    expect(routes.create.response.parse(SUBSCRIPTION)).toEqual(SUBSCRIPTION);
    expect(routes.create.response.safeParse({ ...SUBSCRIPTION, duration: 50 }).success).toBe(false);
    expect(routes.create.response.safeParse({ ...SUBSCRIPTION, status: 'x' }).success).toBe(false);
  });

  it('cancels by id, with a reason or with no body at all', () => {
    expect(routes.cancel.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.cancel.body.parse(undefined)).toEqual({});
    expect(routes.cancel.body.parse({ reason: 'خطأ' })).toEqual({ reason: 'خطأ' });
    expect(routes.cancel.body.safeParse({ note: 'x' }).success).toBe(false);
    const cancelled = { ...SUBSCRIPTION, status: 'cancelled' };
    expect(routes.cancel.response.parse(cancelled)).toEqual(cancelled);
  });
});
