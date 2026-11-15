import {
  CHAT_SEARCH_CLOSED,
  chatSearchReducer,
  type SearchStep,
} from '@ab/client-core';
import { type ReactNode, useReducer, useState } from 'react';
import { useSearchRequest } from '@/inbox/thread/anchor';
import { useChatSearchResults } from './chat-search-api';
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
  const typing = state.text.trim() !== text.settled;
  const found = useChatSearchResults({ phone, q, typing, index: state.index });
  const step = (dir: SearchStep) => dispatch({ type: 'step', dir, total: found.total });
  const close = () => {
    dispatch({ type: 'close' });
    text.reset();
    setClosed((n) => n + 1);
  };
  useSearchBack(state.open, close);
  // «بحث في الرسائل» on the student's details: the bar opens here (docs/37 NEW 2).
  useSearchRequest(phone, () => dispatch({ type: 'open' }));
  const value: ChatSearchValue = {
    ...found,
    ...{ state, q, closed, step, close },
    open: () => dispatch({ type: 'open' }),
    type: (typed) => {
      dispatch({ type: 'type', text: typed });
      text.settle(typed);
    },
  };
  return <ChatSearchContext value={value}>{children}</ChatSearchContext>;
}
