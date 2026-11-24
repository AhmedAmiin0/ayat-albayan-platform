// docs/50 fixtures for the family portal (test-only, excluded from the build by *.fakes.ts): the
// staff balance the package reduces, the payments and the past lessons of the history.
import type { PortalPayment } from '@ab/shared';
import type { Attendance } from '@ab/catalog';
import type { StudentBalanceView, SubscriptionView } from '@ab/money';
import { vi } from 'vitest';
import type { PortalPastRow } from './history/portal-history.repo';

const P1 = 'pa';

/** The staff view with the money internals a careless mapper would leak (price, fx, notes). */
export function balanceView(over: Partial<SubscriptionView> = {}): StudentBalanceView {
  const pkg = {
    id: P1, package: '8', duration: 30, lessons_total: 8, starts_on: '2026-10-01', renews_on: '2026-11-01',
    status: 'active', price: 290, currency: 'SAR', paid: 200, fx_rate: 50, notes: 'سر',
    price_source: { total: 290 }, cancel_kind: null, stop_owed_amount: null,
    balance: {
      subscription_id: P1, lessons_total: 8, lessons_used: 3, remaining: 5,
      ended_at: null, projected_end_at: null,
    },
    ...over,
  } as unknown as SubscriptionView;
  return { student_id: 's', remaining: pkg.balance.remaining, current: pkg, packages: [pkg] };
}

export const PAYMENTS: PortalPayment[] = [
  { paid_at: '2026-10-02T09:00:00.000Z', amount: 200, currency: 'SAR', kind: 'payment' },
];

type PastOver = Partial<PortalPastRow> & { attendance?: Attendance | null };

/** A past lesson of the student: `attendance` on its own row; the reason stays internal. */
export const pastRow = (id: string, over: PastOver = {}): PortalPastRow => {
  const { attendance = null, ...rest } = over;
  return {
    id, starts_at: `2026-10-${id.slice(-2)}T16:00:00.000Z`, ends_at: `2026-10-${id.slice(-2)}T16:30:00.000Z`,
    status: 'completed', cancel_reason: null, rule: null,
    teacher: { display_name_ar: 'أبرار', display_name_en: 'Abrar' },
    own: [{ student_id: 's', attendance }],
    ...rest,
  };
};

export function familyFakes() {
  const money = { studentBalance: vi.fn(async (): Promise<StudentBalanceView> => balanceView()) };
  const packages = { payments: vi.fn(async () => PAYMENTS) };
  const history = {
    before: vi.fn(async (): Promise<PortalPastRow[]> => [
      pastRow('l-20', { attendance: 'on_time' }),
      pastRow('l-18', { status: 'excused', cancel_reason: 'سفر العائلة' }),
      pastRow('l-15', { status: 'no_show' }),
    ]),
    between: vi.fn(async (): Promise<PortalPastRow[]> => [pastRow('l-20', { attendance: 'on_time' })]),
  };
  return { money, packages, history };
}
