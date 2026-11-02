import type { ChatSearchState, SearchStep } from '@ab/client-core';
import type { ChatSearchHit } from '@ab/shared';
import { createContext, use } from 'react';

/** The open chat's «بحث» (ChatSearchProvider): its bar, its hits and the words to light up. */
export interface ChatSearchValue {
  state: ChatSearchState;
  /** The settled (debounced, trimmed) words: the bubbles mark them; '' while closed. */
  q: string;
  hits: readonly ChatSearchHit[];
  total: number;
  /** The first page is on its way (the bar says so instead of «لا توجد نتائج»). */
  searching: boolean;
  failed: boolean;
  open: () => void;
  close: () => void;
  type: (text: string) => void;
  step: (dir: SearchStep) => void;
}

export const ChatSearchContext = createContext<ChatSearchValue | null>(null);

/** null outside a chat (a bubble rendered alone, the channel's chat). */
export const useChatSearch = (): ChatSearchValue | null => use(ChatSearchContext);
