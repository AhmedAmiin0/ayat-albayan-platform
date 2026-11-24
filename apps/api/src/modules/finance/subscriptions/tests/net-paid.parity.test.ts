import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { unpaidList } from '@/modules/reporting/dashboard/work/work.mapper';
import { CourseStopRepo } from '@/modules/teaching/course-stop/course-stop.repo';
import { SubscriptionsRepo } from '@/modules/finance/subscriptions/shared/subscriptions.repo';

// One package, three readers: the package view, the dashboard work list and the course stop must
// agree on what was paid (audit BE-05). The USD row predates converting payments on entry.
const SUB = { id: 's1', currency: 'SAR', price: 145 };
const PAYMENTS = [
  { subscription_id: 's1', amount: 145, kind: 'payment', currency: 'SAR' },
  { subscription_id: 's1', amount: 45.5, kind: 'refund', currency: 'SAR' },
  { subscription_id: 's1', amount: 40, kind: 'payment', currency: 'USD' },
] as const;
const PAID = 99.5;

const packageView = async () => {
  const { db } = fakeDb({ payments: [{ data: PAYMENTS }] });
  return (await new SubscriptionsRepo(db).paid([SUB])).get(SUB.id);
};

const workList = () => {
  const row = {
    ...SUB,
    package: '4' as const,
    lessons_total: 4,
    starts_on: '2026-09-28',
    student: { id: 'st1', code: 'AB-0001', name: 'سهيلة' },
    payments: [...PAYMENTS],
  };
  const [item] = unpaidList([row]).items;
  return item;
};

const courseStop = async () => {
  const { db } = fakeDb({ payments: [{ data: PAYMENTS }] });
  return new CourseStopRepo(db).paid(SUB);
};

describe('net paid: one rule on every reader', () => {
  it('the package view counts the refund and skips the foreign-currency row', async () => {
    expect(await packageView()).toBe(PAID);
  });

  it('the work list shows the same paid and owed', () => {
    expect(workList()).toMatchObject({ paid: PAID, owed: SUB.price - PAID, reason: 'owes' });
  });

  it('the course stop shows the same paid', async () => {
    expect(await courseStop()).toBe(PAID);
  });
});
