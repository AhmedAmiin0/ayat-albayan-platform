import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { paymentCalls } from '../payments-api';

const ID = '00000000-0000-4000-8000-0000000000a1';
const SUB = '00000000-0000-4000-8000-0000000000a2';
const payment = {
  id: ID,
  subscription_id: SUB,
  student: { id: '00000000-0000-4000-8000-0000000000a3', code: 'AB-0001', name: 'S' },
  amount: 100,
  currency: 'USD',
  method: 'bank',
  paid_at: '2026-10-01T08:00:00.000Z',
  receipt_path: null,
  recorded_by: null,
  note: null,
  created_at: '2026-10-01T08:00:00.000Z',
  kind: 'payment',
  original: null,
  invoice_id: null,
};
const page = { items: [payment], total: 1, page: 1, pageSize: 25, totals: [] };

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('paymentCalls: reads', () => {
  it('reads one page of payments with its filters and sort', async () => {
    const { client, apiFetch } = clientAnswering(page);
    const query = { kind: 'refund', page: 2, pageSize: 25, sort: 'amount', dir: 'desc' } as const;
    await expect(paymentCalls(client).list(query)).resolves.toEqual(page);
    expect(apiFetch).toHaveBeenCalledWith(
      '/payments?kind=refund&page=2&pageSize=25&sort=amount&dir=desc',
    );
  });

  it('reads one payment, its receipt link and its attachments', async () => {
    const link = { url: 'https://files.example/r.pdf', expires_at: 'e' };
    const { client, apiFetch } = clientAnswering(payment);
    await paymentCalls(client).get(ID);
    expect(apiFetch).toHaveBeenLastCalledWith(`/payments/${ID}`);
    apiFetch.mockResolvedValueOnce(link);
    await expect(paymentCalls(client).receipt(ID)).resolves.toEqual(link);
    expect(apiFetch).toHaveBeenLastCalledWith(`/payments/${ID}/receipt`);
    apiFetch.mockResolvedValueOnce([]);
    await expect(paymentCalls(client).attachments(ID)).resolves.toEqual([]);
    expect(apiFetch).toHaveBeenLastCalledWith(`/payments/${ID}/attachments`);
  });

  it('throws bad_response for a payment with an unknown kind', async () => {
    const { client } = clientAnswering({ ...page, items: [{ ...payment, kind: 'gift' }] });
    const error: unknown = await paymentCalls(client).list({}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ body: { code: 'bad_response' } });
  });
});

describe('paymentCalls: writes', () => {
  it('records a payment', async () => {
    const { client, apiSend } = clientAnswering(payment);
    const body = {
      subscriptionId: SUB,
      amount: 100,
      currency: 'USD',
      kind: 'payment',
      method: 'bank',
      paidAt: '2026-10-01T08:00:00.000Z',
      receiptPath: null,
      note: null,
      clientRequestId: '00000000-0000-4000-8000-0000000000a4',
    } as const;
    await expect(paymentCalls(client).create(body)).resolves.toEqual(payment);
    expect(apiSend).toHaveBeenCalledWith('POST', '/payments', body);
  });

  it('asks for a signed receipt upload', async () => {
    const slot = { bucket: 'receipts', path: `${SUB}/r.pdf`, token: 't', signed_url: 'u' };
    const { client, apiSend } = clientAnswering(slot);
    const body = { subscriptionId: SUB, mime: 'application/pdf', size: 10 } as const;
    await expect(paymentCalls(client).receiptUploadUrl(body)).resolves.toEqual(slot);
    expect(apiSend).toHaveBeenCalledWith('POST', '/payments/receipt-upload-url', body);
  });

  it('edits and removes a payment', async () => {
    const { client, apiSend } = clientAnswering(payment);
    await paymentCalls(client).update(ID, { amount: 90 });
    expect(apiSend).toHaveBeenLastCalledWith('PATCH', `/payments/${ID}`, { amount: 90 });
    apiSend.mockResolvedValueOnce(undefined);
    await expect(paymentCalls(client).remove(ID)).resolves.toBeUndefined();
    expect(apiSend).toHaveBeenLastCalledWith('DELETE', `/payments/${ID}`, undefined);
  });
});
