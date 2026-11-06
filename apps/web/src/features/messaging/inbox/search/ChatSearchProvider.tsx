import { CHAT_SEARCH_CLOSED, chatSearchReducer } from '@ab/client-core';
import type { ThreadDetail } from '@ab/shared';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useReducer, type ReactNode } from 'react';
import { threadQuery } from '@/features/messaging/inbox/api/api';
import { useChatAnchor } from '@/features/messaging/inbox/shared/chat-anchor';
import { ChatSearchContext, type ChatSearchValue } from './search-context';
import { toNewest } from './to-newest';
import { useSearchResults } from './use-search-results';
import { useSearchSteps } from './use-search-steps';

export interface ChatSearchProviderProps {
  phone: string;
  children: ReactNode;
}

/**
 * «بحث» inside the open chat (owner 2026-11-02), as WhatsApp: the header's button opens a bar,
 * typing (debounced) asks the API, the bubbles light up the words. Each step sets the chat's
 * anchor (the URL's `msg`, docs/37): ThreadPane's log scrolls to a hit it shows, or opens the
 * window around it with one request. Closing goes back to the live chat at its newest message.
 */
export function ChatSearchProvider({ phone, children }: ChatSearchProviderProps) {
  const [state, dispatch] = useReducer(chatSearchReducer, CHAT_SEARCH_CLOSED);
  const { query, ...found } = useSearchResults(phone, state);
  const { hits, total } = found;
  const { anchor } = useChatAnchor();
  const client = useQueryClient();
  useSearchSteps({ hits, index: state.index, more: query, seek: anchor });
  const value: ChatSearchValue = {
    ...found,
    state,
    open: () => dispatch({ type: 'open' }),
    close: () => {
      dispatch({ type: 'close' });
      anchor(undefined);
      // The live chat's newest row (read, not observed: ThreadPane's query polls the chat).
      const live = client.getQueryData<InfiniteData<ThreadDetail>>(threadQuery(phone).queryKey);
      toNewest(live?.pages[0]?.messages.at(-1)?.id);
    },
    type: (text) => dispatch({ type: 'type', text }),
    step: (dir) => dispatch({ type: 'step', dir, total }),
  };
  return <ChatSearchContext value={value}>{children}</ChatSearchContext>;
}
