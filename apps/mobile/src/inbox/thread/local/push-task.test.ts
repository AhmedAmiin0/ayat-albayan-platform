import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { definePushSyncTask, PUSH_SYNC_TASK } from './push-task';
import { onPushWake } from './push-wake';

// The task is defined and registered from the entry (index.ts), with the wake as its body.

jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));
jest.mock('expo-notifications', () => ({ registerTaskAsync: jest.fn(async () => null) }));
jest.mock('./push-wake', () => ({ onPushWake: jest.fn(async () => 1) }));

test('defines the task over onPushWake and registers it for notifications', async () => {
  definePushSyncTask();
  expect(Notifications.registerTaskAsync).toHaveBeenCalledWith(PUSH_SYNC_TASK);
  const [name, body] = jest.mocked(TaskManager.defineTask).mock.calls[0] ?? [];
  expect(name).toBe(PUSH_SYNC_TASK);
  const data = { data: { dataString: '{}' } };
  await body?.({ data, error: null, executionInfo: { eventId: 'e', taskName: PUSH_SYNC_TASK } });
  expect(onPushWake).toHaveBeenCalledWith(data);
});

test('a phone without the native module: registering fails quietly', () => {
  jest.mocked(Notifications.registerTaskAsync).mockRejectedValueOnce(new Error('unavailable'));
  expect(() => definePushSyncTask()).not.toThrow();
});
