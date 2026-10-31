import { PRESENCE_SELF_PATH, presenceSelfKey, trackSelf } from '@ab/client-core';
import type { PresenceSelf } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiFetch } from '@/core/lib/http/api';
import { supabase } from '@/core/lib/http/supabase';
import { useAppActive } from './use-app-active';

/** The setting rarely changes: read once in a while, not per screen. */
const SELF_STALE_MS = 15 * 60_000;

/**
 * Online now for everyone else (docs/33 §1.1): the signed-in user tracks their own presence topic
 * while the app is in the foreground and presence_enabled is on; the app going to the background,
 * the sign-out ('' id) or the unmount leaves it. Mounted once, in the root layout.
 */
export function usePresenceSelf(profileId: string): void {
  const active = useAppActive();
  const self = useQuery({
    queryKey: presenceSelfKey,
    queryFn: () => apiFetch<PresenceSelf>(PRESENCE_SELF_PATH),
    enabled: profileId !== '',
    staleTime: SELF_STALE_MS,
  });
  const on = profileId !== '' && active && self.data?.enabled === true;
  useEffect(() => {
    if (!on) return undefined;
    return trackSelf(supabase, profileId);
  }, [on, profileId]);
}
