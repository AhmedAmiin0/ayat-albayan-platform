import { useMyProfile } from '@ab/mobile-kit';
import { usePortalMe } from '@/portal';

/**
 * GET /me/profile and /portal/me as one read: whole only when both are in, so a student never
 * shows as a guardian for a moment. Retry and pull read both again.
 */
export function useProfileScreen() {
  const profile = useMyProfile();
  const me = usePortalMe();
  const data = profile.data && me.data ? { profile: profile.data, me: me.data } : undefined;
  return {
    data,
    isError: profile.isError || me.isError,
    refetch: () => Promise.all([profile.refetch(), me.refetch()]),
  };
}
