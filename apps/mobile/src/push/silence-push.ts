import * as Notifications from 'expo-notifications';

/**
 * The OS stops delivering pushes to this app until it registers again (the next sign-in does).
 * Sign-out calls it because the server may never hear of the sign-out: offline, GoTrue's logout
 * drops only the local session, the auth.sessions row lives on and its token's binding with it
 * (migration 700). The old token then answers DeviceNotRegistered and the API deletes it. Never throws.
 */
export async function silencePush(): Promise<void> {
  try {
    await Notifications.unregisterForNotificationsAsync();
  } catch {
    // No push permission or no module on this device: nothing is delivered to silence.
  }
}
