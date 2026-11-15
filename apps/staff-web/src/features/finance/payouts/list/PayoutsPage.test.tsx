import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYOUT } from '@/features/finance/subscriptions/money-fixture';
import { t } from '@/lib/i18n/i18n';
import { openFilters } from '@/test/open-filters';
import { currentMonth, downloadPayoutsCsv } from '@/features/finance/payouts/api';
import { monthLabel, monthOptions } from '@/features/finance/payouts/shared/MonthSelect';
import { breakdownLines } from './payout-columns';
import { PayoutsPage } from './PayoutsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));

const SUMMARY = {
  currency: 'EGP',
  rows: [{ teacher: { id: 't1', display_name_ar: 'أبرار' }, sessions: 3, earned: 210, paid: 70, owed: 140, unpaid_sessions: 2, oldest_unpaid_at: '2026-09-02T15:00:00Z' }],
  totals: { earned: 210, paid: 70, owed: 140, teachers_owed: 1 },
};

function renderPage(rows = [PAYOUT]) {
  apiFetch.mockImplementation(async (path: string) => (path === '/teacher-earnings/summary' ? SUMMARY : rows));
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
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('a month of rows: teacher, lessons, breakdown line, EGP amount, status', async () => {
    renderPage();
    // `td *`: the status filter's <option> has the same text.
    const row = (await screen.findByText(t.enums.payoutStatus.draft, { selector: 'td *' })).closest('tr');
    if (!row) throw new Error('row missing');
    expect(apiFetch).toHaveBeenCalledWith('/payouts?month=2026-09');
    expect(within(row).getByText('45 دقيقة: 12 × 70 = 840 ج.م')).toBeTruthy();
    expect(within(row).getByText(t.enums.payoutStatus.draft)).toBeTruthy();
  });

  it('sorts by amount and filters by teacher and status on the loaded month', async () => {
    renderPage([PAYOUT, { ...PAYOUT, id: 'po-2', amount: 100, teacher: { id: 't2', display_name_ar: 'سارة' }, status: 'approved' }]);
    const names = () => screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent);
    fireEvent.click(await screen.findByRole('button', { name: t.payouts.amount }));
    expect(names()).toEqual(['سارة', 'أبرار']);
    const by = (col: string) => t.table.filterBy.replace('{col}', col);
    fireEvent.change(within(openFilters()).getByRole('combobox', { name: by(t.subscriptions.status) }), { target: { value: 'draft' } });
    expect(names()).toEqual(['أبرار']);
    fireEvent.change(screen.getByRole('combobox', { name: by(t.payouts.teacher) }), { target: { value: 'سارة' } });
    expect(screen.getByText(t.common.empty)).toBeTruthy();
  });

  it('the dues summary: total owed and each teacher linked to their earnings page', async () => {
    renderPage();
    const link = await screen.findByRole('link', { name: 'أبرار' });
    expect(link.getAttribute('href')).toBe('/admin/teachers/t1/earnings');
    expect(screen.getByText(t.finance.owedTotal)).toBeTruthy();
  });

  it('draft → approve; approved → «دُفعت» asks to confirm with method and date, then pays', async () => {
    renderPage([PAYOUT, { ...PAYOUT, id: 'po-2', teacher: { id: 't2', display_name_ar: 'سارة' }, status: 'approved' }]);
    apiSend.mockResolvedValue(PAYOUT);
    fireEvent.click(await screen.findByRole('button', { name: t.payouts.approve }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/payouts/po-1/approve'));
    fireEvent.click(screen.getByRole('button', { name: t.payouts.markPaid }));
    expect(apiSend).not.toHaveBeenCalledWith('POST', '/payouts/po-2/pay', expect.anything());
    fireEvent.click(await screen.findByRole('button', { name: t.finance.confirmPaid }));
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/payouts/po-2/pay', expect.objectContaining({ method: 'bank', receiptPath: null })),
    );
  });

  it('approved → «إعادة فتح» after a confirm; paid → «إلغاء الدفع» needs a reason', async () => {
    const paid = { ...PAYOUT, id: 'po-3', status: 'paid' as const, paid_at: '2026-10-02T09:00:00Z' };
    renderPage([{ ...PAYOUT, id: 'po-2', status: 'approved' }, paid]);
    apiSend.mockResolvedValue(PAYOUT);
    fireEvent.click(await screen.findByRole('button', { name: t.finance.reopen }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: t.finance.reopen }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/payouts/po-2/reopen'));
    fireEvent.click(await screen.findByRole('button', { name: t.finance.unpay }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: t.finance.unpay }));
    expect(await within(dialog).findByText(t.finance.reasonRequired)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText(t.finance.reason), { target: { value: 'دُفع مرتين' } });
    fireEvent.click(within(dialog).getByRole('button', { name: t.finance.unpay }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/payouts/po-3/unpay', { reason: 'دُفع مرتين' }));
  });

  it('generate lists the teachers skipped for a missing rate', async () => {
    renderPage([]);
    expect(await screen.findByText(t.payouts.empty)).toBeTruthy();
    apiSend.mockResolvedValue({
      month: '2026-09',
      payouts: [],
      missing_rates: [{ teacher_id: 't1', display_name_ar: 'أبرار', durations: [45, 60] }],
    });
    fireEvent.click(screen.getByRole('button', { name: t.payouts.generate }));
    // One sentence per teacher, every duration in it, and the way to the teacher's file.
    const link = await screen.findByRole('link', { name: t.payouts.setRate });
    expect(link.getAttribute('href')).toBe('/admin/teachers/t1');
    expect(link.parentElement?.textContent).toContain('سعر حلقة الـ45 والـ60 دقيقة غير مسجل لـأبرار');
    expect(apiSend).toHaveBeenCalledWith('POST', '/payouts/2026-09/generate');
  });

  it('the month picker changes the month', async () => {
    const { onMonth } = renderPage();
    fireEvent.change(await screen.findByLabelText(t.payouts.month), { target: { value: '2026-08' } });
    expect(onMonth).toHaveBeenCalledWith('2026-08');
  });
});

describe('payout helpers', () => {
  it('breakdown lines with a missing rate read 0', () => {
    const p = { ...PAYOUT, breakdown: { ...PAYOUT.breakdown, lines: [{ duration: 30 as const, lessons: 2, rate: null, amount: 0 }] } };
    expect(breakdownLines(p)).toEqual(['30 دقيقة: 2 × 0 = 0 ج.م']);
  });

  it('this month in Riyadh', () => {
    expect(currentMonth(new Date('2026-09-30T22:00:00Z'))).toBe('2026-10');
  });

  it('month options: newest first across the year boundary, an older value kept', () => {
    expect(monthOptions('2026-02', { count: 3, value: '2026-01' })).toEqual(['2026-02', '2026-01', '2025-12']);
    expect(monthOptions('2026-02', { count: 2, value: '2024-05' })).toEqual(['2026-02', '2026-01', '2024-05']);
    expect(monthLabel('2026-10')).toBe('أكتوبر 2026');
  });

  it('the CSV is fetched with the token and saved with a BOM', async () => {
    apiFetch.mockResolvedValue('a,b\n');
    const created: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => {
      created.push(b);
      return 'blob:x';
    });
    URL.revokeObjectURL = vi.fn();
    await downloadPayoutsCsv('2026-09');
    expect(apiFetch).toHaveBeenCalledWith('/exports/payouts.csv?month=2026-09');
    const bytes = new Uint8Array((await created[0]?.arrayBuffer()) ?? new ArrayBuffer(0));
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });
});
