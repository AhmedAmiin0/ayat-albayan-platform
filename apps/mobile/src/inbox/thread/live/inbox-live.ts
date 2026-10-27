import { createInboxLive, type LiveKey } from '@ab/client-core';
import { useEffect, useSyncExternalStore } from 'react';

/** The app's one live state (docs/12 §15): realtime up or not, what is on screen. */
export const inboxLive = createInboxLive();

/** Whether the realtime channel is SUBSCRIBED: the polls slow to INBOX_FALLBACK_MS while it is. */
export function useInboxLive(): boolean {
  return useSyncExternalStore(inboxLive.subscribe, inboxLive.isLive);
}

/**
 * `key` refreshes on its events while `onScreen`; under another screen a change waits for its return.
 * null: this mount is not a live target (a picker), so it neither watches nor forgets the key.
 */
export function useLiveWatch(key: LiveKey | null, onScreen: boolean): void {
  useEffect(() => (key && onScreen ? inboxLive.watch(key) : undefined), [key, onScreen]);
  useEffect(() => (key ? () => inboxLive.forget(key) : undefined), [key]);
}
