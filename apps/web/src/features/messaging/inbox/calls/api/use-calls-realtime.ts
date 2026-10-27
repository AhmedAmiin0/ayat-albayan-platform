import { isCallsData, subscribeCalls } from '@ab/client-core';
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
    return subscribeCalls(supabase, () => void client.invalidateQueries({ queryKey: CALLS_KEY, predicate: isCallsData }));
  }, [enabled, client]);
}
