import { useEffect } from 'react';
import { usePermissions } from '@/auth/use-permissions';
import type { PushTree } from './notification-route';
import { registerPush } from './registerPush';
import { useNotificationHandling } from './useNotificationHandling';

/**
 * Mount once in each signed-in tree (app/(tabs)/_layout.tsx for admins, the teacher tabs for
 * teachers), so every sign-in and every cold start registers this device, and pushes show in the
 * foreground and open this tree's screen when tapped. R-MOB-01, R-NOT-01. Registration needs
 * notifications.push (admin, teacher, assistant, sales); while /auth/me loads `can` allows all and
 * the API refuses a role without it (registerPush never throws).
 */
export function usePushRegistration(tree: PushTree = 'admin'): void {
  useNotificationHandling(tree);
  const allowed = usePermissions()('notifications.push');
  useEffect(() => {
    if (allowed) void registerPush();
  }, [allowed]);
}
