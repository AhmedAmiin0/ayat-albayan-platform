import { useEffect } from 'react';
import { useHolds, registerPush } from '@ab/mobile-kit';
import { useInboxStore } from '@/inbox';
import type { PushTree } from '@/core/push/notification-route';
import { useNotificationHandling } from '@/core/push/useNotificationHandling';

/**
 * Mount once in each signed-in tree (app/(tabs)/_layout.tsx for admins, the teacher, sales and
 * assistant tabs), so every sign-in and every cold start registers this device, and pushes show in
 * the foreground and open this tree's screen when tapped. R-MOB-01, R-NOT-01. Registration needs
 * notifications.push, listed by /auth/me (a tree mounts only once it has loaded, docs/27 E2): no OS
 * prompt, no PUT, no error UI without it; a 403 if the grant is withdrawn meanwhile is swallowed by registerPush.
 */
export function usePushRegistration(tree: PushTree = 'admin'): void {
  useNotificationHandling(tree);
  // The phone's message store (docs/43 43-7) for every tree that reads chats.
  useInboxStore(useHolds('inbox.read'));
  const allowed = useHolds('notifications.push');
  useEffect(() => {
    if (allowed) void registerPush();
  }, [allowed]);
}
