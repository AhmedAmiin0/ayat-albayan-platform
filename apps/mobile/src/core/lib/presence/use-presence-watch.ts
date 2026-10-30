import { type PresenceWatch, watchPresence } from '@ab/client-core';
import { PRESENCE_WATCH_MAX } from '@ab/shared';
import { useEffect, useState } from 'react';
import { supabase } from '@/core/lib/http/supabase';
import { useScreenFocused } from '@/core/ui/connecting/use-screen-focus';
import { useAppActive } from './use-app-active';

const IDLE: PresenceWatch = { live: false, online: new Set<string>() };

/**
 * Who of `profileIds` is online now (docs/33 §1.1): subscribes, never tracks, to their topics while
 * this screen is focused and the app is in the foreground. Not joined (yet) = `live` false, and the
 * caller falls back to last seen (isOnline).
 */
export function usePresenceWatch(profileIds: readonly string[], enabled: boolean): PresenceWatch {
  const focused = useScreenFocused();
  const active = useAppActive();
  const [watch, setWatch] = useState<PresenceWatch>(IDLE);
  // A string, so a new array of the same people keeps the same subscriptions.
  const key = [...new Set(profileIds)].slice(0, PRESENCE_WATCH_MAX).join(',');
  const on = enabled && focused && active && key !== '';
  useEffect(() => {
    if (!on) return undefined;
    const stop = watchPresence(supabase, { profileIds: key.split(','), onChange: setWatch });
    return () => {
      stop();
      setWatch(IDLE);
    };
  }, [on, key]);
  return on ? watch : IDLE;
}
