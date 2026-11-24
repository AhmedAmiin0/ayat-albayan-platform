import { renderHook, waitFor } from '@testing-library/react-native';
import { freshQueryClient, queryWrapper } from '../../testing/query';
import { nativeRoomQuery, useNativeRoom } from './native-room-query';

let mockNative: unknown = null;
const mockLoads = jest.fn();
jest.mock('./livekit-native', () => ({
  liveKitNative: async () => {
    mockLoads();
    return mockNative;
  },
}));

beforeEach(() => mockLoads.mockClear());

async function hook() {
  const client = freshQueryClient();
  const { result } = await renderHook(() => useNativeRoom(), { wrapper: queryWrapper(client) });
  return { client, result };
}

test('pending first (the screen shows its loading state), then null without LiveKit', async () => {
  mockNative = null;
  const { result } = await hook();
  expect(result.current.isPending).toBe(true);
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
});

test('with LiveKit: the platform, loaded once and never refetched or saved to disk', async () => {
  mockNative = { sdk: {}, rtc: {}, lk: {} };
  const { client, result } = await hook();
  await waitFor(() => expect(result.current.data).not.toBeNull());
  expect(result.current.data?.createClient).toBeDefined();
  await client.query(nativeRoomQuery);
  expect(mockLoads).toHaveBeenCalledTimes(1);
  expect(nativeRoomQuery.staleTime).toBe(Infinity);
  expect(nativeRoomQuery.meta).toEqual({ noPersist: true });
});
