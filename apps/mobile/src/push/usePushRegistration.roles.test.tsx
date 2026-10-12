import { renderHook, waitFor } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { registerPush } from './registerPush';
import { useNotificationHandling } from './useNotificationHandling';
import { usePushRegistration } from './usePushRegistration';

// The sales and classroom-assistant trees: registration waits for /auth/me to list notifications.push.
jest.mock('./registerPush', () => ({ registerPush: jest.fn(async () => undefined) }));
jest.mock('./useNotificationHandling', () => ({ useNotificationHandling: jest.fn() }));
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));

const mount = (tree: 'sales' | 'assistant') =>
  renderHook(() => usePushRegistration(tree), { wrapper: queryWrapper(createTestQueryClient()) });

beforeEach(() => jest.clearAllMocks());

test.each(['sales', 'assistant'] as const)('%s: taps open this tree, without notifications.push nothing registers', async (tree) => {
  mockApiFetch.mockResolvedValue({ role: tree, permissions: ['inbox.read', 'self.sales'] });
  await mount(tree);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(useNotificationHandling).toHaveBeenCalledWith(tree);
  expect(registerPush).not.toHaveBeenCalled();
});

test('while /auth/me has not answered nothing registers (no OS prompt)', async () => {
  mockApiFetch.mockReturnValue(new Promise(() => undefined));
  await mount('sales');
  expect(registerPush).not.toHaveBeenCalled();
});

test('a role widened to notifications.push registers once', async () => {
  mockApiFetch.mockResolvedValue({ role: 'assistant', permissions: ['notifications.push'] });
  const { rerender } = await mount('assistant');
  await waitFor(() => expect(registerPush).toHaveBeenCalledTimes(1));
  await rerender({});
  expect(registerPush).toHaveBeenCalledTimes(1);
});
