import { clearComposerDrafts } from '@/inbox/composer/draft-store';
import { listenerSet } from './listeners';

// «بحث في الرسائل» on the student's details (docs/37 NEW 2): the screen asks, goes back, and the
// chat under it (still mounted) opens its search bar. A one-shot per-phone ask, in memory only (a
// store, not route params: it never depends on how expo-router merges params on the way back).

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

/** A sign-out forgets the chats' unsent drafts and any pending search ask together. */
export function clearChatMemory(): void {
  clearComposerDrafts();
  clearSearchRequests();
}
