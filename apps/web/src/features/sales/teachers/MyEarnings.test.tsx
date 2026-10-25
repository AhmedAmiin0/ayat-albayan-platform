import type { AssistantStatementView, MyEarnings as Earnings } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { MyEarnings } from './MyEarnings';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const statement = (over: Partial<AssistantStatementView>): AssistantStatementView => ({
  id: 'st1',
  assistant: { id: 'a1', name: 'الزهراء' },
  month: '2026-09-01',
  status: 'paid',
  totals: { SAR: { salary: 2000, commissions: 300, adjustments: 0, total: 2300 } },
  lines: [
    { kind: 'salary', amount: 2000, currency: 'SAR', student: null, reason: null },
    { kind: 'commission', amount: 300, currency: 'SAR', student: { code: 'AB-1001', name: 'يوسف' }, reason: null },
  ],
  approved_at: '2026-10-01T09:00:00.000Z',
  paid_at: '2026-10-02T09:00:00.000Z',
  method: 'bank',
  note: null,
  has_receipt: false,
  ...over,
});

const EARNINGS: Earnings = {
  terms: {
    assistant_id: 'a1',
    commission: { type: 'percent', value: 10, currency: null, starts_on: '2026-09-01' },
    salary: { amount: 2000, currency: 'SAR', starts_on: '2026-09-01' },
  },
  this_month: {
    SAR: { salary: 2000, commissions: 120, adjustments: 0, total: 2120 },
    USD: { salary: 0, commissions: 50, adjustments: 0, total: 50 },
  },
  commissions_total: { SAR: 420, USD: 50 },
  statements: [statement({})],
};

function open(data: Earnings) {
  apiFetch.mockResolvedValue(data);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MyEarnings />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('MyEarnings «أرباحي»', () => {
  it('shows my terms: the monthly salary and the percent commission with its start', async () => {
    open(EARNINGS);
    expect(await screen.findByRole('heading', { name: t.assistantPortal.earnings.terms })).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/sales/me/earnings');
    const salary = screen.getByText(`${t.assistantPortal.earnings.salary}:`, { exact: false }).closest('p');
    expect(salary?.textContent).toContain('2,000');
    expect(screen.getByText(t.assistantPortal.earnings.commissionPercent.replace('{value}', '10'))).toBeTruthy();
  });

  it('a fixed commission shows its amount in its own currency', async () => {
    open({
      ...EARNINGS,
      terms: {
        assistant_id: 'a1',
        commission: { type: 'fixed', value: 75, currency: 'USD', starts_on: '2026-09-01' },
        salary: { amount: 2000, currency: 'SAR', starts_on: '2026-09-01' },
      },
    });
    const fixed = t.assistantPortal.earnings.commissionFixed.replace('{amount}', `75 ${t.pricing.currencies.USD}`);
    expect(await screen.findByText(fixed)).toBeTruthy();
  });

  it('this month is one block per currency; amounts are never summed across currencies', async () => {
    open(EARNINGS);
    const list = await screen.findByRole('list', { name: t.assistantPortal.earnings.thisMonth });
    const blocks = within(list).getAllByRole('listitem');
    expect(blocks.map((b) => b.getAttribute('data-currency'))).toEqual(['SAR', 'USD']);
    expect(within(blocks[0] as HTMLElement).getByText('2,120')).toBeTruthy();
    expect(within(blocks[1] as HTMLElement).getAllByText('50')).toHaveLength(2); // its commissions and its total
    expect(screen.queryByText('2,170')).toBeNull();
    expect(screen.queryByText('470')).toBeNull();
  });

  it('lists my statements with status, per-currency totals and lines', async () => {
    open(EARNINGS);
    const month = await screen.findByRole('heading', { level: 3 });
    expect(month.textContent).toMatch(/2026/);
    expect(screen.getByText(t.enums.payoutStatus.paid)).toBeTruthy();
    const totals = screen.getAllByRole('list', { name: month.textContent ?? '' })[0] as HTMLElement;
    expect(within(totals).getByText('2,300')).toBeTruthy();
    expect(screen.getByText(t.assistantPortal.earnings.line.commission.replace('{student}', 'يوسف'))).toBeTruthy();
  });

  it('a negative adjustment (a reversal) shows its reason and its sign', async () => {
    open({
      ...EARNINGS,
      statements: [
        statement({
          status: 'draft',
          paid_at: null,
          approved_at: null,
          lines: [{ kind: 'adjustment', amount: -300, currency: 'SAR', student: null, reason: 'إلغاء دفعة' }],
          totals: { SAR: { salary: 0, commissions: 0, adjustments: -300, total: -300 } },
        }),
      ],
    });
    expect(await screen.findByText(t.assistantPortal.earnings.line.adjustment.replace('{reason}', 'إلغاء دفعة'))).toBeTruthy();
    expect(screen.getAllByText('-300').length).toBeGreaterThan(0);
  });

  it('empty states: no terms yet, no statements yet', async () => {
    open({ terms: null, this_month: {}, commissions_total: {}, statements: [] });
    expect(await screen.findByText(t.assistantPortal.earnings.noTerms)).toBeTruthy();
    expect(screen.getByText(t.assistantPortal.earnings.statementsEmpty)).toBeTruthy();
    expect(screen.getByText(t.assistantPortal.earnings.statementsEmptyHint)).toBeTruthy();
  });

  it('is read-only: no action buttons', async () => {
    open(EARNINGS);
    await screen.findByText(t.enums.payoutStatus.paid);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
