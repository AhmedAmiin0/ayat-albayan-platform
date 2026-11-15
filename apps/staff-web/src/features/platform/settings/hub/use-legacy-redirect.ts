import { useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { legacySettingsTarget } from './legacy-target';

/**
 * On mount, sends an old `/admin/settings#…` link on to its new page (replacing the history entry).
 * Returns true while that redirect is under way, so the hub can stay blank instead of flashing
 * (without a router, as in a component test, nothing moves and the hub shows).
 */
export function useLegacySettingsRedirect(): boolean {
  const router = useRouter({ warn: false });
  const [target] = useState(() => legacySettingsTarget(window.location.hash, window.location.search));
  useEffect(() => {
    if (target && router) void router.navigate({ href: target, replace: true });
  }, [router, target]);
  return target !== null && Boolean(router);
}
