import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { movesGate, useAuthGate } from './use-auth-gate';

type Listener = (event: AuthChangeEvent, session: Session | null) => void;
let mockEmit: Listener = () => undefined;
const mockUnsubscribe = jest.fn();
const mockVerify = jest.fn();
const mockClear = jest.fn();
const mockSilence = jest.fn();

jest.mock('@/core/lib/http/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (fn: Listener) => {
        mockEmit = fn;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
    },
  },
}));
jest.mock('./verify-role', () => ({ verifyRole: (s: unknown) => mockVerify(s) }));
jest.mock('@/core/lib/query/query-client', () => ({ clearQueryCaches: () => mockClear() }));
jest.mock('@/core/push/silence-push', () => ({ silencePush: () => mockSilence() }));

const session = { access_token: 'tok', user: { id: 'u1' } } as Session;

beforeEach(() => jest.clearAllMocks());

test('boots, then admits a restored admin session', async () => {
  mockVerify.mockResolvedValue('admin');
  const { result } = await renderHook(() => useAuthGate());
  expect(result.current).toBe('booting');
  await act(async () => mockEmit('INITIAL_SESSION', session));
  await waitFor(() => expect(result.current).toBe('admin'));
  expect(mockClear).not.toHaveBeenCalled();
  expect(mockSilence).not.toHaveBeenCalled();
});

test('a restored teacher session opens the teacher app, checked with that session', async () => {
  mockVerify.mockResolvedValue('teacher');
  const { result } = await renderHook(() => useAuthGate());
  await act(async () => mockEmit('INITIAL_SESSION', session));
  await waitFor(() => expect(result.current).toBe('teacher'));
  expect(mockVerify).toHaveBeenCalledWith(session);
});

test('no stored session: out, with the caches cleared', async () => {
  const { result } = await renderHook(() => useAuthGate());
  await act(async () => mockEmit('INITIAL_SESSION', null));
  await waitFor(() => expect(result.current).toBe('out'));
  expect(mockVerify).not.toHaveBeenCalled();
  expect(mockClear).toHaveBeenCalled();
  expect(mockSilence).toHaveBeenCalled();
});

test('sign-out from anywhere closes the app and clears query + persisted cache', async () => {
  mockVerify.mockResolvedValue('admin');
  const { result } = await renderHook(() => useAuthGate());
  await act(async () => mockEmit('SIGNED_IN', session));
  await waitFor(() => expect(result.current).toBe('admin'));
  await act(async () => mockEmit('SIGNED_OUT', null));
  await waitFor(() => expect(result.current).toBe('out'));
  expect(mockClear).toHaveBeenCalledTimes(1);
});

test('GoTrue signs the app out on its own (refresh-token reuse): pushes silenced like the button', async () => {
  mockVerify.mockResolvedValue('teacher');
  const { result } = await renderHook(() => useAuthGate());
  await act(async () => mockEmit('INITIAL_SESSION', session));
  await waitFor(() => expect(result.current).toBe('teacher'));
  expect(mockSilence).not.toHaveBeenCalled();
  await act(async () => mockEmit('SIGNED_OUT', null));
  await waitFor(() => expect(mockSilence).toHaveBeenCalledTimes(1));
});

test('the OS push is silenced before the login screen shows (a quick sign-in is never silenced)', async () => {
  let done: () => void = () => undefined;
  mockSilence.mockReturnValueOnce(new Promise<void>((r) => (done = r)));
  const { result } = await renderHook(() => useAuthGate());
  await act(async () => mockEmit('INITIAL_SESSION', null));
  expect(result.current).toBe('booting');
  await act(async () => done());
  await waitFor(() => expect(result.current).toBe('out'));
});

test('a slow check that finishes after sign-out cannot reopen the app', async () => {
  let finish: (v: string) => void = () => undefined;
  mockVerify.mockReturnValue(new Promise((r) => (finish = r)));
  const { result } = await renderHook(() => useAuthGate());
  await act(async () => mockEmit('SIGNED_IN', session));
  await act(async () => mockEmit('SIGNED_OUT', null));
  await waitFor(() => expect(result.current).toBe('out'));
  await act(async () => finish('admin'));
  expect(result.current).toBe('out');
});

test('token refreshes do not re-check or flicker', () => {
  expect(movesGate('TOKEN_REFRESHED', session)).toBe(false);
  expect(movesGate('USER_UPDATED', session)).toBe(false);
  expect(movesGate('SIGNED_IN', session)).toBe(true);
  expect(movesGate('TOKEN_REFRESHED', null)).toBe(true);
});

test('unsubscribes on unmount', async () => {
  const { unmount } = await renderHook(() => useAuthGate());
  await unmount();
  expect(mockUnsubscribe).toHaveBeenCalled();
});
