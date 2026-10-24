import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { FOREGROUND, useNotificationHandling } from './useNotificationHandling';

// GET /auth/me answers mockMe, so a mount refetch never swaps seeded permissions for «hide nothing».
let mockMe: unknown = {};
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: async (path: string) => (path === '/auth/me' ? mockMe : {}),
}));
const mockPush = jest.fn();
// The root stack shows the tabs (no chat open): every tap is a push (useNotificationHandling.chat.test).
const mockTabsRoot = { routes: [{ name: '__root', state: { index: 0, routes: [{ name: '(tabs)' }] } }] };
// One ref for every render, like the real hook: a fresh object would re-run the tap effect on any re-render.
const mockNav = { isReady: () => true, getRootState: () => mockTabsRoot };
jest.mock('expo-router', () => ({
  router: { push: (mockHref: string) => mockPush(mockHref) },
  useNavigationContainerRef: () => mockNav,
}));

type Listener = (event: unknown) => void;
const mockListeners: { received?: Listener; response?: Listener } = {};
const mockRemove = jest.fn();
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationReceivedListener: jest.fn((fn: Listener) => {
    mockListeners.received = fn;
    return { remove: mockRemove };
  }),
  addNotificationResponseReceivedListener: jest.fn((fn: Listener) => {
    mockListeners.response = fn;
    return { remove: mockRemove };
  }),
}));

const PHONE = '+966552147730';
const notification = (data: Record<string, unknown>) => ({ request: { content: { data } } });
const tap = (data: Record<string, unknown>) => ({ notification: notification(data) });
const lastResponse = jest.mocked(Notifications.getLastNotificationResponse);

async function mount() {
  const client = createTestQueryClient();
  const hook = await renderHook(() => useNotificationHandling(), { wrapper: queryWrapper(client) });
  return { client, ...hook };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMe = {};
  lastResponse.mockReturnValue(null);
});

test('foreground pushes show as a banner, in the list, with sound', async () => {
  await mount();
  const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls[0]?.[0];
  await expect(handler?.handleNotification(notification({}) as never)).resolves.toEqual(FOREGROUND);
  expect(FOREGROUND).toMatchObject({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true });
});

test('a tap while the app runs opens the thread of that number', async () => {
  await mount();
  await act(async () => mockListeners.response?.(tap({ kind: 'new_message', phone: PHONE })));
  expect(mockPush).toHaveBeenCalledWith('/inbox/thread/%2B966552147730');
});

test('the tap that started the app opens its screen once, then is cleared', async () => {
  lastResponse.mockReturnValue(tap({ kind: 'lesson_needs_confirmation', lessonId: 'l1' }) as never);
  await mount();
  expect(mockPush).toHaveBeenCalledWith('/');
  expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
});

test('a native module that cannot say (Expo Go) is not an error', async () => {
  lastResponse.mockImplementation(() => {
    throw new Error('unavailable');
  });
  await mount();
  expect(mockPush).not.toHaveBeenCalled();
});

test('a push that is not ours does not navigate', async () => {
  await mount();
  await act(async () => mockListeners.response?.(tap({ kind: 'promo' })));
  await act(async () => mockListeners.response?.({}));
  expect(mockPush).not.toHaveBeenCalled();
});

test('a message push refreshes that thread and the inbox, in the foreground', async () => {
  const { client } = await mount();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await act(async () => mockListeners.received?.(notification({ kind: 'new_message', phone: PHONE })));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['threads', PHONE] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['leads'] });
  invalidate.mockClear();
  await act(async () => mockListeners.received?.(notification({ kind: 'payment_due', studentId: 's1' })));
  expect(invalidate.mock.calls).toEqual([[{ queryKey: ['notifications'] }]]); // only the bell
});

test('unmount removes both listeners and the foreground handler', async () => {
  const { unmount } = await mount();
  await unmount();
  expect(mockRemove).toHaveBeenCalledTimes(2);
  expect(Notifications.setNotificationHandler).toHaveBeenLastCalledWith(null);
});

test('a message push also refreshes the tab badge count (its own query key)', async () => {
  const { client } = await mount();
  const spy = jest.spyOn(client, 'invalidateQueries');
  await act(async () => mockListeners.received?.(notification({ kind: 'new_message', phone: PHONE })));
  expect(spy).toHaveBeenCalledWith({ queryKey: ['threads', 'nav-count'] });
});

test('a tap into a hidden tab falls back to «المزيد» (a hidden tab goes nowhere)', async () => {
  const client = createTestQueryClient();
  mockMe = { role: 'admin', permissions: ['payments.read'] };
  client.setQueryData(['auth', 'me'], mockMe);
  await renderHook(() => useNotificationHandling(), { wrapper: queryWrapper(client) });
  // The tap reads the permissions of the settled /auth/me (the mount refetch done, not in flight).
  await waitFor(() => expect(client.isFetching({ queryKey: ['auth', 'me'] })).toBe(0));
  await act(async () => mockListeners.response?.(tap({ kind: 'new_message', phone: PHONE })));
  expect(mockPush).toHaveBeenCalledWith('/more');
});

test('the teacher tree opens her own screens', async () => {
  const client = createTestQueryClient();
  await renderHook(() => useNotificationHandling('teacher'), { wrapper: queryWrapper(client) });
  await act(async () => mockListeners.response?.(tap({ kind: 'new_student', studentId: 's1', lessonId: 'l1' })));
  expect(mockPush).toHaveBeenCalledWith('/teacher/schedule');
});
