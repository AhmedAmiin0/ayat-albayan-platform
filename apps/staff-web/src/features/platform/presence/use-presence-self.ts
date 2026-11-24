import { trackSelf } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import { meQuery } from '@/features/people/auth';
import { supabase } from '@ab/web-kit/lib/http/supabase';
import { presenceSelfQuery } from './api';

function onVisibility(listener: () => void): () => void {
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}

const tabVisible = (): boolean => document.visibilityState !== 'hidden';

/** Tracked only while the tab is visible and presence_enabled is on (docs/33 §1.1). */
export function usePresenceSelf(): void {
  const userId = useQuery(meQuery).data?.id ?? '';
  const self = useQuery({ ...presenceSelfQuery, enabled: userId !== '' });
  const visible = useSyncExternalStore(onVisibility, tabVisible);
  const tracks = userId !== '' && self.data?.enabled === true && visible;
  useEffect(() => {
    if (!tracks) return;
    return trackSelf(supabase, userId);
  }, [tracks, userId]);
}
