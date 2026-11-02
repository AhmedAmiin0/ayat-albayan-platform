import {
  CHAT_SEARCH_CLOSED,
  chatSearchReducer,
} from '@ab/client-core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useReducer, type ReactNode } from 'react';
import { threadQuery } from '@/features/messaging/inbox/api/api';
import { ChatSearchContext, type ChatSearchValue } from './search-context';
import { toNewest } from './to-newest';
import { useSearchResults } from './use-search-results';
import { useSearchSteps } from './use-search-steps';
import { useSeekMessage } from './use-seek-message';

/** ThreadPane's query polls and refreshes the chat: this second observer only reads and pages. */
const QUIET = {
  refetchInterval: false,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
} as const;

export interface ChatSearchProviderProps {
  phone: string;
  children: ReactNode;
}

/**
 * «بحث» inside the open chat (owner 2026-11-02), as WhatsApp: the header's button opens a bar,
 * typing (debounced) asks the API, each step scrolls to its message (loading older pages) and the
 * bubbles light up the words; closing goes back to the newest message. The chat's pages are
 * ThreadPane's own query (one fetch, two observers).
 */
export function ChatSearchProvider({ phone, children }: ChatSearchProviderProps) {
  const [state, dispatch] = useReducer(chatSearchReducer, CHAT_SEARCH_CLOSED);
  const { query, ...found } = useSearchResults(phone, state);
  const { hits, total } = found;
  const chat = useInfiniteQuery({ ...threadQuery(phone), ...QUIET });
  const messages = [...(chat.data?.pages ?? [])].reverse().flatMap((p) => p.messages);
  const seeker = useSeekMessage(messages, chat);
  useSearchSteps({ hits, index: state.index, more: query, seek: seeker.seek });
  const value: ChatSearchValue = {
    ...found,
    state,
    lost: seeker.lost !== null && seeker.lost === hits[state.index]?.id,
    open: () => dispatch({ type: 'open' }),
    close: () => {
      dispatch({ type: 'close' });
      seeker.cancel();
      toNewest(messages.at(-1)?.id);
    },
    type: (text) => dispatch({ type: 'type', text }),
    step: (dir) => dispatch({ type: 'step', dir, total }),
  };
  return <ChatSearchContext value={value}>{children}</ChatSearchContext>;
}
