import type { PaymentView } from '@ab/money';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { PAYMENT } from '@/features/finance/subscriptions/money-fixture';
import { paymentMenu } from './payment-menu';

const CARD: PaymentView = { ...PAYMENT, method: 'card', receipt_path: null, invoice_id: null };
const ids = (p: PaymentView, canWrite = true) =>
  paymentMenu(p, { onAction: vi.fn(), canWrite }).map((i) => i.id);

describe('paymentMenu: one menu per payment row (UX-7)', () => {
  it('a bank payment with a receipt: every action, delete marked as danger', () => {
    const items = paymentMenu(
      { ...PAYMENT, method: 'bank', receipt_path: 'r.jpg' },
      { onAction: vi.fn(), canWrite: true },
    );
    expect(items.map((i) => i.id)).toEqual(['receipt', 'attachments', 'amount', 'edit', 'delete']);
    expect(items.filter((i) => i.danger).map((i) => i.id)).toEqual(['delete']);
  });

  it('«Edit» and «Edit amount» read differently', () => {
    const labels = paymentMenu(PAYMENT, { onAction: vi.fn(), canWrite: true }).map((i) => i.label);
    expect(labels).toContain(t.payments.editAmount.action);
    expect(labels).toContain(t.payments.editDetails);
    expect(t.payments.editDetails).not.toBe(t.payments.editAmount.action);
  });

  it('a card payment without a receipt: no receipt, attachments or amount edit', () => {
    expect(ids(CARD)).toEqual(['edit', 'delete']);
  });

  it('without payments.write the amount edit is not offered', () => {
    expect(ids(PAYMENT, false)).not.toContain('amount');
  });

  it('an invoice alone still offers the receipt', () => {
    expect(ids({ ...CARD, invoice_id: 'inv-1' })).toContain('receipt');
  });

  it('a pick hands the row and its action back', () => {
    const onAction = vi.fn();
    const del = paymentMenu(PAYMENT, { onAction, canWrite: true }).find((i) => i.id === 'delete');
    del?.onSelect();
    expect(onAction).toHaveBeenCalledWith(PAYMENT, 'delete');
  });
});
