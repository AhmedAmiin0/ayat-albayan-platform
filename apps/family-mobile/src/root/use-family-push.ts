import { useQuery } from '@tanstack/react-query';
import { registerPush } from '@ab/mobile-kit';

/** docs/50 §6, R-MOB-01: registerPush never throws; a 403 is ignored; registers on every start. */
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
