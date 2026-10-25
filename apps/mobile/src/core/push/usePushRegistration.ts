import { useEffect } from 'react';
import { useHolds, usePermissions } from '@/auth/use-permissions';
import type { PushTree } from './notification-route';
import { registerPush } from './registerPush';
import { useNotificationHandling } from './useNotificationHandling';

/** Trees whose role holds notifications.push by default: they register before /auth/me answers. */
const LENIENT: readonly PushTree[] = ['admin', 'teacher'];

/**
 * Mount once in each signed-in tree (app/(tabs)/_layout.tsx for admins, the teacher, sales and
 * assistant tabs), so every sign-in and every cold start registers this device, and pushes show in
 * the foreground and open this tree's screen when tapped. R-MOB-01, R-NOT-01. Registration needs
 * notifications.push. Admin and teacher: while /auth/me loads `can` allows all and the API refuses
 * a role without it. Sales and assistant wait for /auth/me to list it: no OS prompt, no PUT, no
 * error UI without it; a 403 if the grant is withdrawn meanwhile is swallowed by registerPush.
 */
export function usePushRegistration(tree: PushTree = 'admin'): void {
  useNotificationHandling(tree);
  const lenient = usePermissions()('notifications.push');
  const held = useHolds('notifications.push');
  const allowed = LENIENT.includes(tree) ? lenient : held;
  useEffect(() => {
    if (allowed) void registerPush();
  }, [allowed]);
}
