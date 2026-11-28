import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../../core/http';
import { salesSubscribeCalls } from '../subscribe-api';

const STUDENT = '11111111-1111-4111-8111-111111111111';
const SUB = '22222222-2222-4222-8222-222222222222';
const REQ = '33333333-3333-4333-8333-333333333333';
const QUOTE = {
  package: 'weekly',
  lessons: 4,
  duration: 30,
  currency: 'SAR',
  discount: 0,
  afterDiscount: 145,
  perLesson: 36.25,
};
const SUBSCRIPTION = {
  id: SUB,
  student: { id: STUDENT, code: 'AB-0183', name: 'سهيلة' },
  package: '4',
  duration: 30,
  lessons_total: 4,
  lessons_used_before: 0,
  price: 145,
  currency: 'SAR',
  starts_on: '2026-11-27',
  status: 'unpaid',
  paid: 0,
  due: 145,
};

const clientAnswering = (answer: unknown) => {
  const apiFetch = vi.fn(async () => answer);
  const apiSend = vi.fn(async () => answer);
  const client: ApiClient = { apiFetch, apiSend };
  return { client, apiFetch, apiSend };
};

describe('sales subscribe calls', () => {
  it('reads the teachers on the path of today', async () => {
    const teachers = [{ id: STUDENT, name: 'أ. سارة' }];
    const { client, apiFetch } = clientAnswering(teachers);
    await expect(salesSubscribeCalls(client).teachers()).resolves.toEqual(teachers);
    expect(apiFetch).toHaveBeenCalledWith('/sales/subscriptions/teachers');
  });

  it('posts the quote with the chat phone when given', async () => {
    const { client, apiSend } = clientAnswering(QUOTE);
    const body = { studentId: STUDENT, pricing: { tier: 'weekly' as const }, phone: '+966500000001' };
    await expect(salesSubscribeCalls(client).quote(body)).resolves.toEqual(QUOTE);
    expect(apiSend).toHaveBeenCalledWith('POST', '/sales/subscriptions/quote', body);
  });

  it('creates with its clientRequestId and cancels by id', async () => {
    const { client, apiSend } = clientAnswering(SUBSCRIPTION);
    const calls = salesSubscribeCalls(client);
    const body = { studentId: STUDENT, pricing: { tier: 'weekly' as const }, clientRequestId: REQ };
    await expect(calls.create(body)).resolves.toEqual(SUBSCRIPTION);
    await calls.cancel({ subscriptionId: SUB, body: { reason: 'خطأ' } });
    expect(apiSend.mock.calls).toEqual([
      ['POST', '/sales/subscriptions', body],
      ['POST', `/sales/subscriptions/${SUB}/cancel`, { reason: 'خطأ' }],
    ]);
  });

  it('throws bad_response for a package with a duration outside the catalog', async () => {
    const { client } = clientAnswering({ ...SUBSCRIPTION, duration: 50 });
    const body = { studentId: STUDENT, pricing: { tier: 'weekly' as const }, clientRequestId: REQ };
    const failure = await salesSubscribeCalls(client)
      .create(body)
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ body: { code: 'bad_response' } });
  });
});
