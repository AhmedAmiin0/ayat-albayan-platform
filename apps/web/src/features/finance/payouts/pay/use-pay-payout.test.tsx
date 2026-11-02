import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { PayoutView } from '@/features/finance/payouts/api';
import { usePayPayout } from './use-pay-payout';

const upload = vi.hoisted(() => vi.fn(async () => 'receipts/t1/a.jpg'));
const pay = vi.hoisted(() => vi.fn());
vi.mock('@/features/finance/teacher-earnings/api', () => ({ uploadTeacherReceipt: upload }));
vi.mock('@/features/finance/payouts/api', () => ({ payPayout: pay }));
vi.mock('@/features/finance/payments/api', () => ({ paidAtFor: (day: string) => `${day}T09:00:00.000Z` }));
vi.mock('@/features/finance/subscriptions/api', () => ({ MONEY_KEY: ['money'] }));

const payout = { id: 'p1', teacher: { id: 't1' } } as PayoutView;

function render() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => usePayPayout(payout, vi.fn()), { wrapper }).result;
}

// docs/27 E4: pins the pay-with-receipt rule before and after the move to client-core's uploadOnce.
describe('usePayPayout: the receipt goes up once per file', () => {
  it('a retry after a refused pay re-sends the same path; another file uploads anew', async () => {
    const hook = render();
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const input = { day: '2026-10-26', method: 'bank' as const, note: ' ', file };
    pay.mockRejectedValueOnce(new Error('500')).mockResolvedValue({});
    await act(async () => hook.current.mutateAsync(input).catch(() => undefined));
    await act(async () => hook.current.mutateAsync(input));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(pay).toHaveBeenLastCalledWith('p1', { paidAt: '2026-10-26T09:00:00.000Z', method: 'bank', note: null, receiptPath: 'receipts/t1/a.jpg' });
    await act(async () => hook.current.mutateAsync({ ...input, file: new File(['y'], 'b.jpg', { type: 'image/jpeg' }) }));
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it('no file: no upload, receiptPath null', async () => {
    upload.mockClear();
    pay.mockResolvedValue({});
    const hook = render();
    await act(async () => hook.current.mutateAsync({ day: '2026-10-26', method: 'cash', note: '', file: null }));
    expect(upload).not.toHaveBeenCalled();
    expect(pay).toHaveBeenLastCalledWith('p1', expect.objectContaining({ receiptPath: null }));
  });
});
