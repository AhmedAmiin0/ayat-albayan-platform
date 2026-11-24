import type { ChatSearchControls } from '@ab/client-core';
import { createContext, use } from 'react';

export interface ChatSearchValue extends ChatSearchControls {
  /** Bumped by each close: the list goes back to the newest message. */
  closed: number;
}

export const ChatSearchContext = createContext<ChatSearchValue | null>(null);

/** null outside a chat screen (a bubble rendered alone). */
export const useChatSearch = (): ChatSearchValue | null => use(ChatSearchContext);
