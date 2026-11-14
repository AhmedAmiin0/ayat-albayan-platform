import * as Notifications from 'expo-notifications';

/** The latest OS unregister; registerPush waits on it so a late one can't kill a fresh token. */
let pending: Promise<void> = Promise.resolve();

/**
 * The OS stops delivering pushes to this app until it registers again (the next sign-in does).
 * Sign-out calls it because the server may never hear of the sign-out: offline, GoTrue's logout
 * drops only the local session, the auth.sessions row lives on and its token's binding with it
 * (migration 700). The old token then answers DeviceNotRegistered and the API deletes it. Never throws.
 */
export function silencePush(): Promise<void> {
  pending = unregister();
  return pending;
}

async function unregister(): Promise<void> {
  try {
    await Notifications.unregisterForNotificationsAsync();
  } catch {
    // No push permission or no module on this device: nothing is delivered to silence.
  }
}

/**
 * Resolves once the last silencePush has finished, however long it took. Callers may stop waiting
 * on silencePush (the login screen gives up after SILENCE_WAIT_MS); registration must not.
 */
export function silenceSettled(): Promise<void> {
  return pending;
}
