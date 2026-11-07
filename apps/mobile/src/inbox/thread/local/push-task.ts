import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { onPushWake } from './push-wake';

/** The background notification task (expo-task-manager; native since APK 0.6.0). */
export const PUSH_SYNC_TASK = 'ab-push-sync';

/**
 * Defined and registered at module scope, from the app's entry (index.ts) before the router: a
 * push that starts the app with no screen (killed, Android) loads the bundle and runs only this.
 * iOS without the remote-notification background mode never runs it (a no-op there).
 */
export function definePushSyncTask(): void {
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(PUSH_SYNC_TASK, ({ data }) =>
    onPushWake(data),
  );
  // Registered on every launch (idempotent); a phone without the native module just skips it.
  void Notifications.registerTaskAsync(PUSH_SYNC_TASK).catch(() => undefined);
}
