import type { ChatSearchState, SearchStep } from '@ab/client-core';
import type { ChatSearchHit } from '@ab/shared';
import { createContext, use } from 'react';

/** The open chat's «بحث» (ChatSearchProvider): its bar, its hits and the words to light up. */
export interface ChatSearchValue {
  state: ChatSearchState;
  /** The settled words: the bubbles mark them; '' while closed or not asked yet. */
  q: string;
  hits: readonly ChatSearchHit[];
  total: number;
  searching: boolean;
  failed: boolean;
  /** Bumped by each close: the list goes back to the newest message. */
  closed: number;
  open: () => void;
  close: () => void;
  type: (text: string) => void;
  step: (dir: SearchStep) => void;
}

export const ChatSearchContext = createContext<ChatSearchValue | null>(null);

/** null outside a chat screen (a bubble rendered alone). */
export const useChatSearch = (): ChatSearchValue | null => use(ChatSearchContext);
