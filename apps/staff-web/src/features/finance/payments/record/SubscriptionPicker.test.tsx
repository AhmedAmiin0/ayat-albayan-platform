import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { moneyText } from '@/features/finance/subscriptions';
import { WEEKLY } from '@/features/finance/subscriptions/money-fixture';
import { t } from '@/lib/i18n/i18n';
import { SubscriptionPicker } from './SubscriptionPicker';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));

// «إلغاء الاشتراك» keeps the money (migration 991): a stopped package still owes, so a payment can
// go to it; an unused cancel never takes one.
const STOPPED = { ...WEEKLY, id: 'sub-stop', status: 'cancelled' as const, cancel_kind: 'stopped', paid: 50 };
const UNUSED = { ...WEEKLY, id: 'sub-unused', status: 'cancelled' as const, cancel_kind: 'unused' };

describe('SubscriptionPicker', () => {
  it('offers a stopped package that still owes and picks it first; never an unused cancel', async () => {
    apiFetch.mockResolvedValue({ items: [UNUSED, STOPPED], total: 2, page: 1, pageSize: 100 });
    const onPick = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SubscriptionPicker
          student={WEEKLY.student}
          onStudent={vi.fn()}
          picked={null}
          onPick={onPick}
        />
      </QueryClientProvider>,
    );
    await vi.waitFor(() => expect(onPick).toHaveBeenCalledWith(STOPPED));
    const values = screen.getAllByRole('option').map((o) => (o as HTMLOptionElement).value);
    expect(values).toEqual(['', 'sub-stop']);
  });

  it('a stopped package: «دُفع X من Y» of what it is owed for, not its price (review 2026-11-06)', async () => {
    const owing = { ...STOPPED, stop_owed_amount: 70 };
    apiFetch.mockResolvedValue({ items: [owing], total: 1, page: 1, pageSize: 100 });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SubscriptionPicker
          student={WEEKLY.student}
          onStudent={vi.fn()}
          picked={null}
          onPick={vi.fn()}
        />
      </QueryClientProvider>,
    );
    const paid = t.payments.paidOf.replace('{paid}', moneyText(50, owing.currency));
    const line = paid.replace('{price}', moneyText(70, owing.currency));
    const texts = () => screen.getAllByRole('option').map((o) => o.textContent);
    await vi.waitFor(() => expect(texts().some((x) => x.includes(line))).toBe(true));
  });
});
