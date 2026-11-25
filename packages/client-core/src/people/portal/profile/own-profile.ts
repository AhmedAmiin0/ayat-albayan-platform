import { z } from 'zod';
import type { ApiClient } from '../../../core/http';

// GET /me/profile (R-ACC-01) as the family pages read it: who signed in, never a secret.

/** The fields the family profile shows; the rest of the answer (the role) is dropped. */
const ownProfileSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string().nullable(),
  phone_e164: z.string().nullable(),
  /** A short-lived signed URL of the photo, or null (the initials). */
  avatar_url: z.string().nullable(),
});

export type OwnProfile = z.infer<typeof ownProfileSchema>;

/** The key /me/profile is read under (the apps' kits use the same one). */
const OWN_PROFILE_KEY = ['me', 'profile'] as const;

/** useQuery's options for the login's own profile. */
export interface OwnProfileRead {
  queryKey: string[];
  queryFn: () => Promise<OwnProfile>;
  staleTime: number;
}

/** useQuery's options for the login's own profile, parsed (rule 12). */
export const ownProfileQuery = (client: Pick<ApiClient, 'apiFetch'>): OwnProfileRead => ({
  queryKey: [...OWN_PROFILE_KEY],
  queryFn: async (): Promise<OwnProfile> =>
    ownProfileSchema.parse(await client.apiFetch('/me/profile')),
  // The photo URL is signed for an hour: read again well before it lapses.
  staleTime: 10 * 60_000,
});
