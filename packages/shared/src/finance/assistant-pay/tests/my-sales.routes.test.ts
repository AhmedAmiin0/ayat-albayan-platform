import { describe, expect, it } from 'vitest';
import { mySalesRoutes } from '../my-sales.routes';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const ID = '00000000-0000-4000-8000-0000000000c1';

const student = {
  id: ID,
  code: 'AB-0001',
  name: 'S',
  brought_at: '2026-10-01T08:00:00.000Z',
  guardian_phone: '+966500000001',
  first_subscription_paid: true,
  commission: {
    amount: 40,
    currency: 'SAR',
    status: 'earned',
    earned_at: '2026-10-02T08:00:00.000Z',
  },
  renewal_commissions: 0,
};

const commission = {
  id: ID,
  student: { code: 'AB-0001', name: 'S' },
  kind: 'first',
  share_percent: 100,
  amount: 40,
  currency: 'SAR',
  earned_at: '2026-10-02T08:00:00.000Z',
  method: 'bank',
  state: 'due',
  statement_month: null,
  void_reason: null,
};

const payment = {
  id: ID,
  student: { id: ID, code: 'AB-0001', name: 'S' },
  kind: 'payment',
  amount: 400,
  currency: 'SAR',
  method: 'cash',
  paid_at: '2026-10-02T08:00:00.000Z',
  note: null,
};

const earnings = {
  terms: null,
  this_month: { SAR: { salary: 0, commissions: 40, adjustments: 0, total: 40 } },
  commissions_total: { SAR: 40 },
  wallet: { SAR: { due: 40, paid: 0, this_month: 40 } },
  statements: [],
};

describe('mySalesRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(mySalesRoutes).map(line)).toEqual([
      'GET /sales/me/students',
      'GET /sales/me/earnings',
      'GET /sales/me/commissions',
      'GET /sales/me/payments',
      'GET /sales/me/payments/:id/attachments',
    ]);
  });

  it('answers each of the own pages as the api builds them', () => {
    expect(mySalesRoutes.students.response.parse([student])).toEqual([student]);
    expect(mySalesRoutes.earnings.response.parse(earnings)).toEqual(earnings);
    const page = { items: [commission], total: 1, page: 1, pageSize: 20 };
    expect(mySalesRoutes.commissions.response.parse(page)).toEqual(page);
    expect(mySalesRoutes.payments.response.parse([payment])).toEqual([payment]);
  });

  it('refuses a commission of an unknown state, kind or void reason', () => {
    const page = (row: object) => ({ items: [row], total: 1, page: 1, pageSize: 20 });
    const r = mySalesRoutes.commissions.response;
    expect(r.safeParse(page({ ...commission, state: 'owed' })).success).toBe(false);
    expect(r.safeParse(page({ ...commission, kind: 'bonus' })).success).toBe(false);
    expect(r.safeParse(page({ ...commission, void_reason: 'typed by hand' })).success).toBe(false);
  });

  it('refuses a payment of an unknown kind or method and a student of an unknown commission status', () => {
    expect(mySalesRoutes.payments.response.safeParse([{ ...payment, kind: 'gift' }]).success).toBe(
      false,
    );
    expect(
      mySalesRoutes.payments.response.safeParse([{ ...payment, method: 'cheque' }]).success,
    ).toBe(false);
    const owed = { ...student, commission: { ...student.commission, status: 'owed' } };
    expect(mySalesRoutes.students.response.safeParse([owed]).success).toBe(false);
  });

  it('pages the commissions by 25 at most 100, and checks the payment id', () => {
    expect(mySalesRoutes.commissions.query.parse({})).toEqual({ page: 1, pageSize: 25 });
    expect(mySalesRoutes.commissions.query.safeParse({ pageSize: '101' }).success).toBe(false);
    expect(mySalesRoutes.paymentAttachments.params.safeParse({ id: 'p1' }).success).toBe(false);
  });
});
