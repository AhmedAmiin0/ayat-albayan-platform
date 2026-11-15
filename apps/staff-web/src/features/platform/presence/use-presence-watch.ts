import { presenceWatchKey, watchPresence, type PresenceWatch } from '@ab/client-core';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/http/supabase';

const IDLE: PresenceWatch = { live: false, online: new Set() };

/**
 * Who of `profileIds` is online now (docs/33 §1.1): subscribes, never tracks, to each person's
 * topic (at most PRESENCE_WATCH_MAX); leaves on unmount or when the people (not their order)
 * change. Until the socket answers (or without Realtime) `live` is false and the callers fall back
 * to last seen.
 */
export function usePresenceWatch(profileIds: readonly string[]): PresenceWatch {
  const key = presenceWatchKey(profileIds);
  const [state, setState] = useState<{ key: string; watch: PresenceWatch }>({ key: '', watch: IDLE });
  useEffect(() => {
    if (!key) return;
    const onChange = (watch: PresenceWatch) => setState({ key, watch });
    return watchPresence(supabase, { profileIds: key.split(','), onChange });
  }, [key]);
  return state.key === key ? state.watch : IDLE;
}
