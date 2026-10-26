import type { Session } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { retryGate } from './gate-retry';
import { useAuthGate } from './use-auth-gate';

// «إعادة المحاولة» on the startup screen while the first /auth/me hangs.
const mockVerify = jest.fn();
const mockGetSession = jest.fn();
const mockClear = jest.fn();
const session = { access_token: 'tok', user: { id: 'u1' } } as Session;

jest.mock('@/core/lib/http/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
      getSession: () => mockGetSession(),
    },
  },
}));
jest.mock('./verify-role', () => ({ verifyRole: (s: unknown) => mockVerify(s) }));
jest.mock('@/core/lib/query/query-client', () => ({ clearQueryCaches: () => mockClear() }));
jest.mock('@/core/push/silence-push', () => ({ silencePush: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session }, error: null });
});

test('a retry checks the stored session again and the newest answer opens the app', async () => {
  mockVerify.mockResolvedValue('teacher');
  const { result } = await renderHook(() => useAuthGate());
  expect(result.current).toBe('booting');
  await act(async () => retryGate());
  await waitFor(() => expect(result.current).toBe('teacher'));
  expect(mockVerify).toHaveBeenCalledWith(session);
});

test('unmounted, a retry does nothing', async () => {
  const { unmount } = await renderHook(() => useAuthGate());
  await act(async () => unmount());
  retryGate();
  expect(mockVerify).not.toHaveBeenCalled();
});

test('offline, an expired session whose refresh failed reads as none: a retry never signs out', async () => {
  mockGetSession.mockResolvedValue({ data: { session: null }, error: new Error('fetch failed') });
  const { result } = await renderHook(() => useAuthGate());
  await act(async () => retryGate());
  expect(result.current).toBe('booting');
  expect(mockVerify).not.toHaveBeenCalled();
  expect(mockClear).not.toHaveBeenCalled();
});
