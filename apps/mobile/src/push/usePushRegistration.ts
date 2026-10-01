import { useEffect } from 'react';
import { registerPush } from './registerPush';

/**
 * Mount once in the admin-only tree (app/(tabs)/_layout.tsx renders only for admins), so every
 * sign-in and every cold start with a saved admin session registers this device. R-MOB-01.
 */
export function usePushRegistration(): void {
  useEffect(() => {
    void registerPush();
  }, []);
}
