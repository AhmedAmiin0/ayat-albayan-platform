import { renderHook, waitFor } from '@testing-library/react-native';
import { freshQueryClient, queryWrapper } from '../testing/query';
import { useIsTestAccount } from './use-permissions';
import { mockCall } from '@ab/testing/mock-call';

// /auth/me `is_test` (docs/56) drives the family app's test chip.
const mockApi = mockCall();
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

beforeEach(() => jest.clearAllMocks());

test('true only when /auth/me says is_test: true', async () => {
  mockApi.onRead(() => ({ id: 'g1', role: 'guardian', permissions: [], is_test: true }));
  const { result } = await renderHook(() => useIsTestAccount(), {
    wrapper: queryWrapper(freshQueryClient()),
  });
  await waitFor(() => expect(result.current).toBe(true));
});

test('false on a real account and on an older API without the field', async () => {
  mockApi.onRead(() => ({ id: 'g1', role: 'guardian', permissions: [] }));
  const { result } = await renderHook(() => useIsTestAccount(), {
    wrapper: queryWrapper(freshQueryClient()),
  });
  await waitFor(() => expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/auth/me' }));
  expect(result.current).toBe(false);
});

test('signed out (not enabled): never fetches, and false even with a test answer cached', async () => {
  const client = freshQueryClient();
  client.setQueryData(['auth', 'me'], { id: 'g1', is_test: true });
  const { result } = await renderHook(() => useIsTestAccount(false), {
    wrapper: queryWrapper(client),
  });
  expect(result.current).toBe(false);
  expect(mockApi.reads()).toHaveLength(0);
});
