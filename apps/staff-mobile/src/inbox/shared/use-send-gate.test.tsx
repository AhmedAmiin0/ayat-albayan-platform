import { pathKey } from '@ab/mobile-kit';
import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useSendGate } from './use-send-gate';

const mockApiFetch = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (...mockArgs: unknown[]) => mockApiFetch(...mockArgs),
}));

beforeEach(() => jest.clearAllMocks());

test('reads the gate once into the cache entry both readers share', async () => {
  const gate = { open: false, reason: 'switch_off', queued: 2 };
  mockApiFetch.mockResolvedValue(gate);
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useSendGate(), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(result.current.data).toEqual(gate));
  expect(mockApiFetch.mock.calls.map(([path]) => path)).toEqual(['/messages/gate']);
  expect(client.getQueryData(pathKey('/messages/gate'))).toEqual(gate);
});

test('refuses an answer that is not a gate', async () => {
  mockApiFetch.mockResolvedValue({ open: 'yes' });
  const client = createTestQueryClient();
  const { result } = await renderHook(() => useSendGate(), { wrapper: queryWrapper(client) });
  await waitFor(() => expect(result.current.isError).toBe(true));
});
