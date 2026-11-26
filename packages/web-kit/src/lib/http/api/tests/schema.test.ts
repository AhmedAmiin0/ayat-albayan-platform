import { apiErrorCode } from '@ab/client-core';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiFetch } from '@ab/web-kit/lib/http/api/api';

vi.mock('@ab/web-kit/lib/http/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  },
}));

const fetchMock = vi.fn<typeof fetch>();
const payout = z.object({ id: z.string(), amount: z.number() });
const reply = (body: unknown) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

it('parses a read with its schema and drops undeclared keys', async () => {
  reply({ id: 'p1', amount: 10, extra: true });
  await expect(apiFetch('/payouts/p1', { schema: payout })).resolves.toEqual({
    id: 'p1',
    amount: 10,
  });
});

it('turns an answer that breaks the schema into bad_response', async () => {
  reply({ id: 'p1', amount: '10' });
  const error: unknown = await apiFetch('/payouts/p1', { schema: payout }).catch((e: unknown) => e);
  expect(apiErrorCode(error)).toBe('bad_response');
});

it('does not send the schema to fetch', async () => {
  reply({ id: 'p1', amount: 10 });
  await apiFetch('/payouts/p1', { schema: payout });
  expect(fetchMock.mock.calls.at(-1)?.[1]).not.toHaveProperty('schema');
});
