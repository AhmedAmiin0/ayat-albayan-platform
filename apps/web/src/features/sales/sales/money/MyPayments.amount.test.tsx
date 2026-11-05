import type { MyPaymentRow } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { MyPayments } from './MyPayments';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const granted = vi.hoisted(() => ({ keys: ['subscriptions.edit_terms'] as string[] }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({
    permissions: granted.keys,
    can: (k: string) => granted.keys.includes(k),
  }),
}));

const T = t.payments.editAmount;
const boxName = T.newAmount.replace('{currency}', 'ر.س');

const pay = (over: Partial<MyPaymentRow>): MyPaymentRow => ({
  id: 'p1',
  student: { id: 's1', code: 'AB-1000', name: 'سهيلة' },
  kind: 'payment',
  amount: 1080,
  currency: 'SAR',
  method: 'bank',
  paid_at: '2026-10-02T09:00:00.000Z',
  note: null,
  ...over,
});

const ROWS = [
  pay({}),
  pay({ id: 'p2', student: { id: 's2', code: 'AB-1001', name: 'يوسف' }, method: 'card' }),
  pay({ id: 'p3', student: { id: 's3', code: 'AB-1002', name: 'مريم' }, kind: 'refund' }),
];

async function open(keys: string[] = ['subscriptions.edit_terms']) {
  granted.keys = keys;
  apiFetch.mockResolvedValue(ROWS);
  renderWithClient(<MyPayments />);
  await screen.findByText('سهيلة');
}

const editOf = (name: string) =>
  screen.queryByRole('button', { name: `${T.action} ${name}` });

function editTo(value: string) {
  fireEvent.click(screen.getByRole('button', { name: `${T.action} سهيلة` }));
  const dialog = within(screen.getByRole('dialog', { name: T.title }));
  fireEvent.change(dialog.getByRole('textbox', { name: boxName }), { target: { value } });
  fireEvent.click(dialog.getByRole('button', { name: T.action }));
}

const confirm = () =>
  fireEvent.click(within(screen.getByRole('dialog', { name: T.confirmTitle })).getByRole('button', { name: T.confirm }));

describe('«تعديل المبلغ» in «مدفوعاتي» (subscriptions.edit_terms, owner 2026-11-02)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('with the key: only on a bank payment, never a card one or a refund', async () => {
    await open();
    expect(editOf('سهيلة')).toBeTruthy();
    expect(editOf('يوسف')).toBeNull();
    expect(editOf('مريم')).toBeNull();
  });

  it('without the key: no action at all', async () => {
    await open([]);
    expect(screen.queryByRole('button', { name: new RegExp(T.action) })).toBeNull();
  });

  it('old → new, then PATCH /sales/payments/:id/amount, and «مدفوعاتي» is read again', async () => {
    apiSend.mockResolvedValue(undefined);
    await open();
    editTo('1000');
    const body = T.confirmBody.replace('{old}', '1,080 ر.س').replace('{new}', '1,000 ر.س');
    expect(screen.getByText(body)).toBeTruthy();
    confirm();
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/sales/payments/p1/amount', { amount: 1000 }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('the same amount: said, no request', async () => {
    await open();
    editTo('1080');
    expect(screen.getByText(T.same)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('an API refusal is said in the confirm', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'stripe_amount_locked' }));
    await open();
    editTo('900');
    confirm();
    expect(await screen.findByText(t.payments.error.stripe_amount_locked)).toBeTruthy();
  });
});
