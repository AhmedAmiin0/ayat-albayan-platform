import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesPaymentCalls } from '../payments-api';

const SUB = '22222222-2222-4222-8222-222222222222';
const MSG = '44444444-4444-4444-8444-444444444444';
const REQ = '33333333-3333-4333-8333-333333333333';
const PAYMENT = {
  id: 'p-1',
  subscription_id: SUB,
  student: { id: 'k-1', code: 'AB-0201', name: 'ريم', status: 'active' },
  amount: 180,
  currency: 'SAR',
  method: 'bank',
  kind: 'payment',
  paid_at: '2026-10-12T09:00:00.000Z',
  note: null,
  created_at: '2026-10-12T09:00:01.000Z',
};
const SIGNED = { bucket: 'receipts', path: `${SUB}/a.jpg`, token: 't', signed_url: 'https://x' };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiSend };
};

describe('sales payment calls', () => {
  it('records a transfer on the path of today', async () => {
    const { client, apiSend } = clientAnswering(PAYMENT);
    const body = {
      subscriptionId: SUB,
      amount: 180,
      currency: 'SAR',
      paidAt: '2026-10-12T09:00:00Z',
      clientRequestId: REQ,
    };
    await expect(salesPaymentCalls(client).create(body)).resolves.toEqual(PAYMENT);
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payments', body);
  });

  it('asks an upload slot and copies a chat file with the chat phone', async () => {
    const { client, apiSend } = clientAnswering(SIGNED);
    const upload = { subscriptionId: SUB, mime: 'image/jpeg' as const, size: 5 };
    await expect(salesPaymentCalls(client).receiptUploadUrl(upload)).resolves.toEqual(SIGNED);
    const copy = { subscriptionId: SUB, messageId: MSG, phone: '+966500000001' };
    apiSend.mockResolvedValueOnce({ receipt_path: `${SUB}/c.jpg` });
    await salesPaymentCalls(client).receiptFromChat(copy);
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/sales/payments/receipt-upload-url', upload],
      ['POST', '/sales/payments/receipt-from-chat', copy],
    ]);
  });

  it('patches an amount by the payment id', async () => {
    const { client, apiSend } = clientAnswering(PAYMENT);
    await salesPaymentCalls(client).editAmount({ paymentId: SUB, amount: 150 });
    expect(apiSend).toHaveBeenCalledWith('PATCH', `/sales/payments/${SUB}/amount`, { amount: 150 });
  });

  it('throws bad_response for a payment whose method is outside the catalog', async () => {
    const { client } = clientAnswering({ ...PAYMENT, method: 'barter' });
    const failure = await salesPaymentCalls(client)
      .editAmount({ paymentId: SUB, amount: 150 })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
