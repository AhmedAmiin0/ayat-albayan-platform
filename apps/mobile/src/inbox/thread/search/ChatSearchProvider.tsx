import {
  CHAT_SEARCH_CLOSED,
  chatSearchReducer,
  needsSearchPage,
  searchHits,
  stepIndex,
  type SearchStep,
} from '@ab/client-core';
import { type ReactNode, useReducer, useState } from 'react';
import { useChatSearchQuery } from './chat-search-api';
import { ChatSearchContext, type ChatSearchValue } from './search-context';
import { useSearchBack } from './use-search-back';
import { useSettledText } from './use-settled-text';

/**
 * «بحث» inside the open chat (owner 2026-11-02), as WhatsApp: the header's «بحث» turns the header
 * into a search field, typing (debounced) asks the API, each step jumps to its message
 * (useSearchJump in the list) and the bubbles light up the words; back closes it and returns to
 * the newest message. Lives with ChatActionsProvider, keyed by the phone.
 */
export function ChatSearchProvider({ phone, children }: { phone: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(chatSearchReducer, CHAT_SEARCH_CLOSED);
  const [closed, setClosed] = useState(0);
  const text = useSettledText();
  const q = state.open ? text.settled : '';
  const query = useChatSearchQuery(phone, q);
  const { hits, total } = searchHits(query.data?.pages);
  // A step past the loaded hits asks for the next page (the list jumps once it arrives).
  const step = (dir: SearchStep) => {
    dispatch({ type: 'step', dir, total });
    const past = needsSearchPage(stepIndex(state.index, dir, total), hits.length);
    if (past && query.hasNextPage) void query.fetchNextPage({ cancelRefetch: false });
  };
  const close = () => {
    dispatch({ type: 'close' });
    text.reset();
    setClosed((n) => n + 1);
  };
  useSearchBack(state.open, close);
  const value: ChatSearchValue = {
    ...{ state, q, hits, total, closed, step, close },
    searching: q !== '' && query.isPending,
    failed: query.isError,
    open: () => dispatch({ type: 'open' }),
    type: (typed) => {
      dispatch({ type: 'type', text: typed });
      text.settle(typed);
    },
  };
  return <ChatSearchContext value={value}>{children}</ChatSearchContext>;
}
