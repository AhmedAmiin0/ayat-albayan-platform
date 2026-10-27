// The inbox's live nudge (owner 2026-10-27: Supabase Realtime while the app is open, push when it is
// closed, a slow poll as the fallback). The database broadcasts ONE event per changed phone on a
// private topic; a client never reads data from it, it only re-reads the same API routes sooner.

/** The private Broadcast topic (realtime.messages policy: admin and sales with inbox.read). */
export const INBOX_LIVE_TOPIC = 'inbox:staff';
/** Sent once per phone per insert / update statement on messages (migration 20261028000860). */
export const INBOX_LIVE_EVENT = 'thread_changed';

/** While the channel is SUBSCRIBED the open chat, the chats list and the badge re-read only this often. */
export const INBOX_FALLBACK_MS = 60_000;
/** A burst of events becomes one fetch now and one at the end: an open chat at most once a second… */
export const LIVE_CHAT_THROTTLE_MS = 1_000;
/** …the chats list and the unread badge at most once every 3 s (GET /threads is the costliest read). */
export const LIVE_LIST_THROTTLE_MS = 3_000;

/** What a change refreshes: the chats list, one open chat, the unread badge. */
export type LiveKey = 'list' | 'badge' | `chat:${string}`;

export const chatLiveKey = (phone: string): LiveKey => `chat:${phone}`;

/** The phone of a chat key; null for the list and the badge. */
export const phoneOfKey = (key: LiveKey): string | null => (key.startsWith('chat:') ? key.slice(5) : null);

const E164 = /^\+[1-9]\d{6,14}$/;

/** The event's phone (its only field), or null for anything else: a malformed event refreshes nothing. */
export function changedPhone(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const phone = (payload as { phone?: unknown }).phone;
  return typeof phone === 'string' && E164.test(phone) ? phone : null;
}

/**
 * The event → refresh decision: the unread badge always; the chats list always; the chat of that phone
 * (it refreshes only if it is open, see createLiveRegistry). Another phone's chat never.
 */
export function refreshPlan(phone: string): LiveKey[] {
  return ['badge', 'list', chatLiveKey(phone)];
}

/** A refresh interval: the slow fallback while realtime is connected, the caller's poll while it is not. */
export function liveInterval(live: boolean, offline: number): number {
  return live ? INBOX_FALLBACK_MS : offline;
}

/** How far apart one key's fetches stay. */
export function throttleMsOf(key: LiveKey): number {
  return phoneOfKey(key) === null ? LIVE_LIST_THROTTLE_MS : LIVE_CHAT_THROTTLE_MS;
}
