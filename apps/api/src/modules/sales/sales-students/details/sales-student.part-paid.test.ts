import { describe, expect, it } from 'vitest';
import type { HistoryBundle } from '../../sales';
import { toStudentDetails } from './sales-student.mapper';
import type { DetailsStudentRow } from './sales-student.queries';

// «مدفوعة جزئيًا» (owner 2026-10-28): 81 SAR, 80 received → part_paid; only with prices (self.sales_money).
const student = { id: 's1', code: 'AB-0001', name: 'ياسمين', status: 'active', program: 'quran', teacher: null, guardian: null } as DetailsStudentRow;
const sub = { id: 'a', package: '8', status: 'unpaid', starts_on: '2026-10-27', renews_on: null, lessons_total: 8, created_at: '2026-10-27T00:00:00Z' };
const pay = (amount: number, kind = 'payment') => ({ id: `p${amount}`, subscription_id: 'a', paid_at: '2026-10-27T09:00:00Z', kind, amount, currency: 'SAR' });
const history = (payments: ReturnType<typeof pay>[]) =>
  ({ student: { id: 's1', code: 'AB-0001', name: 'ياسمين' }, subscriptions: [sub], balances: [], payments, audit: [] }) as unknown as HistoryBundle;
const details = (payments: ReturnType<typeof pay>[], prices = [{ id: 'a', price: 81, currency: 'SAR' }]) =>
  toStudentDetails({ student, history: history(payments), lessons: [], reports: { items: [], total: 0 }, schedule: { student_tz: 'Asia/Riyadh', weekly: [], upcoming: [] }, prices });

describe('toStudentDetails part_paid', () => {
  it('80 of 81 SAR → paid, price, due, currency', () => {
    expect(details([pay(80)]).subscriptions[0]?.part_paid).toEqual({ paid: 80, price: 81, due: 1, currency: 'SAR' });
  });

  it('a refund counts against it (net paid)', () => {
    expect(details([pay(81), pay(1, 'refund')]).subscriptions[0]?.part_paid).toMatchObject({ paid: 80, due: 1 });
  });

  it('nothing or everything paid → no key', () => {
    expect(details([]).subscriptions[0]).not.toHaveProperty('part_paid');
    expect(details([pay(81)]).subscriptions[0]).not.toHaveProperty('part_paid');
  });

  it('without prices (no self.sales_money) → never a price', () => {
    expect(JSON.stringify(details([pay(80)], []).subscriptions)).not.toMatch(/price|currency|part_paid/);
  });
});
