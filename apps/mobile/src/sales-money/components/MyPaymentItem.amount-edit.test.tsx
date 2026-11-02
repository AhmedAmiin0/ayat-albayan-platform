import type { MyPaymentRow } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { money } from '@/core/lib/money/format';
import { pathKey } from '@/core/lib/query/query-keys';
import { myPayment } from '@/sales-money/testing/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { MyPaymentItem } from './MyPaymentItem';

// «تعديل المبلغ» on «مدفوعاتي» with payments.edit_amount (owner 2026-11-02).
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(async () => ({})),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const e = t.payments.editAmount;
const LABEL = new RegExp(e.newAmount.split(' (')[0] ?? '');
const action = () => screen.queryByRole('button', { name: new RegExp(`^${e.action} · `) });

async function show(row: MyPaymentRow, held = ['self.sales_money', 'payments.edit_amount']) {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'assistant', permissions: held });
  await renderWithQuery(<MyPaymentItem payment={row} />, client);
}

async function editTo(text: string) {
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${e.action} · `) }));
  await fireEvent.changeText(screen.getByLabelText(LABEL), text);
  await fireEvent.press(screen.getByRole('button', { name: e.action }));
}

beforeEach(() => {
  mockApiSend.mockReset();
  mockApiSend.mockResolvedValue(undefined);
});

test('with the key: old → new confirm, then PATCH /sales/payments/:id/amount', async () => {
  await show(myPayment());
  await editTo('450');
  const body = e.confirmBody.replace('{old}', money(500, 'SAR')).replace('{new}', money(450, 'SAR'));
  expect(screen.getByText(body)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: e.confirm }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/sales/payments/p1/amount', { amount: 450 }),
  );
});

test('without payments.edit_amount: no action', async () => {
  await show(myPayment(), ['self.sales_money']);
  expect(action()).toBeNull();
});

test.each([
  ['a refund', myPayment({ kind: 'refund' })],
  ['a card payment', myPayment({ method: 'card' })],
])('%s: no action', async (_name, row) => {
  await show(row);
  expect(action()).toBeNull();
});

test('the same amount: no request', async () => {
  await show(myPayment());
  await editTo('500');
  expect(screen.getByText(e.same)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('the API’s refusal is said in its words', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'stripe_amount_locked' }));
  await show(myPayment());
  await editTo('450');
  await fireEvent.press(screen.getByRole('button', { name: e.confirm }));
  expect(await screen.findByText(t.payments.error.stripe_amount_locked)).toBeTruthy();
});
