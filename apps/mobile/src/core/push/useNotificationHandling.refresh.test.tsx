import { act, renderHook } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import type { PushTree } from './notification-route';
import { useNotificationHandling } from './useNotificationHandling';

// docs/48: a received push refreshes the teacher's screens; every other tree is unchanged.
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async () => ({}),
}));
const mockNav = { isReady: () => true, getRootState: () => undefined };
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useNavigationContainerRef: () => mockNav,
}));

type Listener = (event: unknown) => void;
const mockListeners: { received?: Listener } = {};
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationReceivedListener: jest.fn((fn: Listener) => {
    mockListeners.received = fn;
    return { remove: jest.fn() };
  }),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

const notification = (data: Record<string, unknown>) => ({ request: { content: { data } } });

async function receive(tree: PushTree, kind: string) {
  const client = createTestQueryClient();
  await renderHook(() => useNotificationHandling(tree), { wrapper: queryWrapper(client) });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await act(async () => mockListeners.received?.(notification({ kind, lessonId: 'l1' })));
  return invalidate.mock.calls.map(([f]) => f?.queryKey);
}

test('teacher: a cancelled lesson refreshes the bell, her lessons and /teachers/me', async () => {
  expect(await receive('teacher', 'lesson_cancelled')).toEqual([
    ['notifications'],
    ['lessons'],
    ['teachers', 'me'],
  ]);
});

test('teacher: an admin-only kind refreshes only the bell', async () => {
  expect(await receive('teacher', 'lesson_needs_confirmation')).toEqual([['notifications']]);
});

const OTHER_TREES = ['admin', 'sales', 'assistant'] as const;

test.each(OTHER_TREES)('%s: lesson pushes refresh only the bell', async (tree) => {
  expect(await receive(tree, 'lesson_cancelled')).toEqual([['notifications']]);
  expect(await receive(tree, 'lesson_needs_confirmation')).toEqual([['notifications']]);
});
