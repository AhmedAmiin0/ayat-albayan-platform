import { meLocaleOf } from '@ab/client-core';
import { hashKey, type QueryCacheNotifyEvent, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { meQuery } from '../../auth/use-permissions';
import { followProfileLocale } from './profile-locale';

/** Not a restored copy (may predate a language switch and revert it), nor a manual setQueryData. */
const isLiveSuccess = (event: QueryCacheNotifyEvent): boolean =>
  event.type === 'updated' && event.action.type === 'success' && event.action.manual !== true;

/**
 * After sign-in: the language of the login (GET /auth/me `locale`) when it differs from this run's
 * (followProfileLocale: save, reload). It listens to the query cache instead of observing the
 * query: the root re-renders for nothing, and no render is left pending when a refetch lands late.
 * The root's useMeReady fetches /auth/me. Mounted once in each app's root, inside the provider.
 */
export function useProfileLocaleSync(signedIn: boolean): void {
  const client = useQueryClient();
  useEffect(() => {
    if (!signedIn) return undefined;
    const me = hashKey(meQuery().queryKey); // read here, not at import: tests mock use-permissions
    return client.getQueryCache().subscribe((event) => {
      const live = isLiveSuccess(event) && event.query.queryHash === me;
      if (live) void followProfileLocale(meLocaleOf(event.query.state.data));
    });
  }, [client, signedIn]);
}
