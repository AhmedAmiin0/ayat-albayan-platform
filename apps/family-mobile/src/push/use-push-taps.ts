import { pushTarget } from '@ab/client-core';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { openAlert } from '#/nav/index.ts';

/**
 * The tapped push that started the app, forgotten as it is read so a later mount never replays
 * it; null when there is none or the native module cannot say (Expo Go, tests).
 */
function takeLastTap(): Notifications.NotificationResponse | null {
  try {
    const last = Notifications.getLastNotificationResponse();
    if (last) Notifications.clearLastNotificationResponse();
    return last;
  } catch {
    return null;
  }
}

/** Opens what a push names, as its bell row would (@ab/client-core pushTarget). */
function openTap(response: Notifications.NotificationResponse | null): void {
  const target = pushTarget(response?.notification.request.content.data);
  if (target) openAlert(target);
}

/**
 * A tapped family push opens its screen (R-MOB-01): a report, the child, the package, the chat,
 * and «بدأت الحلقة» the live lesson (owner 2026-11-16), also when the tap started the app.
 * Mounted by the tabs, so the router is ready and the family is signed in.
 */
export function usePushTaps(): void {
  useEffect(() => {
    openTap(takeLastTap());
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      takeLastTap();
      openTap(response);
    });
    return () => sub.remove();
  }, []);
}
