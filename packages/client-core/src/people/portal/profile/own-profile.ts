import { accountRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { OwnProfileRead } from './own-profile.types';

/** The key /me/profile is read under (the apps' kits use the same one). */
const OWN_PROFILE_KEY = ['me', 'profile'] as const;

/** useQuery's options for the login's own profile (R-ACC-01), parsed by its route. */
export const ownProfileQuery = (client: ApiClient): OwnProfileRead => {
  const call = callWith(client);
  return {
    queryKey: [...OWN_PROFILE_KEY],
    queryFn: () => call({ route: accountRoutes.profile }),
    // The photo URL is signed for an hour: read again well before it lapses.
    staleTime: 10 * 60_000,
  };
};
