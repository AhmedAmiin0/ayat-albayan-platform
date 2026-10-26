import type { PayoutView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { monthLabel } from '@/features/finance/payouts/MonthSelect';
import { t } from '@/lib/i18n/i18n';
import { openFilters } from '@/test/open-filters';
import { MyPayouts } from './MyPayouts';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

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

afterEach(() => apiFetch.mockReset());

describe('«مستحقاتي» (R-TCH-04)', () => {
  it('every month of mine, newest first, with the breakdown and no approve / pay', async () => {
    routeFetch(apiFetch, [['/teachers/me/payouts', [payout({}), payout({ id: 'p-0', month: '2026-08', status: 'draft', paid_at: null, approved_at: null })]]]);
    renderWithClient(<MyPayouts />);
    expect(await screen.findByText(monthLabel('2026-09'))).toBeTruthy();
    expect(screen.getByText(monthLabel('2026-08'))).toBeTruthy();
    expect(screen.getAllByText(/10 × 70/)).toHaveLength(2);
    expect(screen.getByText(t.enums.payoutStatus.paid, { selector: 'td *' })).toBeTruthy();
    const by = t.table.filterBy.replace('{col}', t.subscriptions.status);
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: by }), { target: { value: 'draft' } });
    expect(screen.queryByText(monthLabel('2026-09'))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.payouts.month }));
    expect(screen.getByText(monthLabel('2026-08'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.payouts.approve })).toBeNull();
    expect(screen.queryByRole('button', { name: t.payouts.markPaid })).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith('/teachers/me/payouts');
  });

  it('none yet says so', async () => {
    routeFetch(apiFetch, [['/teachers/me/payouts', []]]);
    renderWithClient(<MyPayouts />);
    expect(await screen.findByText(t.payouts.mineEmpty)).toBeTruthy();
  });
});
