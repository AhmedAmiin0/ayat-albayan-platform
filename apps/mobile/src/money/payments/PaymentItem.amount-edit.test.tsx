import type { PaymentView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { money } from '@/core/lib/money/format';
import { pathKey } from '@/core/lib/query/query-keys';
import { payment } from '@/payments/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { PaymentItem } from './PaymentItem';

// «تعديل المبلغ» on «كل المدفوعات» (owner 2026-11-02): PATCH /payments/:id { amount } only.
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(async () => ({})),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const e = t.payments.editAmount;
const LABEL = new RegExp(e.newAmount.split(' (')[0] ?? '');
const action = () => screen.queryByRole('button', { name: new RegExp(`^${e.action} · `) });

async function show(row: PaymentView, held = ['payments.write']) {
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'admin', permissions: held });
  const spy = jest.spyOn(client, 'invalidateQueries');
  await renderWithQuery(<PaymentItem payment={row} />, client);
  return spy;
}

async function typeAndReview(text: string) {
  await fireEvent.press(await screen.findByRole('button', { name: new RegExp(`^${e.action} · `) }));
  expect(screen.getByText(e.current.replace('{amount}', money(145, 'SAR')))).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(LABEL), text);
  await fireEvent.press(screen.getByRole('button', { name: e.action }));
}

beforeEach(() => {
  mockApiSend.mockReset();
  mockApiSend.mockResolvedValue(undefined);
});

test('new amount → old → new confirm → PATCH { amount } only; the lists refetch', async () => {
  const invalidate = await show(payment());
  await typeAndReview('150');
  const body = e.confirmBody.replace('{old}', money(145, 'SAR')).replace('{new}', money(150, 'SAR'));
  expect(screen.getByText(body)).toBeTruthy();
  expect(mockApiSend).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: e.confirm }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/payments/p1', { amount: 150 }));
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['payments'] }));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['subscriptions'] });
  await waitFor(() => expect(screen.queryByLabelText(LABEL)).toBeNull());
});

test('the same amount: said, no confirm and no request', async () => {
  await show(payment());
  await typeAndReview('145');
  expect(screen.getByText(e.same)).toBeTruthy();
  expect(screen.queryByRole('button', { name: e.confirm })).toBeNull();
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a card (Stripe) payment: no «تعديل المبلغ»', async () => {
  await show(payment({ method: 'card' }));
  expect(action()).toBeNull();
});

test('without payments.write: no «تعديل المبلغ»', async () => {
  await show(payment(), ['payments.read']);
  expect(action()).toBeNull();
});

test('the API’s refusal is said in its words', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'refund_exceeds_paid' }));
  await show(payment());
  await typeAndReview('10');
  await fireEvent.press(screen.getByRole('button', { name: e.confirm }));
  expect(await screen.findByText(t.payments.error.refund_exceeds_paid)).toBeTruthy();
});
