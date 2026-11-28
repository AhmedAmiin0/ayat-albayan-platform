import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@ab/web-kit';
import { OPEN_SUB, paymentView } from '@/features/sales/sales-money/sales-money-fixture';
import {
  receiptFromChat,
  recordSalesPayment,
  uploadSalesReceipt,
} from '@/features/sales/sales-money/api';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  apiFetch,
  apiSend,
}));
vi.mock('@ab/web-kit/lib/http/supabase', () => ({
  supabase: { storage: { from: () => ({ uploadToSignedUrl }) } },
}));

const MSG = 'c1111111-1111-4111-8111-111111111111';
const REQ = '33333333-3333-4333-8333-333333333333';
const SIGNED = { bucket: 'receipts', path: `${OPEN_SUB.id}/r.jpg`, token: 'tok', signed_url: 'https://x' };
const BODY = {
  subscriptionId: OPEN_SUB.id,
  amount: 290,
  currency: 'SAR',
  paidAt: '2026-10-12T09:00:00Z',
  attachments: [],
  note: null,
  clientRequestId: REQ,
};

const failureOf = (promise: Promise<unknown>) => promise.catch((e: unknown) => e);

describe('the sales payment writes of the chat money flow', () => {
  afterEach(() => {
    apiSend.mockReset();
    uploadToSignedUrl.mockReset();
  });

  it('records a transfer on the path of today and answers the payment', async () => {
    apiSend.mockResolvedValue(paymentView());
    await expect(recordSalesPayment(BODY)).resolves.toEqual(paymentView());
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payments', BODY);
  });

  it('refuses a recorded payment whose method is outside the catalog', async () => {
    apiSend.mockResolvedValue({ ...paymentView(), method: 'barter' });
    const failure = await failureOf(recordSalesPayment(BODY));
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });

  it('copies a chat file with the chat phone and refuses an answer without its path', async () => {
    const copy = { subscriptionId: OPEN_SUB.id, messageId: MSG, phone: '+966500000001' };
    apiSend.mockResolvedValueOnce({ receipt_path: 'receipts/x.jpg' });
    await expect(receiptFromChat(copy)).resolves.toEqual({ receipt_path: 'receipts/x.jpg' });
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payments/receipt-from-chat', copy);
    apiSend.mockResolvedValueOnce({});
    expect(await failureOf(receiptFromChat(copy))).toMatchObject({ body: { code: 'bad_response' } });
  });

  it('asks the slot with the file type and size, then uploads into it', async () => {
    apiSend.mockResolvedValue(SIGNED);
    uploadToSignedUrl.mockResolvedValue({ data: {}, error: null });
    const file = new File([new Uint8Array(16)], 'r.jpg', { type: 'image/jpeg' });
    const input = { subscriptionId: OPEN_SUB.id, file, bind: { phone: '+966500000001' } };
    await expect(uploadSalesReceipt(input)).resolves.toBe(SIGNED.path);
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payments/receipt-upload-url', {
      subscriptionId: OPEN_SUB.id,
      mime: 'image/jpeg',
      size: 16,
      phone: '+966500000001',
    });
  });

  it('refuses a file type the receipts do not take before asking for a slot', async () => {
    const file = new File([new Uint8Array(4)], 'r.txt', { type: 'text/plain' });
    await expect(uploadSalesReceipt({ subscriptionId: OPEN_SUB.id, file })).rejects.toThrow();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
