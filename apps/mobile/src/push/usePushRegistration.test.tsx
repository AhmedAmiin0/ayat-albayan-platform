import { renderHook } from '@testing-library/react-native';
import { registerPush } from './registerPush';
import { usePushRegistration } from './usePushRegistration';

jest.mock('./registerPush', () => ({ registerPush: jest.fn(async () => undefined) }));

test('registers once per mount of the admin tree, not on every render', async () => {
  const { rerender } = await renderHook(() => usePushRegistration());
  await rerender({});
  expect(registerPush).toHaveBeenCalledTimes(1);
});
