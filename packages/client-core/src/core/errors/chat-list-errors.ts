import { chatListErrorSchema } from '@ab/shared';
import { z } from 'zod';
import { ApiError } from '../http';

// The words for a failed chat-list call (docs/22 §3), shared by both apps (docs/27 E6). Each app
// injects its `t.inbox.lists`, read on every call (the admins' translation overrides land after import).

/** The app's `t.inbox.lists` (only these four lines are read). */
export interface ChatListErrorText {
  limit: string;
  nameTaken: string;
  notFound: string;
  saveError: string;
}

const listConflict = z.object({ code: chatListErrorSchema });

/** The 409s (a taken name, the 30-list cap), a list deleted meanwhile (404), else the generic save error. */
export function chatListErrorWords(text: () => ChatListErrorText): (error: unknown) => string {
  return (error) => {
    const words = text();
    if (error instanceof ApiError) {
      const conflict = listConflict.safeParse(error.body);
      if (conflict.success)
        return conflict.data.code === 'list_limit' ? words.limit : words.nameTaken;
      if (error.status === 404) return words.notFound;
    }
    return words.saveError;
  };
}
