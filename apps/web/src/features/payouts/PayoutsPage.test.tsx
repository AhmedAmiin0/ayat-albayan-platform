import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PAYOUT } from '@/features/subscriptions/money-fixture';
import { t } from '@/lib/i18n';
import { currentMonth, downloadPayoutsCsv } from './api';
import { breakdownLines } from './payout-columns';
import { PayoutsPage } from './PayoutsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

function renderPage(rows = [PAYOUT]) {
  apiFetch.mockResolvedValue(rows);
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
    const row = (await screen.findByText('أبرار')).closest('tr');
    if (!row) throw new Error('row missing');
    expect(apiFetch).toHaveBeenCalledWith('/payouts?month=2026-09');
    expect(within(row).getByText('45 دقيقة: 12 × 70 = 840 ج.م')).toBeTruthy();
    expect(within(row).getByText(t.enums.payoutStatus.draft)).toBeTruthy();
  });

  it('draft → approve; approved → mark paid', async () => {
    renderPage([PAYOUT, { ...PAYOUT, id: 'po-2', teacher: { id: 't2', display_name_ar: 'سارة' }, status: 'approved' }]);
    apiSend.mockResolvedValue(PAYOUT);
    fireEvent.click(await screen.findByRole('button', { name: t.payouts.approve }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/payouts/po-1/approve'));
    fireEvent.click(screen.getByRole('button', { name: t.payouts.markPaid }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/payouts/po-2/pay', {}));
  });

  it('generate lists the teachers skipped for a missing rate', async () => {
    renderPage([]);
    expect(await screen.findByText(t.payouts.empty)).toBeTruthy();
    apiSend.mockResolvedValue({
      month: '2026-09',
      payouts: [],
      missing_rates: [{ teacher_id: 't1', display_name_ar: 'أبرار', durations: [90] }],
    });
    fireEvent.click(screen.getByRole('button', { name: t.payouts.generate }));
    expect(await screen.findByText(`أبرار: ${t.payouts.error.rate_missing.replace('{duration}', '90 دقيقة')}`)).toBeTruthy();
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
