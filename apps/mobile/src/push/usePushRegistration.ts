import { useEffect } from 'react';
import { registerPush } from './registerPush';
import { useNotificationHandling } from './useNotificationHandling';

/**
 * Mount once in the admin-only tree (app/(tabs)/_layout.tsx renders only for admins), so every
 * sign-in and every cold start with a saved admin session registers this device, and admin pushes
 * show in the foreground and open their screen when tapped. R-MOB-01.
 */
export function usePushRegistration(): void {
  useNotificationHandling();
  useEffect(() => {
    void registerPush();
  }, []);
}
