import type { MyPaymentRow } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { MyPayments } from './MyPayments';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const pay = (over: Partial<MyPaymentRow>): MyPaymentRow => ({
  id: 'p1',
  student: { id: 's1', code: 'AB-1000', name: 'سهيلة' },
  kind: 'payment',
  amount: 1080,
  currency: 'SAR',
  method: 'bank',
  paid_at: '2026-10-02T09:00:00.000Z',
  note: 'دفعة أولى',
  ...over,
});

function open(rows: MyPaymentRow[]) {
  apiFetch.mockResolvedValue(rows);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MyPayments />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('MyPayments «مدفوعاتي»', () => {
  it('lists only what the API returns for me: student, amount in its currency, type, method, note', async () => {
    open([pay({}), pay({ id: 'p2', student: { id: 's2', code: 'AB-1001', name: 'يوسف' }, kind: 'refund', amount: 40, currency: 'USD', method: 'cash', note: null })]);
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/sales/me/payments');
    expect(screen.getByText('1,080')).toBeTruthy();
    expect(screen.getByText(t.pricing.currencies.SAR)).toBeTruthy();
    expect(screen.getByText('40')).toBeTruthy();
    expect(screen.getByText(t.pricing.currencies.USD)).toBeTruthy();
    expect(screen.getByText(t.enums.paymentKind.refund)).toBeTruthy();
    expect(screen.getByText(t.enums.paymentMethod.cash)).toBeTruthy();
    expect(screen.getByText('دفعة أولى')).toBeTruthy();
  });

  it('shows no total across payments or currencies', async () => {
    open([pay({}), pay({ id: 'p2', amount: 40, currency: 'USD' })]);
    await screen.findByText('1,080');
    expect(screen.queryByText('1,120')).toBeNull();
    expect(document.body.textContent).not.toMatch(/إجمالي|total/i);
  });

  it('a clear empty state: nothing recorded yet, and that only my own payments show here', async () => {
    open([]);
    expect(await screen.findByText(t.assistantPortal.payments.empty)).toBeTruthy();
    expect(screen.getByText(t.assistantPortal.payments.emptyHint)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
});
