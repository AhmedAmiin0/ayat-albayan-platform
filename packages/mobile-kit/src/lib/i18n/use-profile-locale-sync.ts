import { meLocaleOf } from '@ab/client-core';
import { hashKey, type QueryCacheNotifyEvent, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { meQuery } from '../../auth/use-permissions';
import { followProfileLocale } from './profile-locale';

const ME_HASH = hashKey(meQuery().queryKey);

/**
 * A live /auth/me answer: a fetch that succeeded. Not the persisted copy of an earlier run (a
 * restore is no fetch), which may predate a «اللغة» switch and would switch straight back, and not
 * a setQueryData (manual).
 */
const isLiveMe = (event: QueryCacheNotifyEvent): boolean =>
  event.type === 'updated' &&
  event.action.type === 'success' &&
  event.action.manual !== true &&
  event.query.queryHash === ME_HASH;

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
    return client.getQueryCache().subscribe((event) => {
      if (isLiveMe(event)) void followProfileLocale(meLocaleOf(event.query.state.data));
    });
  }, [client, signedIn]);
}
