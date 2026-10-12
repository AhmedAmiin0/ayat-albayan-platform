import { useEffect } from 'react';
import { useHolds } from '@/auth/use-permissions';
import { registerPush } from './registerPush';

/**
 * The sales and classroom-assistant trees: register this device for push only once /auth/me lists
 * notifications.push (admin-only by default; a role may be widened to it). Without it nothing
 * happens: no OS permission prompt, no PUT /me/push-tokens, no error UI; a 403 if the grant is
 * withdrawn meanwhile is swallowed by registerPush.
 */
export function usePushWhenHeld(): void {
  const held = useHolds('notifications.push');
  useEffect(() => {
    if (held) void registerPush();
  }, [held]);
}
