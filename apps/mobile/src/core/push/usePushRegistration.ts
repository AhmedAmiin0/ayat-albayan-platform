import { useEffect } from 'react';
import { useHolds } from '@/auth/use-permissions';
import type { PushTree } from './notification-route';
import { registerPush } from './registerPush';
import { useNotificationHandling } from './useNotificationHandling';

/**
 * Mount once in each signed-in tree (app/(tabs)/_layout.tsx for admins, the teacher, sales and
 * assistant tabs), so every sign-in and every cold start registers this device, and pushes show in
 * the foreground and open this tree's screen when tapped. R-MOB-01, R-NOT-01. Registration needs
 * notifications.push, listed by /auth/me (a tree mounts only once it has loaded, docs/27 E2): no OS
 * prompt, no PUT, no error UI without it; a 403 if the grant is withdrawn meanwhile is swallowed by registerPush.
 */
export function usePushRegistration(tree: PushTree = 'admin'): void {
  useNotificationHandling(tree);
  const allowed = useHolds('notifications.push');
  useEffect(() => {
    if (allowed) void registerPush();
  }, [allowed]);
}
