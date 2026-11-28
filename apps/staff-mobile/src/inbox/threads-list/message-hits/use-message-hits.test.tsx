import { messageSearchKey } from '@ab/client-core';
import { renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useMessageHits } from './use-message-hits';
import { mockCall } from '@ab/testing/mock-call';

// The global search's pages: asked from 3 characters, never written to disk (noPersist).

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const HIT = {
  id: 'b2222222-2222-4222-8222-222222222222',
  created_at: '2026-03-01T08:00:00Z',
  snippet: 'درس',
  phone_e164: '+966500000123',
  display_name: null,
};

beforeEach(() => jest.clearAllMocks());

test('3 characters ask the API; the query carries meta.noPersist; a cursor means more', async () => {
  mockApi.onRead(() => ({ items: [HIT], next_cursor: 'c' }));
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useMessageHits('درس'), {
    wrapper: queryWrapper(client),
  });
  await waitFor(() => expect(result.current.hits).toHaveLength(1));
  expect(result.current.more).toBe(true);
  expect(mockApi.reads()).toContainEqual({
    method: 'GET',
    path: `/threads/search?q=${encodeURIComponent('درس')}`,
  });
  expect(client.getQueryCache().find({ queryKey: messageSearchKey('درس') })?.meta).toEqual({
    noPersist: true,
  });
});

test('fewer than 3 folded characters ask nothing and are not searching', async () => {
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useMessageHits('دَرْ'), {
    wrapper: queryWrapper(client),
  });
  expect([result.current.asked, result.current.searching]).toEqual([false, false]);
  expect(mockApi.reads()).toHaveLength(0);
});
