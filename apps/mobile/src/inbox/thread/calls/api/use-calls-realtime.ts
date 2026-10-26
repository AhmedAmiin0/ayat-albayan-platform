import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/core/lib/http/supabase';
import { CALLS_KEY } from './calls-api';

type Channel = ReturnType<typeof supabase.channel>;

/**
 * A nudge, not a data path (docs/28 §4): a change to a wa_calls row the user may read (RLS) makes the
 * calls queries re-read through the API. The polls keep working when realtime is unreachable; while
 * the app is in the background (`active` false) nothing is subscribed.
 */
export function useCallsRealtime(input: { enabled: boolean; active: boolean }): void {
  const client = useQueryClient();
  const on = input.enabled && input.active;
  useEffect(() => {
    if (!on || typeof supabase.channel !== 'function') return;
    let channel: Channel | null = null;
    try {
      channel = supabase
        // A topic of its own: a quick resubscribe never reuses the channel that is still leaving.
        .channel(`wa_calls:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_calls' }, () => {
          void client.invalidateQueries({ queryKey: CALLS_KEY, predicate: (q) => q.queryKey[1] !== 'config' });
        })
        .subscribe();
    } catch {
      channel = null;
    }
    return () => {
      if (channel) void supabase.removeChannel(channel).catch(() => undefined);
    };
  }, [on, client]);
}
