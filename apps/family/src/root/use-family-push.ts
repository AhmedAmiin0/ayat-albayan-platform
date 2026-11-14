import { useQuery } from '@tanstack/react-query';
import { registerPush } from '@ab/mobile-kit';

/**
 * Registers this phone for pushes once per run, after a family sign-in or a cold start (docs/50 §6,
 * R-MOB-01). registerPush never throws: no device / permission / Firebase app (this variant until
 * the owner adds it) / «الإشعارات على هذا الجهاز» off → nothing; a 403 while families lack
 * notifications.push is ignored. Never persisted, so every start registers again.
 */
export function useFamilyPush(signedIn: boolean): void {
  useQuery({
    queryKey: ['push', 'family-registration'],
    queryFn: async () => {
      await registerPush();
      return true;
    },
    enabled: signedIn,
    staleTime: Infinity,
    retry: false,
    meta: { noPersist: true },
  });
}
