import { renderHook } from '@testing-library/react-native';
import { registerPush } from './registerPush';
import { useNotificationHandling } from './useNotificationHandling';
import { usePushRegistration } from './usePushRegistration';

jest.mock('./registerPush', () => ({ registerPush: jest.fn(async () => undefined) }));
jest.mock('./useNotificationHandling', () => ({ useNotificationHandling: jest.fn() }));

test('registers once per mount of the admin tree, not on every render', async () => {
  const { rerender } = await renderHook(() => usePushRegistration());
  await rerender({});
  expect(registerPush).toHaveBeenCalledTimes(1);
});

test('the same mount handles what pushes do (foreground, taps)', async () => {
  await renderHook(() => usePushRegistration());
  expect(useNotificationHandling).toHaveBeenCalled();
});
