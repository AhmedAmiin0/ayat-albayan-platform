import { isCallsData, subscribeCalls } from '@ab/client-core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/core/lib/http/supabase';
import { CALLS_KEY } from './calls-api';

/**
 * A nudge, not a data path (docs/28 §4): a change to a wa_calls row the user may read (RLS) makes the
 * calls queries re-read through the API (@ab/client-core subscribeCalls). While the app is in the
 * background (`active` false) nothing is subscribed.
 */
export function useCallsRealtime(input: { enabled: boolean; active: boolean }): void {
  const client = useQueryClient();
  const on = input.enabled && input.active;
  useEffect(() => {
    if (!on) return;
    return subscribeCalls(supabase, () => void client.invalidateQueries({ queryKey: CALLS_KEY, predicate: isCallsData }));
  }, [on, client]);
}
