import type { PaymentView } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { PAYMENT } from '@/features/finance/subscriptions/money-fixture';
import { PaymentsPage } from '@/features/finance/payments/PaymentsPage';
import { EditPaymentDialog } from '@/features/finance/payments/record/EditPaymentDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const CARD: PaymentView = { ...PAYMENT, id: 'pay-2', method: 'card', receipt_path: null };
const amountName = `${t.payments.amount} (ر.س)`;

function page(rows: PaymentView[]) {
  const body = { items: rows, total: rows.length, page: 1, pageSize: 20, totals: [] };
  apiFetch.mockResolvedValue(body);
  renderWithClient(<PaymentsPage search={{}} onSearch={vi.fn()} />);
}

const actionFor = (row: HTMLElement) =>
  within(row).queryByRole('button', { name: new RegExp(t.payments.editAmount.action) });

describe('«تعديل المبلغ» never for a card payment: its amount is Stripe’s', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('the row action shows for a bank payment and not for a card one', async () => {
    page([PAYMENT, { ...CARD, student: { ...CARD.student, name: 'يوسف' } }]);
    const bank = (await screen.findByText('سهيلة')).closest('tr');
    const card = screen.getByText('يوسف').closest('tr');
    expect(bank && actionFor(bank)).toBeTruthy();
    expect(card && actionFor(card)).toBeNull();
  });

  it('«تعديل الدفعة» of a card payment: the amount is disabled, said, and never sent', async () => {
    apiSend.mockResolvedValue(CARD);
    renderWithClient(<EditPaymentDialog payment={CARD} onClose={vi.fn()} />);
    const box = screen.getByRole<HTMLInputElement>('textbox', { name: amountName });
    expect(box.disabled).toBe(true);
    expect(screen.getByText(t.payments.editAmount.fromStripe)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    const [method, path, body] = apiSend.mock.calls[0] ?? [];
    expect([method, path]).toEqual(['PATCH', '/payments/pay-2']);
    expect(body).not.toHaveProperty('amount');
  });

  it('a bank payment edit still sends its amount', async () => {
    apiSend.mockResolvedValue(PAYMENT);
    renderWithClient(<EditPaymentDialog payment={PAYMENT} onClose={vi.fn()} />);
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: amountName }).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/payments/pay-1', expect.objectContaining({ amount: 145 })));
  });
});
