import { ownProfileQuery } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@ab/web-kit/http';

const ownProfile = ownProfileQuery({ apiFetch });

/** GET /me/profile (R-ACC-01), parsed: the name, number, email and photo of who signed in. */
export function useOwnProfile() {
  return useQuery(ownProfile);
}
