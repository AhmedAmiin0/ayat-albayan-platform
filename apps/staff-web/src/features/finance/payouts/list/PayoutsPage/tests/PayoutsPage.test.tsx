import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYOUT } from '@/features/finance/subscriptions/money-fixture';
import { t } from '@ab/web-kit';
import { openFilters } from '@/test/open-filters';
import { PayoutsPage } from '@/features/finance/payouts/list/PayoutsPage/PayoutsPage';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const SUMMARY = {
  currency: 'EGP',
  rows: [
    {
      teacher: { id: 't1', display_name_ar: 'أبرار' },
      sessions: 3,
      earned: 210,
      paid: 70,
      owed: 140,
      unpaid_sessions: 2,
      oldest_unpaid_at: '2026-09-02T15:00:00Z',
    },
  ],
  totals: { earned: 210, paid: 70, owed: 140, teachers_owed: 1 },
};

function renderPage(rows = [PAYOUT]) {
  mockApi.onRead(async ({ path }) => (path === '/teacher-earnings/summary' ? SUMMARY : rows));
  const onMonth = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PayoutsPage month="2026-09" onMonth={onMonth} />
    </QueryClientProvider>,
  );
  return { onMonth };
}

describe('PayoutsPage (R-PAY-02, R-TCH-04, E3)', () => {
  beforeEach(() => {
    mockApi.reset('read');
    mockApi.reset('write');
  });

  it('a month of rows: teacher, lessons, breakdown line, EGP amount, status', async () => {
    renderPage();
    // `td *`: the status filter's <option> has the same text.
    const row = (await screen.findByText(t.enums.payoutStatus.draft, { selector: 'td *' })).closest(
      'tr',
    );
    if (!row) throw new Error('row missing');
    expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/payouts?month=2026-09' });
    expect(within(row).getByText('45 دقيقة: 12 × 70 = 840 ج.م')).toBeTruthy();
    expect(within(row).getByText(t.enums.payoutStatus.draft)).toBeTruthy();
  });

  it('sorts by amount and filters by teacher and status on the loaded month', async () => {
    renderPage([
      PAYOUT,
      {
        ...PAYOUT,
        id: 'po-2',
        amount: 100,
        teacher: { id: 't2', display_name_ar: 'سارة' },
        status: 'approved',
      },
    ]);
    const names = () =>
      screen
        .getAllByRole('row')
        .slice(1)
        .map((r) => r.querySelector('td')?.textContent);
    fireEvent.click(await screen.findByRole('button', { name: t.payouts.amount }));
    expect(names()).toEqual(['سارة', 'أبرار']);
    const by = (col: string) => t.table.filterBy.replace('{col}', col);
    fireEvent.change(
      within(openFilters()).getByRole('combobox', { name: by(t.subscriptions.status) }),
      { target: { value: 'draft' } },
    );
    expect(names()).toEqual(['أبرار']);
    fireEvent.change(screen.getByRole('combobox', { name: by(t.payouts.teacher) }), {
      target: { value: 'سارة' },
    });
    expect(screen.getByText(t.common.empty)).toBeTruthy();
  });

  it('the dues summary: total owed and each teacher linked to their earnings page', async () => {
    renderPage();
    const link = await screen.findByRole('link', { name: 'أبرار' });
    expect(link.getAttribute('href')).toBe('/admin/teachers/t1/earnings');
    expect(screen.getByText(t.finance.owedTotal)).toBeTruthy();
  });

  it('draft → approve; approved → «دُفعت» asks to confirm with method and date, then pays', async () => {
    renderPage([
      PAYOUT,
      { ...PAYOUT, id: 'po-2', teacher: { id: 't2', display_name_ar: 'سارة' }, status: 'approved' },
    ]);
    mockApi.onWrite(() => PAYOUT);
    fireEvent.click(await screen.findByRole('button', { name: t.payouts.approve }));
    await vi.waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'POST',
        path: '/payouts/po-1/approve',
        body: undefined,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: t.payouts.markPaid }));
    expect(mockApi.writes()).not.toContainEqual({
      method: 'POST',
      path: '/payouts/po-2/pay',
      body: expect.anything(),
    });
    fireEvent.click(await screen.findByRole('button', { name: t.finance.confirmPaid }));
    await vi.waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'POST',
        path: '/payouts/po-2/pay',
        body: expect.objectContaining({ method: 'bank', receiptPath: null }),
      }),
    );
  });

  it('approved → «إعادة فتح» after a confirm; paid → «إلغاء الدفع» needs a reason', async () => {
    const paid = {
      ...PAYOUT,
      id: 'po-3',
      status: 'paid' as const,
      paid_at: '2026-10-02T09:00:00Z',
    };
    renderPage([{ ...PAYOUT, id: 'po-2', status: 'approved' }, paid]);
    mockApi.onWrite(() => PAYOUT);
    fireEvent.click(await screen.findByRole('button', { name: t.finance.reopen }));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: t.finance.reopen }),
    );
    await vi.waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'POST',
        path: '/payouts/po-2/reopen',
        body: undefined,
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: t.finance.unpay }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: t.finance.unpay }));
    expect(await within(dialog).findByText(t.finance.reasonRequired)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText(t.finance.reason), {
      target: { value: 'دُفع مرتين' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: t.finance.unpay }));
    await vi.waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'POST',
        path: '/payouts/po-3/unpay',
        body: { reason: 'دُفع مرتين' },
      }),
    );
  });

  it('generate lists the teachers skipped for a missing rate', async () => {
    renderPage([]);
    expect(await screen.findByText(t.payouts.empty)).toBeTruthy();
    mockApi.onWrite(() => ({
      month: '2026-09',
      payouts: [],
      missing_rates: [{ teacher_id: 't1', display_name_ar: 'أبرار', durations: [45, 60] }],
    }));
    fireEvent.click(screen.getByRole('button', { name: t.payouts.generate }));
    // One sentence per teacher, every duration in it, and the way to the teacher's file.
    const link = await screen.findByRole('link', { name: t.payouts.setRate });
    expect(link.getAttribute('href')).toBe('/admin/teachers/t1');
    expect(link.parentElement?.textContent).toContain(
      'سعر حلقة الـ45 والـ60 دقيقة غير مسجل لـأبرار',
    );
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: '/payouts/2026-09/generate',
      body: undefined,
    });
  });

  it('the month picker changes the month', async () => {
    const { onMonth } = renderPage();
    fireEvent.change(await screen.findByLabelText(t.payouts.month), {
      target: { value: '2026-08' },
    });
    expect(onMonth).toHaveBeenCalledWith('2026-08');
  });
});
