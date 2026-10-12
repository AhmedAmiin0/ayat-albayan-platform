import { renderHook } from '@testing-library/react-native';
import { createTestQueryClient, queryWrapper } from '@/test/query';
import { registerPush } from './registerPush';
import { useNotificationHandling } from './useNotificationHandling';
import { usePushRegistration } from './usePushRegistration';

jest.mock('./registerPush', () => ({ registerPush: jest.fn(async () => undefined) }));
jest.mock('./useNotificationHandling', () => ({ useNotificationHandling: jest.fn() }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: jest.fn(() => new Promise(() => undefined)) }));

async function mount(permissions?: string[], tree?: 'admin' | 'teacher') {
  const client = createTestQueryClient();
  if (permissions) client.setQueryData(['auth', 'me'], { role: 'teacher', permissions });
  return renderHook(() => usePushRegistration(tree), { wrapper: queryWrapper(client) });
}

beforeEach(() => jest.clearAllMocks());

test('registers once per mount of the tree, not on every render', async () => {
  const { rerender } = await mount();
  await rerender({});
  expect(registerPush).toHaveBeenCalledTimes(1);
});

test('the same mount handles what pushes do (foreground, taps) for its tree', async () => {
  await mount(undefined, 'teacher');
  expect(useNotificationHandling).toHaveBeenCalledWith('teacher');
});

test('registration needs notifications.push', async () => {
  await mount(['lessons.read']);
  expect(registerPush).not.toHaveBeenCalled();
  await mount(['notifications.push']);
  expect(registerPush).toHaveBeenCalledTimes(1);
});
