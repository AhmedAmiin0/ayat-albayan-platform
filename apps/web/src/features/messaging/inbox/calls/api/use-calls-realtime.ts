import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/http/supabase';
import { CALLS_KEY } from './calls-api';

/**
 * A nudge, not a data path (docs/28 §4): a change to a wa_calls row the user may read (RLS) makes
 * the calls queries re-read through the API. The polls keep working when realtime is unreachable.
 */
export function useCallsRealtime(enabled: boolean): void {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('wa_calls')
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
  }, [enabled, client]);
}
