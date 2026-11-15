import type { AccountProfile } from '@ab/shared';
import { QueryClient, QueryClientContext, queryOptions, useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { apiFetch } from '../http/api';

/** GET /me/profile (R-ACC-01): the caller's own login, whatever the role. */
export const PROFILE_KEY = ['me', 'profile'] as const;

const profileQuery = queryOptions({
  queryKey: PROFILE_KEY,
  queryFn: () => apiFetch<AccountProfile>('/me/profile'),
  // The photo URL is signed for an hour: refetch well before it lapses.
  staleTime: 10 * 60_000,
});

/**
 * Used only where no QueryClientProvider is mounted (a More screen rendered on its own): never
 * fetches.
 */
const idleClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

/**
 * The profile; outside a QueryClientProvider it stays idle instead of throwing
 * (as usePublicConfig).
 */
export function useMyProfile() {
  const client = use(QueryClientContext);
  return useQuery({ ...profileQuery, enabled: client !== undefined }, client ?? idleClient);
}
