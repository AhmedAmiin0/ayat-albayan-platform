import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { BalanceCard } from '@/features/finance/subscriptions/balance/BalanceCard/BalanceCard';
import { balanceOf, WEEKLY } from '@/features/finance/subscriptions/money-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend: vi.fn() }));

// 81 due with 80 received is still unpaid and shows what is left.
const PART = { ...WEEKLY, price: 81, paid: 80 };
const LINE = 'مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1';
const SHORT = 'المبلغ أقل من المستحق بـ 1 ر.س، ستبقى الباقة غير مدفوعة حتى يكتمل المبلغ';

function renderCard(sub = PART) {
  apiFetch.mockResolvedValue(balanceOf([sub]));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BalanceCard student={{ id: 'stu-1', name: 'سهيلة', code: 'AB-0183' }} />
    </QueryClientProvider>,
  );
}

describe('BalanceCard: a part-paid package', () => {
  beforeEach(() => apiFetch.mockReset());

  it('80 of 81: the status stays unpaid and the line says 1 is left', async () => {
    renderCard();
    expect(await screen.findByText(LINE)).toBeTruthy();
    expect(screen.getByText(t.enums.subscriptionStatus.unpaid)).toBeTruthy();
  });

  it('nothing paid, or paid in full: no part-paid line', async () => {
    renderCard({ ...PART, paid: 0 });
    expect(await screen.findByText(t.enums.subscriptionStatus.unpaid)).toBeTruthy();
    expect(screen.queryByText(/مدفوعة جزئيًا/)).toBeNull();
  });

  it('recording less than what is due warns before saving; saving stays allowed', async () => {
    renderCard({ ...PART, paid: 0 });
    fireEvent.click(await screen.findByRole('button', { name: t.payments.record }));
    const dialog = await screen.findByRole('dialog');
    const amount = screen.getByLabelText(new RegExp(t.payments.amount));
    expect(screen.queryByText(SHORT)).toBeNull();
    fireEvent.change(amount, { target: { value: '80' } });
    expect(screen.getByText(SHORT)).toBeTruthy();
    fireEvent.change(amount, { target: { value: '81' } });
    expect(screen.queryByText(SHORT)).toBeNull();
    fireEvent.change(amount, { target: { value: '80' } });
    const save = screen.getAllByRole('button', { name: t.payments.record }).at(-1);
    expect(save?.hasAttribute('disabled')).toBe(false);
    expect(dialog).toBeTruthy();
  });
});
