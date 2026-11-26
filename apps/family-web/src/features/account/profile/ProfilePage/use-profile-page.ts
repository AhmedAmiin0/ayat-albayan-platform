import { useOwnProfile } from '@/features/account/profile/use-own-profile';

export function useProfilePage() {
  const profile = useOwnProfile();
  return { profile };
}
