import type { PayoutView } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { earningsView } from '@/teacher-earnings/fixtures';
import { renderWithQuery } from '@/test/query';
import { MyPayoutsScreen } from './MyPayoutsScreen';
import { breakdownLines, monthLabel, payoutSummary, payoutWhen } from './payout-text';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));

/** /teachers/me/payouts answers `months`; the per-session earnings routes answer an empty ledger. */
function serve(months: PayoutView[]) {
  mockApiFetch.mockImplementation(async (path: string) => {
    if (path === '/teachers/me/payouts') return months;
    return path.endsWith('/payments') ? [] : earningsView([]);
  });
}
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const paid: PayoutView = {
  id: 'p1',
  teacher: { id: 't-abrar', display_name_ar: 'أبرار' },
  month: '2026-09',
  lessons_count: 10,
  amount: 1600,
  currency: 'EGP',
  status: 'paid',
  approved_at: '2026-10-01T10:00:00Z',
  paid_at: '2026-10-02T10:00:00Z',
  breakdown: {
    lines: [
      { duration: 45, lessons: 8, rate: 150, amount: 1200 },
      { duration: 60, lessons: 2, rate: 200, amount: 400 },
    ],
    lesson_ids: [],
    statuses: [],
  },
};
const draft: PayoutView = { ...paid, id: 'p2', month: '2026-10', status: 'draft', approved_at: null, paid_at: null };

test('lines: month, lessons and EGP amount, the breakdown per length, when it was paid', () => {
  expect(monthLabel('2026-09')).toBe('سبتمبر 2026');
  expect(payoutSummary(paid)).toBe(`${t.payouts.lessons}: 10 · 1600 ${t.payouts.currency}`);
  expect(breakdownLines(paid)).toEqual([`${t.enums.duration['45']}: 8 × 150 = 1200`, `${t.enums.duration['60']}: 2 × 200 = 400`]);
  expect(payoutWhen(paid)).toBe(t.payouts.paidAt.replace('{date}', '2 أكتوبر'));
  expect(payoutWhen(draft)).toBeNull();
});

test('«مستحقاتي»: my months from /teachers/me/payouts with their state', async () => {
  serve([draft, paid]);
  await renderWithQuery(<MyPayoutsScreen />);
  expect(await screen.findByText('سبتمبر 2026')).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/payouts');
  expect(screen.getByText('أكتوبر 2026')).toBeTruthy();
  expect(screen.getByText(t.enums.payoutStatus.paid)).toBeTruthy();
  expect(screen.getByText(t.enums.payoutStatus.draft)).toBeTruthy();
  expect(screen.getByText(t.teacherEarnings.monthsTitle)).toBeTruthy();
});

test('the per-session earnings sit above the months, read-only', async () => {
  serve([paid]);
  await renderWithQuery(<MyPayoutsScreen />);
  expect(await screen.findByText(t.teacherEarnings.earned)).toBeTruthy();
  expect(screen.getByText(t.teacherEarnings.sessionsTitle)).toBeTruthy();
  expect(screen.getByText(t.teacherEarnings.paymentsTitle)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith('/teachers/me/earnings');
  expect(screen.queryByRole('button', { name: t.teacherEarnings.pay })).toBeNull();
});

test('no months yet says so', async () => {
  serve([]);
  await renderWithQuery(<MyPayoutsScreen />);
  expect(await screen.findByText(t.payouts.empty)).toBeTruthy();
});
