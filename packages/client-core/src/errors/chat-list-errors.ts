import { isChatListError } from '@ab/shared';
import { ApiError } from '../http/index.js';

// The words for a failed chat-list call (docs/22 §3), shared by both apps (docs/27 E6). Each app
// injects its `t.inbox.lists`, read on every call (the admins' translation overrides land after import).

/** The app's `t.inbox.lists` (only these four lines are read). */
export interface ChatListErrorText {
  limit: string;
  nameTaken: string;
  notFound: string;
  saveError: string;
}

/** The 409s (a taken name, the 30-list cap), a list deleted meanwhile (404), else the generic save error. */
export function chatListErrorWords(text: () => ChatListErrorText): (error: unknown) => string {
  return (error) => {
    const words = text();
    if (error instanceof ApiError) {
      const code: unknown = typeof error.body === 'object' && error.body !== null ? Reflect.get(error.body, 'code') : null;
      if (isChatListError(code)) return code === 'list_limit' ? words.limit : words.nameTaken;
      if (error.status === 404) return words.notFound;
    }
    return words.saveError;
  };
}
