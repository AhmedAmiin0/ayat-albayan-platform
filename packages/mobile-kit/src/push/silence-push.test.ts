import * as Notifications from 'expo-notifications';
import { silencePush, silenceSettled } from './silence-push';

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

test('silenceSettled waits for a slow unregister to finish', async () => {
  let finish = (): void => undefined;
  unregister.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));
  void silencePush();
  let settled = false;
  const waiting = silenceSettled().then(() => (settled = true));
  await Promise.resolve();
  expect(settled).toBe(false);
  finish();
  await waiting;
  expect(settled).toBe(true);
});
