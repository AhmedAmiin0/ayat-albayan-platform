import type { PayoutView } from '@ab/shared';
import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EARNINGS, PAYMENTS } from '@/features/teacher-earnings/fixtures';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { monthLabel } from '@/features/payouts/MonthSelect';
import { t } from '@/lib/i18n';
import { MyPayouts } from './MyPayouts';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const payout = (over: Partial<PayoutView>): PayoutView => ({
  id: 'p-1',
  teacher: { id: 't-abrar', display_name_ar: 'أبرار' },
  month: '2026-09',
  lessons_count: 10,
  amount: 700,
  currency: 'EGP',
  status: 'paid',
  approved_at: '2026-10-01T09:00:00Z',
  paid_at: '2026-10-02T09:00:00Z',
  breakdown: { lines: [{ duration: 45, lessons: 10, rate: 70, amount: 700 }], lesson_ids: [], statuses: [] },
  ...over,
});

const earningsRoutes = [
  ['/teachers/me/earnings/payments', PAYMENTS],
  ['/teachers/me/earnings', EARNINGS],
] as const;

afterEach(() => apiFetch.mockReset());

describe('«مستحقاتي» (R-TCH-04)', () => {
  it('every month of mine, newest first, with the breakdown and no approve / pay', async () => {
    routeFetch(apiFetch, [
      ...earningsRoutes,
      ['/teachers/me/payouts', [payout({}), payout({ id: 'p-0', month: '2026-08', status: 'draft', paid_at: null, approved_at: null })]],
    ]);
    renderWithClient(<MyPayouts />);
    expect(await screen.findByText(monthLabel('2026-09'))).toBeTruthy();
    expect(screen.getByText(monthLabel('2026-08'))).toBeTruthy();
    expect(screen.getAllByText(/10 × 70/)).toHaveLength(2);
    // «اتدفعت» is also the paid-session chip above, so: one in the sessions, one in the months.
    expect(screen.getAllByText(t.enums.payoutStatus.paid)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: t.payouts.approve })).toBeNull();
    expect(screen.queryByRole('button', { name: t.payouts.markPaid })).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/payouts');
  });

  it('the per-session earnings come first, then the «كشوف الشهور» section with the months', async () => {
    routeFetch(apiFetch, [...earningsRoutes, ['/teachers/me/payouts', [payout({})]]]);
    renderWithClient(<MyPayouts />);
    const sessions = await screen.findByRole('region', { name: t.teacherEarnings.sessionsTitle });
    const months = screen.getByRole('heading', { name: t.teacherEarnings.monthsTitle });
    expect(sessions.compareDocumentPosition(months) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(await screen.findByText(monthLabel('2026-09'))).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('none yet says so', async () => {
    routeFetch(apiFetch, [...earningsRoutes, ['/teachers/me/payouts', []]]);
    renderWithClient(<MyPayouts />);
    expect(await screen.findByText(t.payouts.mineEmpty)).toBeTruthy();
  });
});
