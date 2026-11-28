import { apiErrorCode } from '@ab/client-core';
import { z } from 'zod';
import { call } from './api';

jest.mock('./supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));
jest.mock('./env', () => ({ env: { apiUrl: 'http://api' } }));
jest.mock('./client-tag', () => ({ mobileClientTag: () => 'mobile/0.2.0' }));

const mockFetch = jest.fn();
beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
});

const payout = z.object({ id: z.string(), amount: z.number() });
const reply = (body: unknown) =>
  mockFetch.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

test('a read with a schema resolves the parsed answer', async () => {
  reply({ id: 'p1', amount: 10, extra: true });
  expect(await call({ path: '/payouts/p1', schema: payout })).toEqual({ id: 'p1', amount: 10 });
});

test('an answer that breaks the schema rejects as bad_response', async () => {
  reply({ id: 'p1', amount: '10' });
  const error: unknown = await call({ path: '/payouts/p1', schema: payout }).catch(
    (e: unknown) => e,
  );
  expect(apiErrorCode(error)).toBe('bad_response');
});
