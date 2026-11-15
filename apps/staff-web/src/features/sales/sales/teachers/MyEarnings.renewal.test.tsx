import type { AssistantStatementView, MyEarnings as Earnings } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { MyEarnings } from './MyEarnings';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const p = t.assistantPortal.earnings;
const STATEMENT: AssistantStatementView = {
  id: 'st1', assistant: { id: 'a1', name: 'الزهراء' }, month: '2026-11-01', status: 'paid',
  totals: { SAR: { salary: 0, commissions: 45, adjustments: 0, total: 45 } },
  lines: [
    { kind: 'commission', amount: 30, currency: 'SAR', student: { code: 'AB-1001', name: 'يوسف' }, reason: null, commission_kind: 'first' },
    { kind: 'commission', amount: 15, currency: 'SAR', student: { code: 'AB-1002', name: 'جود' }, reason: null, commission_kind: 'renewal' },
  ],
  approved_at: '2026-12-01T09:00:00.000Z', paid_at: '2026-12-02T09:00:00.000Z', method: 'bank', note: null, has_receipt: false,
};
const EARNINGS: Earnings = {
  terms: { assistant_id: 'a1', commission: { type: 'percent', value: 10, currency: null, starts_on: '2026-09-01' }, salary: null, renewal_share_percent: 40 },
  this_month: {},
  commissions_total: { SAR: 45 },
  wallet: { SAR: { due: 45, paid: 0, this_month: 0 } },
  statements: [STATEMENT],
};

afterEach(() => apiFetch.mockReset());

describe('MyEarnings «الكشوف»: renewal commissions (owner 2026-10-26)', () => {
  it('the note says each renewal earns the share the admin set; a renewal line reads «عمولة تجديد»', async () => {
    apiFetch.mockResolvedValue(EARNINGS);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MyEarnings />
      </QueryClientProvider>,
    );
    expect(await screen.findByText(new RegExp(p.commissionNote.split('{n}')[0] ?? ''))).toBeTruthy();
    expect(screen.getByText((text) => text.startsWith(p.commissionNote.split('{n}')[0] ?? '') && text.includes('40%'))).toBeTruthy();
    expect(screen.getByText(p.line.commission.replace('{student}', 'يوسف'))).toBeTruthy();
    expect(screen.getByText(p.line.commissionRenewal.replace('{student}', 'جود'))).toBeTruthy();
  });

  it('share 0 («عمولة التجديد» off, owner 2026-11-01): the note says it is paused, never «0%»', async () => {
    const terms = EARNINGS.terms && { ...EARNINGS.terms, renewal_share_percent: 0 };
    apiFetch.mockResolvedValue({ ...EARNINGS, terms });
    const noRetry = { defaultOptions: { queries: { retry: false } } };
    render(
      <QueryClientProvider client={new QueryClient(noRetry)}>
        <MyEarnings />
      </QueryClientProvider>,
    );
    const off = p.commissionNoteRenewalOff.split('{date}')[0] ?? '-';
    expect(await screen.findByText((text) => text.startsWith(off))).toBeTruthy();
    expect(screen.queryByText((text) => text.startsWith(p.commissionNote.split('{n}')[0] ?? '-') && text.includes('0%'))).toBeNull();
  });
});
