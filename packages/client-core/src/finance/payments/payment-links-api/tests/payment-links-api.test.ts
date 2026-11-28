import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../../core/http';
import { paymentLinkCalls } from '../payment-links-api';

const ID = '00000000-0000-4000-8000-0000000000c1';

const link = {
  id: ID,
  url: 'https://api.example.test/pay/tok',
  kind: 'new',
  status: 'open',
  amount: 120,
  currency: 'SAR',
  reference_price: 145,
  student: { id: ID, code: 'AB-0001', name: 'S' },
  subscription_id: null,
  package: '4',
  lessons: 4,
  duration: 90,
  expires_at: '2026-11-30T08:00:00.000Z',
  paid_at: null,
  created_at: '2026-11-27T08:00:00.000Z',
};

const body = {
  studentId: ID,
  pricing: { tier: 'weekly' as const },
  amount: 120,
  currency: 'SAR' as const,
  clientRequestId: ID,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('paymentLinkCalls', () => {
  it('lists the links under /sales/payment-links', async () => {
    const { client, apiFetch } = clientAnswering([link]);
    await expect(paymentLinkCalls(client).list()).resolves.toEqual([link]);
    expect(apiFetch).toHaveBeenCalledWith('/sales/payment-links');
  });

  it('quotes, makes and cancels a link with the body and id it is given', async () => {
    const { client, apiSend } = clientAnswering(link);
    await paymentLinkCalls(client).create(body);
    await paymentLinkCalls(client).cancel(ID);
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/sales/payment-links', body],
      ['POST', `/sales/payment-links/${ID}/cancel`, undefined],
    ]);
  });

  it('sends the quote body and returns the price without the fx internals', async () => {
    const quote = {
      package: 'weekly',
      lessons: 4,
      duration: 90,
      currency: 'SAR',
      discount: 0,
      afterDiscount: 145,
      perLesson: 36.25,
    };
    const answer = { quote: { ...quote, price: 145 }, max_discount_pct: null, min_amount: null };
    const { client, apiSend } = clientAnswering(answer);
    const asked = { studentId: ID, pricing: body.pricing };
    await expect(paymentLinkCalls(client).quote(asked)).resolves.toEqual({ ...answer, quote });
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payment-links/quote', asked);
  });

  it('throws bad_response for a link of an unknown status', async () => {
    const { client } = clientAnswering([{ ...link, status: 'lost' }]);
    const error: unknown = await paymentLinkCalls(client)
      .list()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ body: { code: 'bad_response' } });
  });
});
