import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PAYMENT } from '@/features/finance/subscriptions/money-fixture';
import { t } from '@ab/web-kit';
import { StudentPayments } from './StudentPayments';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch,
}));

const totals = [{ currency: 'SAR', net: 145, payments: 145, refunds: 0 }];
const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 20, totals });

function renderPayments() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StudentPayments studentId="s-1" />
    </QueryClientProvider>,
  );
}

afterEach(() => apiFetch.mockReset());

describe('StudentPayments «المدفوعات» (R-STU-06, R-PAY-01)', () => {
  it('shows the error line on a failed read, and retry reads again', async () => {
    apiFetch.mockRejectedValueOnce(new Error('down')).mockResolvedValue(page([PAYMENT]));
    renderPayments();
    expect((await screen.findByRole('alert')).textContent).toContain(t.finance.studentPaymentsFailed);
    fireEvent.click(screen.getByRole('button', { name: t.common.retry }));
    expect(await screen.findByRole('heading', { name: /المدفوعات/ })).toBeTruthy();
  });

  it('shows a skeleton while loading', () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    renderPayments();
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
  });

  it('renders nothing when the student has no payments', async () => {
    apiFetch.mockResolvedValue(page([]));
    renderPayments();
    await vi.waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
