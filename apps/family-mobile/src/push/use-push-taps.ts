import { pushTarget } from '@ab/client-core';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { openAlert } from '@/nav';

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

/** R-MOB-01: also when the tap started the app; mounted by the tabs so the router is ready. */
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
