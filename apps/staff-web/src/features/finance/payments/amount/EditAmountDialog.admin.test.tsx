import type { PaymentView } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { PAYMENT } from '@/features/finance/subscriptions/money-fixture';
import { PaymentDialogs } from '@/features/finance/payments/PaymentDialogs';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const T = t.payments.editAmount;
const boxName = T.newAmount.replace('{currency}', 'ر.س');

function open(payment: PaymentView = PAYMENT) {
  const onClose = vi.fn();
  const onDone = vi.fn();
  renderWithClient(<PaymentDialogs payment={payment} action="amount" onClose={onClose} onDone={onDone} />);
  return { onClose, onDone };
}

function typeAndNext(value: string) {
  const dialog = within(screen.getByRole('dialog', { name: T.title }));
  fireEvent.change(dialog.getByRole('textbox', { name: boxName }), { target: { value } });
  fireEvent.click(dialog.getByRole('button', { name: T.action }));
}

const confirm = () => {
  const dialog = within(screen.getByRole('dialog', { name: T.confirmTitle }));
  fireEvent.click(dialog.getByRole('button', { name: T.confirm }));
};

describe('«تعديل المبلغ» by the admin (owner 2026-11-02)', () => {
  afterEach(() => apiSend.mockReset());

  it('shows the current amount, asks old → new, then PATCH /payments/:id with the amount only', async () => {
    apiSend.mockResolvedValue({ ...PAYMENT, amount: 120 });
    const { onDone } = open();
    expect(screen.getByText(T.current.replace('{amount}', '145 ر.س'))).toBeTruthy();
    typeAndNext('120');
    expect(apiSend).not.toHaveBeenCalled();
    const body = T.confirmBody.replace('{old}', '145 ر.س').replace('{new}', '120 ر.س');
    expect(screen.getByText(body)).toBeTruthy();
    confirm();
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(T.saved));
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/payments/pay-1', { amount: 120 });
  });

  it('the same amount is refused in the box: no confirm, no request', () => {
    open();
    typeAndNext('145');
    expect(screen.getByText(T.same)).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: T.confirmTitle })).toBeNull();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('an API refusal is said in the confirm (t.payments.error)', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'refund_exceeds_paid' }));
    open();
    typeAndNext('10');
    confirm();
    expect(await screen.findByText(t.payments.error.refund_exceeds_paid)).toBeTruthy();
  });

  it('cancelling the confirm comes back to the box with the typed amount', () => {
    open();
    typeAndNext('130');
    const dialog = within(screen.getByRole('dialog', { name: T.confirmTitle }));
    fireEvent.click(dialog.getByRole('button', { name: t.common.cancel }));
    const box = screen.getByRole<HTMLInputElement>('textbox', { name: boxName });
    expect(box.value).toBe('130');
  });
});
