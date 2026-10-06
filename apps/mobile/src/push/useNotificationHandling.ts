import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { usePermissions } from '@/auth/use-permissions';
import { threadKey } from '@/inbox/thread-cache';
import { pushKind, pushPhone, routeFor } from './notification-route';

/** An admin push in the foreground still shows: banner, notification list and sound. */
export const FOREGROUND: Notifications.NotificationBehavior = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
};

/**
 * The last tapped push, forgotten as it is read, so a later mount of the admin tree (sign-in
 * again) never replays it. null when there is none or the native module can't say (Expo Go, jest).
 */
function takeLastResponse(): Notifications.NotificationResponse | null {
  try {
    const last = Notifications.getLastNotificationResponse();
    if (last) Notifications.clearLastNotificationResponse();
    return last;
  } catch {
    return null;
  }
}

/**
 * What admin pushes do in the app (R-MOB-01): show in the foreground, refresh the thread (and the
 * inbox) a message push is about, and open the right screen when one is tapped, also when the tap
 * started the app. Mounted once in the admin-only tree, through usePushRegistration.
 */
export function useNotificationHandling(): void {
  const client = useQueryClient();
  // The tap handler outlives renders: read the role's permissions as they are at tap time.
  const can = usePermissions();
  const canRef = useRef(can);
  useEffect(() => {
    canRef.current = can;
  }, [can]);

  useEffect(() => {
    Notifications.setNotificationHandler({ handleNotification: async () => FOREGROUND });
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      const phone = pushPhone(data);
      if (phone) void client.invalidateQueries({ queryKey: threadKey(phone) });
      const kind = pushKind(data);
      if (kind === 'new_lead' || kind === 'new_message') {
        void client.invalidateQueries({ queryKey: ['leads'] });
        void client.invalidateQueries({ queryKey: ['threads', 'nav-count'] }); // the tab badge
      }
    });
    return () => {
      sub.remove();
      Notifications.setNotificationHandler(null);
    };
  }, [client]);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      // Read defensively: the native module hands over plain JSON.
      const href = routeFor(response?.notification?.request?.content?.data, canRef.current);
      if (href) router.push(href);
    };
    open(takeLastResponse()); // the tap that started the app, if any
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      takeLastResponse();
      open(response);
    });
    return () => sub.remove();
  }, []);
}
