// The inbox's live nudge (owner 2026-10-27: Supabase Realtime while the app is open, push when it is
// closed, a slow poll as the fallback). The database broadcasts ONE event per changed phone on a
// private topic; a client never reads data from it, it only re-reads the same API routes sooner.

import { THREAD_FULL_MS } from '../channels/index.js';

/** The private Broadcast topic (realtime.messages policy: admin and sales with inbox.read). */
export const INBOX_LIVE_TOPIC = 'inbox:staff';
/** Sent once per phone per insert / update statement on messages (migration 20261028000860). */
export const INBOX_LIVE_EVENT = 'thread_changed';

/**
 * While the channel is SUBSCRIBED the open chat, the chats list and the badge still re-read this
 * often: a safety net for a socket that died quietly (mobile networks) while it still reads
 * SUBSCRIBED (owner 2026-11-06 «chat is slow»: up to a minute at 60 s). Events re-read sooner.
 */
export const INBOX_FALLBACK_MS = 20_000;
/** A burst of events becomes one fetch now and one at the end: an open chat at most once a second… */
export const LIVE_CHAT_THROTTLE_MS = 1_000;
/** …the chats list and the unread badge at most once every 3 s (GET /threads is the costliest read). */
export const LIVE_LIST_THROTTLE_MS = 3_000;

/** A hidden web tab leaves the channel after this long (shown again: rejoin, resync). */
export const INBOX_HIDDEN_LEAVE_MS = 5 * 60_000;
/** iOS 'inactive' (app switcher, control centre) longer than this leaves too; 'background' at once. */
export const INBOX_INACTIVE_LEAVE_MS = 5_000;

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
 * The event → refresh decision: the chats list always; the chat of that phone (it refreshes
 * only if it is open, see createLiveRegistry), another phone's chat never; the unread badge
 * unless `chatOwnsBadge` (docs/43 AU6: the open chat's own re-read stamps a new message read
 * and refreshes the badge itself, so its outgoing ticks never re-read the badge).
 */
export function refreshPlan(phone: string, chatOwnsBadge = false): LiveKey[] {
  const chat = chatLiveKey(phone);
  return chatOwnsBadge ? ['list', chat] : ['badge', 'list', chat];
}

/** A refresh interval: the slow fallback while realtime is connected, the caller's poll while it is not. */
export function liveInterval(live: boolean, offline: number): number {
  return live ? INBOX_FALLBACK_MS : offline;
}

/**
 * While realtime is connected an open chat re-reads its whole newest page only this often (docs/43
 * AU5): events and the INBOX_FALLBACK_MS delta carry new rows, ticks, edits and deletes; this slow
 * read only catches what a delta never carries (a customer's reaction, an old row's tick, people).
 */
export const THREAD_FULL_LIVE_MS = 5 * 60_000;

/** The open chat's whole-page re-read: slow while realtime is up, THREAD_FULL_MS otherwise. */
export function fullReadInterval(live: boolean): number {
  return live ? THREAD_FULL_LIVE_MS : THREAD_FULL_MS;
}

/** How far apart one key's fetches stay. */
export function throttleMsOf(key: LiveKey): number {
  return phoneOfKey(key) === null ? LIVE_LIST_THROTTLE_MS : LIVE_CHAT_THROTTLE_MS;
}
