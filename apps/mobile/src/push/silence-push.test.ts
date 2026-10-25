import * as Notifications from 'expo-notifications';
import { silencePush } from './silence-push';

jest.mock('expo-notifications', () => ({ unregisterForNotificationsAsync: jest.fn() }));

const unregister = jest.mocked(Notifications.unregisterForNotificationsAsync);

beforeEach(() => jest.clearAllMocks());

test('unregisters the app from the OS push service', async () => {
  unregister.mockResolvedValueOnce(undefined);
  await silencePush();
  expect(unregister).toHaveBeenCalledTimes(1);
});

test('never throws, so sign-out always goes ahead', async () => {
  unregister.mockRejectedValueOnce(new Error('no permission'));
  await expect(silencePush()).resolves.toBeUndefined();
});
