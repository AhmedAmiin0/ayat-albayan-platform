import { connectInboxLive } from '@ab/client-core';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/core/lib/http/supabase';
import { queryClient as client } from '@/core/lib/query/query-client';
import { threadPollKey } from '../hooks/thread-poll';
import { inboxLive } from './inbox-live';

/**
 * The staff inbox's realtime nudge (owner 2026-10-27), mounted once by the admin and sales tab trees
 * (never the teacher's, the family's or the assistant's): the private 'inbox:staff' channel while the
 * app is open, the push when it is closed. An event re-reads the open chat's newest page through
 * useThreadPoll's own query (its merge, its yield to a send, its gap rule), the chats list and the
 * badge; in the background nothing is fetched, and back in the foreground everything on screen once.
 * Unmount (sign-out flips the tree) leaves the channel. The app's one (persisted) query client.
 */
export function useInboxRealtime(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const active = () => AppState.currentState === 'active';
    const stop = connectInboxLive(supabase, inboxLive, {
      chat: (phone) => {
        if (active()) void client.refetchQueries({ queryKey: threadPollKey(phone) });
      },
      // An in-flight read (the foreground refetch, the fallback) is joined, not repeated.
      list: () => {
        if (active()) void client.refetchQueries({ queryKey: ['threads', 'list'], type: 'active' }, { cancelRefetch: false });
      },
      badge: () => {
        if (active()) void client.invalidateQueries({ queryKey: ['threads', 'nav-count'] }, { cancelRefetch: false });
      },
    });
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') inboxLive.resync();
    });
    return () => {
      foreground.remove();
      stop();
    };
  }, [enabled]);
}
