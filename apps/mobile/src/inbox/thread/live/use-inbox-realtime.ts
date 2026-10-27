import { connectInboxLive, createLiveSession, INBOX_INACTIVE_LEAVE_MS, type LiveTargets } from '@ab/client-core';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/core/lib/http/supabase';
import { queryClient as client } from '@/core/lib/query/query-client';
import { threadPollKey } from '../hooks/thread-poll';
import { inboxLive } from './inbox-live';

const active = () => AppState.currentState === 'active';

/** An event re-reads the open chat, the chats list and the badge; never while the app is not active. */
const targets: LiveTargets = {
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
};

/**
 * The staff inbox's realtime nudge (owner 2026-10-27), mounted once by the admin and sales tab trees
 * (never the teacher's, the family's or the assistant's): the private 'inbox:staff' channel while the
 * app is active, the push otherwise. An event re-reads through useThreadPoll's own query (its merge,
 * its yield to a send, its gap rule). In the background the channel is left (and the socket closed when
 * nothing else uses it), so the polls take over and nothing of the inbox stays awake; 'inactive' (iOS)
 * leaves after INBOX_INACTIVE_LEAVE_MS. Back to 'active': one rejoin, one resync on SUBSCRIBED.
 * Unmount (sign-out flips the tree) leaves at once. The app's one (persisted) query client.
 */
export function useInboxRealtime(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    const session = createLiveSession(() => connectInboxLive(supabase, inboxLive, targets), inboxLive.resync);
    if (AppState.currentState !== 'background') session.resume();
    const change = AppState.addEventListener('change', (state) => {
      if (state === 'active') session.resume();
      else session.pause(state === 'inactive' ? INBOX_INACTIVE_LEAVE_MS : 0);
    });
    return () => {
      change.remove();
      session.end();
    };
  }, [enabled]);
}
