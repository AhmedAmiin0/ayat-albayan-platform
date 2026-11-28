import { renderHook, waitFor } from '@testing-library/react-native';
import { registerPush } from '@ab/mobile-kit';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { useNotificationHandling } from '@/core/push/useNotificationHandling';
import { usePushRegistration } from '@/core/push/usePushRegistration/usePushRegistration';
import { mockCall } from '@ab/testing/mock-call';

// The sales and classroom-assistant trees: registration waits for /auth/me to list notifications.push.
jest.mock('@ab/mobile-kit/push/registerPush', () => ({
  registerPush: jest.fn(async () => undefined),
}));
jest.mock('@/core/push/useNotificationHandling/useNotificationHandling', () => ({
  useNotificationHandling: jest.fn(),
}));
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

const mount = (tree: 'sales' | 'assistant') =>
  renderHook(() => usePushRegistration(tree), {
    wrapper: queryWrapper(createTestQueryClient({ meFromApi: true })),
  });

beforeEach(() => jest.clearAllMocks());

test.each(['sales', 'assistant'] as const)(
  '%s: taps open this tree, without notifications.push nothing registers',
  async (tree) => {
    mockApi.onRead(() => ({ role: tree, permissions: ['inbox.read', 'self.sales'] }));
    await mount(tree);
    await waitFor(() =>
      expect(mockApi.reads()).toContainEqual({ method: 'GET', path: '/auth/me' }),
    );
    expect(useNotificationHandling).toHaveBeenCalledWith(tree);
    expect(registerPush).not.toHaveBeenCalled();
  },
);

test('while /auth/me has not answered nothing registers (no OS prompt)', async () => {
  mockApi.onRead(() => new Promise(() => undefined));
  await mount('sales');
  expect(registerPush).not.toHaveBeenCalled();
});

test('a role widened to notifications.push registers once', async () => {
  mockApi.onRead(() => ({ role: 'assistant', permissions: ['notifications.push'] }));
  const { rerender } = await mount('assistant');
  await waitFor(() => expect(registerPush).toHaveBeenCalledTimes(1));
  await rerender({});
  expect(registerPush).toHaveBeenCalledTimes(1);
});
