import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, useNavigationContainerRef } from 'expo-router';
import { useEffect, useRef } from 'react';
import { usePermissions } from '@/auth/use-permissions';
import { threadKey } from '@/inbox/thread/hooks/thread-cache';
import { isThreadHref, overChat } from '@/core/nav/chat-groups';
import { pushKind, pushPhone, routeIn, type PushTree } from './notification-route';

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

  // The root navigator, read at tap time: the tabs that mount this hook sit under an open chat.
  const nav = useNavigationContainerRef();
  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      // Read defensively: the native module hands over plain JSON.
      const href = routeIn(tree, response?.notification?.request?.content?.data, canRef.current);
      if (!href) return;
      // Over a chat (a full screen above the tabs), a tab's screen pops back to the tabs: a push
      // would stack a second tab host. Another chat is pushed inside the chat's own group.
      if (overChat(nav.isReady() ? nav.getRootState() : undefined) && !isThreadHref(href)) {
        router.dismissTo(href);
      } else {
        router.push(href);
      }
    };
    open(takeLastResponse()); // the tap that started the app, if any
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      takeLastResponse();
      open(response);
    });
    return () => sub.remove();
  }, [tree, nav]);
}
