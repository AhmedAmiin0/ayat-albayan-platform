import { describe, expect, it } from 'vitest';
import { studentBalanceRoutes, subscriptionRoutes } from '../subscriptions.routes';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const ID = '00000000-0000-4000-8000-0000000000b1';
const STUDENT = '00000000-0000-4000-8000-0000000000b2';

const quote = {
  package: '8',
  lessons: 8,
  duration: 30,
  country: null,
  currency: 'SAR',
  price: 400,
  students: 1,
  total: 400,
  discount: 0,
  afterDiscount: 400,
  perLesson: 50,
  insteadOf: null,
  savingsPct: null,
  popular: false,
  featured: false,
  fx: null,
};

const balance = {
  subscription_id: ID,
  lessons_total: 8,
  lessons_used: 2,
  remaining: 6,
  ended_at: null,
  projected_end_at: null,
};

const subscription = {
  id: ID,
  student: { id: STUDENT, code: 'AB-0001', name: 'S' },
  package: '8',
  duration: 30,
  lessons_total: 8,
  lessons_used_before: 0,
  price: 400,
  currency: 'SAR',
  fx_rate: null,
  fx_date: null,
  price_source: quote,
  starts_on: '2026-10-01',
  status: 'active',
  cancel_kind: null,
  stop_owed_amount: null,
  renews_on: null,
  notes: null,
  paid: 400,
  balance,
  created_at: '2026-10-01T09:00:00.000Z',
};

describe('subscriptionRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(subscriptionRoutes).map(line)).toEqual([
      'GET /subscriptions',
      'POST /subscriptions',
      'POST /subscriptions/quote',
      'GET /subscriptions/:id',
      'PATCH /subscriptions/:id',
      'POST /subscriptions/:id/cancel',
      'DELETE /subscriptions/:id',
    ]);
    expect(line(studentBalanceRoutes.get)).toBe('GET /students/:id/balance');
  });

  it('answers a package as the api builds it and refuses an unknown status or duration', () => {
    const res = subscriptionRoutes.get.response;
    expect(res.parse(subscription)).toEqual(subscription);
    expect(res.safeParse({ ...subscription, status: 'gone' }).success).toBe(false);
    expect(res.safeParse({ ...subscription, duration: 25 }).success).toBe(false);
  });

  it('answers a custom lesson count as a package of null', () => {
    const custom = { ...subscription, package: null };
    expect(subscriptionRoutes.get.response.parse(custom)).toEqual(custom);
  });

  it('pages the list and refuses a paid filter other than partial', () => {
    const q = subscriptionRoutes.list.query;
    expect(q.parse({})).toMatchObject({ page: 1, pageSize: 25 });
    expect(q.parse({ paid: 'partial', studentId: STUDENT })).toMatchObject({ paid: 'partial' });
    expect(q.safeParse({ paid: 'all' }).success).toBe(false);
    expect(q.safeParse({ studentId: 'x' }).success).toBe(false);
  });

  it('refuses an id that is not a uuid', () => {
    expect(subscriptionRoutes.get.params.safeParse({ id: 'x' }).success).toBe(false);
    expect(studentBalanceRoutes.get.params.safeParse({ id: 'x' }).success).toBe(false);
  });

  it('reads a cancel sent without a body as an empty one', () => {
    expect(subscriptionRoutes.cancel.body.parse(undefined)).toEqual({});
  });

  it('answers the full balance to an admin and the lessons only to a teacher', () => {
    const res = studentBalanceRoutes.get.response;
    const packages = [subscription];
    const full = { student_id: STUDENT, remaining: 6, current: subscription, packages };
    const lessons = { student_id: STUDENT, remaining: 6, packages: [balance] };
    expect(res.parse(full)).toEqual(full);
    expect(res.parse(lessons)).toEqual(lessons);
    expect(res.safeParse({ student_id: STUDENT, remaining: 6 }).success).toBe(false);
  });
});
