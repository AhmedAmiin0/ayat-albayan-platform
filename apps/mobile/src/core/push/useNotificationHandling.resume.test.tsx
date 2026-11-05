import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import type { PushTree } from './notification-route';
import { useNotificationHandling } from './useNotificationHandling';

// Back in the app (owner 2026-11-05): every tree, the teacher's too (a new_message push opens her
// chat, and she has no realtime), cancels the chat reads stuck across the background and re-reads.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), dismissTo: jest.fn() },
  useNavigationContainerRef: () => ({ isReady: () => false, getRootState: () => undefined }),
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

let change: ((state: AppStateStatus) => void) | undefined;
beforeEach(() => {
  change = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
    change = fn;
    return { remove: jest.fn() };
  });
});
afterEach(() => jest.restoreAllMocks());

const LIST = ['threads', 'list', { search: '' }];
const CHAT = ['threads', '+966552147730'];

/** Two chat reads hang: the open chats list and a chat nobody shows (a push tap will mount it). */
async function stuckReads(tree: PushTree) {
  const client = createTestQueryClient();
  const reads = { list: 0, chat: 0 };
  const hang = (key: keyof typeof reads) => () => {
    reads[key] += 1;
    return new Promise<never>(() => undefined);
  };
  void client.query({ queryKey: LIST, queryFn: hang('list') }).catch(() => undefined);
  void client.query({ queryKey: CHAT, queryFn: hang('chat') }).catch(() => undefined);
  await renderHook(() => useNotificationHandling(tree), { wrapper: queryWrapper(client) });
  return { client, reads };
}

test.each(['teacher', 'admin', 'sales'] as const)('%s: return to the app cancels every stuck chat read', async (tree) => {
  const { client } = await stuckReads(tree);
  expect(client.isFetching({ queryKey: ['threads'] })).toBe(2);
  await act(async () => change?.('active'));
  expect(client.isFetching({ queryKey: ['threads'] })).toBe(0);
  expect(client.getQueryState(LIST)?.isInvalidated).toBe(true);
  expect(client.getQueryState(CHAT)?.isInvalidated).toBe(true);
});

test('going to the background touches nothing', async () => {
  const { client } = await stuckReads('teacher');
  await act(async () => change?.('background'));
  expect(client.isFetching({ queryKey: ['threads'] })).toBe(2);
});
