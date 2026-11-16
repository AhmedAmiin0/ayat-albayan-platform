import { meLocaleOf } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { meQuery } from '../../auth/use-permissions';
import { followProfileLocale } from './profile-locale';

/**
 * After sign-in: the language of the login (GET /auth/me `locale`) when it differs from this run's
 * (followProfileLocale: save, reload). Only a live answer counts, never the persisted copy of an
 * earlier run, which may predate a «اللغة» switch and would switch straight back. Mounted once in
 * each app's root, inside the query provider.
 */
export function useProfileLocaleSync(signedIn: boolean): void {
  const me = useQuery({ ...meQuery(), enabled: signedIn });
  const profile = signedIn && me.isFetchedAfterMount ? meLocaleOf(me.data) : null;
  useEffect(() => {
    void followProfileLocale(profile);
  }, [profile]);
}
