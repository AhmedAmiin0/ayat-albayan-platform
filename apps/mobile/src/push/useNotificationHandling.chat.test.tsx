import { act, renderHook } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import type { PushTree } from './notification-route';
import { useNotificationHandling } from './useNotificationHandling';

// A tap while a chat is open (its group on top of the root stack, above the tabs): a tab's screen pops
// back to the tabs (dismissTo), since a push would stack a second tab host; another chat is a push.
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: async () => ({}) }));
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockTop = { name: '(admin-chat)' };
jest.mock('expo-router', () => ({
  router: { push: (h: string) => mockPush(h), dismissTo: (h: string) => mockDismissTo(h) },
  useNavigationContainerRef: () => ({
    isReady: () => true,
    // expo-router's own '__root' slot holds the root layout's stack: the tree, then the chat group.
    getRootState: () => ({ routes: [{ name: '__root', state: { routes: [{ name: '(tabs)' }, mockTop] } }] }),
  }),
}));

type Listener = (event: unknown) => void;
const mockListeners: { response?: Listener } = {};
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(() => null),
  clearLastNotificationResponse: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn((fn: Listener) => {
    mockListeners.response = fn;
    return { remove: jest.fn() };
  }),
}));

const PHONE = '+966552147730';
const tap = (data: Record<string, unknown>) => ({ notification: { request: { content: { data } } } });

async function tapIn(tree: PushTree, data: Record<string, unknown>) {
  await renderHook(() => useNotificationHandling(tree), { wrapper: queryWrapper(createTestQueryClient()) });
  await act(async () => mockListeners.response?.(tap(data)));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTop.name = '(admin-chat)';
});

test('over the admin chat, a payment due pops back to the tabs at that student; no push', async () => {
  await tapIn('admin', { kind: 'payment_due', studentId: 's9' });
  expect(mockDismissTo).toHaveBeenCalledWith('/students/s9');
  expect(mockPush).not.toHaveBeenCalled();
});

test('over a chat, a message push opens that chat inside the group (a push)', async () => {
  await tapIn('admin', { kind: 'new_message', phone: PHONE });
  expect(mockPush).toHaveBeenCalledWith('/inbox/thread/%2B966552147730');
  expect(mockDismissTo).not.toHaveBeenCalled();
});

test.each([
  { tree: 'sales', group: '(sales-chat)', data: { kind: 'meeting_invite' }, href: '/sales/more/meetings' },
  { tree: 'teacher', group: '(teacher-chat)', data: { kind: 'report_submitted' }, href: '/teacher/reports' },
])('over the $tree chat, a tab screen pops back to its tabs', async ({ tree, group, data, href }) => {
  mockTop.name = group;
  await tapIn(tree as PushTree, data);
  expect(mockDismissTo).toHaveBeenCalledWith(href);
  expect(mockPush).not.toHaveBeenCalled();
});

test('with the tabs on top (no chat open), a tap is a push, as before', async () => {
  mockTop.name = '(tabs)';
  await tapIn('admin', { kind: 'payment_due', studentId: 's9' });
  expect(mockPush).toHaveBeenCalledWith('/students/s9');
  expect(mockDismissTo).not.toHaveBeenCalled();
});
