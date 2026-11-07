import {
  applyLiveRows,
  chatLiveKey,
  chatStatus,
  connectInboxLive,
  createLiveSession,
  INBOX_INACTIVE_LEAVE_MS,
  isRanked,
  type LiveRow,
  type LiveTargets,
} from '@ab/client-core';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/core/lib/http/supabase';
import { queryClient as client } from '@/core/lib/query/query-client';
import { threadKey, type ThreadCache } from '@/inbox/thread/hooks/thread-cache';
import { nudgeInboxStore, patchInboxStore } from '@/inbox/thread/local/store-session';
import { refreshOpenChat } from './live-refresh';
import { inboxLive } from './inbox-live';
import { changeLists } from './list-marks';

const active = () => AppState.currentState === 'active';

/** Every row is a tick move of an outbound row the OPEN chat already shows (its read cache). */
function settledInOpenChat(phone: string, rows: readonly LiveRow[]): boolean {
  const open = inboxLive.isWatched(chatLiveKey(phone));
  const chat = open ? client.getQueryData<ThreadCache>(threadKey(phone)) : undefined;
  return applyLiveRows(rows, (id) => chatStatus(chat, id)).complete;
}

/**
 * docs/44 K1: an event's ticks go straight into the phone store, which the chat and the list read
 * (their ranked overlay: no HTTP). Only tick moves of outbound rows the open chat shows settle
 * there: a row the chat lacks (even one a sync already stored), an inbound row (the read stamps
 * it), a queued one (a retry of a failed row: the overlay shows ranked ticks only), failed and sent
 * by hand are written too but still re-read.
 */
async function patchStore(phone: string, rows: readonly LiveRow[]): Promise<boolean> {
  const whole = await patchInboxStore(phone, rows);
  return whole && settledInOpenChat(phone, rows) && rows.every((r) => isRanked(r.s));
}

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
    if (active())
      void client.invalidateQueries(
        { queryKey: ['threads', 'nav-count'] },
        { cancelRefetch: false },
      );
  },
  rows: patchStore,
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
