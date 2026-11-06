import { renderHook } from '@testing-library/react-native';
import { act } from 'react';
import { useInboxStore } from './use-stored';

// The store session follows the signed-in tree (docs/43 43-7).

const mockStart = jest.fn(async (_owner: string) => undefined);
const mockStop = jest.fn(async () => undefined);
jest.mock('./store-session', () => ({
  ...jest.requireActual('./store-session'),
  startInboxStore: (owner: string) => mockStart(owner),
  stopInboxStore: () => mockStop(),
}));
let mockUser: string | null = 'user-a';
let mockGate: Promise<void> = Promise.resolve();
const mockAnswer = async () => {
  await mockGate;
  return { data: { session: mockUser ? { user: { id: mockUser } } : null } };
};
jest.mock('@/core/lib/http/supabase', () => ({
  supabase: { auth: { getSession: () => mockAnswer() } },
}));

beforeEach(() => {
  mockStart.mockClear();
  mockStop.mockClear();
  mockUser = 'user-a';
  mockGate = Promise.resolve();
});

test('enabled: started for the session’s user; unmounted (sign-out): stopped and wiped', async () => {
  const hook = await renderHook(() => useInboxStore(true));
  await act(async () => undefined);
  expect(mockStart).toHaveBeenCalledWith('user-a');
  await hook.unmount();
  expect(mockStop).toHaveBeenCalledTimes(1);
});

test('without inbox.read or a session: never started', async () => {
  await renderHook(() => useInboxStore(false));
  mockUser = null;
  await renderHook(() => useInboxStore(true));
  await act(async () => undefined);
  expect(mockStart).not.toHaveBeenCalled();
});

test('unmounted before the session was read: never started after', async () => {
  let open: () => void = () => undefined;
  mockGate = new Promise((resolve) => (open = resolve));
  const hook = await renderHook(() => useInboxStore(true));
  await hook.unmount();
  await act(async () => open());
  expect(mockStart).not.toHaveBeenCalled();
  expect(mockStop).toHaveBeenCalledTimes(1);
});
