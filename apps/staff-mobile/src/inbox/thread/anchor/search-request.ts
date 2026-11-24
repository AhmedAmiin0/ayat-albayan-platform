import { clearComposerDrafts } from '@/inbox/composer/draft-store';
import { clearHeldSends } from '@/inbox/thread/send/pinned-send';
import { listenerSet } from './listeners';

// docs/37 NEW 2: an in-memory one-shot per phone, not route params, to avoid expo-router merges.

const asked = new Set<string>();
const changes = listenerSet();

/** The chat with `phone` opens its search bar (now if it is mounted, else when it opens). */
export function requestSearch(phone: string): void {
  asked.add(phone);
  changes.notify();
}

/** Was a search asked for this chat? Answers true once, then forgets it. */
export function takeSearchRequest(phone: string): boolean {
  return asked.delete(phone);
}

/** Is a search asked for this chat (not taken yet)? */
export const searchAsked = (phone: string): boolean => asked.has(phone);

export const subscribeSearchRequests = changes.subscribe;

/** A sign-out: no chat opens a search the last user asked for. */
function clearSearchRequests(): void {
  asked.clear();
}

/**
 * A sign-out forgets the chats' unsent drafts, any pending search ask and the held (unconfirmed)
 * sends: the next user must never reuse their ids (the `admin:` dedup namespace is shared).
 */
export function clearChatMemory(): void {
  clearComposerDrafts();
  clearSearchRequests();
  clearHeldSends();
}
