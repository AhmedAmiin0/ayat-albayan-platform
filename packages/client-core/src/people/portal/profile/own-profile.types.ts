import type { AccountProfile } from '@ab/shared';

/** GET /me/profile as the family pages read it: who signed in, never a secret. */
export type OwnProfile = AccountProfile;

/** useQuery's options for the login's own profile. */
export interface OwnProfileRead {
  queryKey: string[];
  queryFn: () => Promise<OwnProfile>;
  staleTime: number;
}
