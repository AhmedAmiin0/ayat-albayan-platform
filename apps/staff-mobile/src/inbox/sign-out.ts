import { clearChatMemory } from './thread/anchor';
import { stopInboxStore } from './thread/local';

/**
 * Signed out: the chats' unsent drafts and a pending search ask (review 2026-10-29 #4), and the
 * phone's message store, wiped with the session (docs/43 43-7).
 */
export function clearInboxOnSignOut(): void {
  clearChatMemory();
  void stopInboxStore();
}
