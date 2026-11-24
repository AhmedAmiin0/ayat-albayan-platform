import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useNavigationContainerRef } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePermissions } from '@ab/mobile-kit';
import { refreshInbox, refreshLists, resumeInbox } from '@/inbox/thread/hooks/inbox-sync';
import { pushKind, pushPhone, routeIn, type PushTree } from '@/core/push/notification-route';
import { refreshForPush } from '@/core/push/push-refresh';
import { tapRouter } from '@/core/push/tap-route';

/** An admin push in the foreground still shows: banner, notification list and sound. */
export const FOREGROUND: Notifications.NotificationBehavior = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
};

/**
 * The last tapped push, forgotten as it is read, so a later mount of either tree (sign-in
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
 * What pushes do in the app (R-MOB-01, R-NOT-01): show in the foreground, refresh the bell and the
 * thread (and the inbox) a message push is about, and open the right screen of this tree when one
 * is tapped, also when the tap started the app. Mounted once per tree, through usePushRegistration.
 */
export function useNotificationHandling(tree: PushTree = 'admin'): void {
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
      void client.invalidateQueries({ queryKey: ['notifications'] }); // the bell's list and badge
      const phone = pushPhone(data) ?? undefined;
      const kind = pushKind(data);
      const message = kind === 'new_lead' || kind === 'new_message';
      if (message) void client.invalidateQueries({ queryKey: ['leads'] });
      refreshForPush(client, tree, kind); // docs/48: refreshes the thread, chats list and badge.
      if (phone) void refreshInbox(client, phone);
      else if (message) refreshLists(client);
    });
    // A push that came while the app slept refreshed nothing (no JS ran): every tree re-reads its
    // chats on the way back, past any read stuck across the background (resumeInbox).
    const resume = AppState.addEventListener('change', (state) => {
      if (state === 'active') void resumeInbox(client);
    });
    return () => {
      sub.remove();
      resume.remove();
      Notifications.setNotificationHandler(null);
    };
  }, [client, tree]);

  // The root navigator, read at tap time: the tabs that mount this hook sit under an open chat.
  const nav = useNavigationContainerRef();
  useEffect(() => {
    const taps = tapRouter(nav);
    const open = (response: Notifications.NotificationResponse | null) => {
      // Read defensively: the native module hands over plain JSON.
      const href = routeIn(tree, response?.notification?.request?.content?.data, canRef.current);
      if (href) taps.open(href);
    };
    open(takeLastResponse()); // the tap that started the app, if any
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      takeLastResponse();
      open(response);
    });
    return () => {
      sub.remove();
      taps.stop();
    };
  }, [tree, nav]);
}
