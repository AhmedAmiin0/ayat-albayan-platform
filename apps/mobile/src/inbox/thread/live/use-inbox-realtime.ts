import { connectInboxLive, createLiveSession, INBOX_INACTIVE_LEAVE_MS, type LiveTargets } from '@ab/client-core';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/core/lib/http/supabase';
import { queryClient as client } from '@/core/lib/query/query-client';
import { nudgeInboxStore } from '@/inbox/thread/local/store-session';
import { refreshOpenChat } from './live-refresh';
import { inboxLive } from './inbox-live';
import { changeLists } from './list-marks';

const active = () => AppState.currentState === 'active';

/** An event re-reads the open chat, the chats list and the badge; never while the app is not active. */
// Every event also syncs the phone store (docs/43 43-7; its engine throttles to one a second).
const targets: LiveTargets = {
  chat: (phone) => {
    nudgeInboxStore();
    if (active()) void refreshOpenChat(client, phone);
  },
  // Shown lists re-read with the last word (a read in flight is followed by a fresh one, docs/43
  // AU1); hidden ones are only marked (list-marks.ts). Throttled to one per 3 s.
  list: () => {
    nudgeInboxStore();
    if (active()) changeLists(client);
  },
  badge: () => {
    nudgeInboxStore();
    if (active()) void client.invalidateQueries({ queryKey: ['threads', 'nav-count'] }, { cancelRefetch: false });
  },
};

/**
 * Back to 'active' with the channel still joined, nothing re-reads here: resumeInbox (mounted
 * by the same trees, useNotificationHandling) already re-reads every chat, list and the badge
 * then (docs/43 AU3: one resume path). A fresh join still resyncs on SUBSCRIBED.
 */
const noResync = (): void => undefined;

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
    const open = () => connectInboxLive(supabase, inboxLive, targets);
    const session = createLiveSession(open, noResync);
    const at = AppState.currentState; // 'unknown' at an iOS cold start counts as open
    if (at !== 'background') session.resume();
    if (at === 'inactive') session.pause(INBOX_INACTIVE_LEAVE_MS);
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
