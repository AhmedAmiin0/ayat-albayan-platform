import { ownProfileQuery } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';

const ownProfile = ownProfileQuery({ apiFetch, apiSend });

/** GET /me/profile (R-ACC-01), parsed: the name, number, email and photo of who signed in. */
export function useOwnProfile() {
  return useQuery(ownProfile);
}
