import { chatLiveKey, connectInboxLive, createInboxLive } from '@ab/client-core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/http/supabase';

/**
 * The inbox's realtime nudge on the web (docs/12 §15), shared logic in @ab/client-core: the private
 * 'inbox:staff' channel joined by the admin and sales shells (never the teacher's). While it is
 * SUBSCRIBED the inbox polls slow to INBOX_FALLBACK_MS; otherwise they keep INBOX_REFRESH_MS.
 */
export const inboxLive = createInboxLive();

/** Re-renders on a connect / drop, so the queries' refetchInterval functions are read again. */
export function useInboxLive(): boolean {
  return useSyncExternalStore(inboxLive.subscribe, inboxLive.isLive);
}

/** The open chat: its events re-read it (only while this window has focus: opening marks it read). */
export function useLiveChat(phone: string): void {
  useInboxLive();
  useEffect(() => {
    const release = inboxLive.watch(chatLiveKey(phone));
    return () => {
      release();
      inboxLive.forget(chatLiveKey(phone));
    };
  }, [phone]);
}

/**
 * Mounted once by a staff shell. A web page shows only mounted queries, so the list and the badge
 * always count as on screen: an event re-reads the mounted ['threads', 'list'] and nav counts.
 */
export function useInboxRealtime(enabled: boolean): void {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled) return undefined;
    const list = inboxLive.watch('list');
    const stop = connectInboxLive(supabase, inboxLive, {
      chat: (phone) => {
        // cancelRefetch false: an older page being loaded is joined, not cancelled.
        const filters = { queryKey: ['threads', 'detail', phone], type: 'active' } as const;
        if (document.hasFocus()) void client.refetchQueries(filters, { cancelRefetch: false });
      },
      // A hidden tab waits: TanStack re-reads the stale list when it is shown again.
      list: () => {
        const filters = { queryKey: ['threads', 'list'], type: 'active' } as const;
        if (document.visibilityState === 'visible') void client.refetchQueries(filters, { cancelRefetch: false });
      },
      badge: () => void client.invalidateQueries({ queryKey: ['threads', 'nav-count'] }, { cancelRefetch: false }),
    });
    return () => {
      stop();
      list();
    };
  }, [enabled, client]);
}
