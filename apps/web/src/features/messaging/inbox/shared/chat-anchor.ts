import { createContext, use } from 'react';

// The open chat's anchor (docs/37 NEW 3): the URL's `msg`, a search hit the chat opens at. The
// inbox page provides it from its route state; outside it (a bubble rendered alone) nothing moves.

export interface ChatAnchor {
  /** The hit the chat shows (undefined = the live chat at its newest message). */
  msg: string | undefined;
  /** Moves the open chat to a hit, or (undefined) back to the live chat; no history entry. */
  anchor: (id: string | undefined) => void;
  /** Opens another chat at a hit (the list's «الرسائل»), keeping the list's search. */
  open: (to: { phone: string; msg: string }) => void;
}

const NONE: ChatAnchor = { msg: undefined, anchor: () => undefined, open: () => undefined };

export const ChatAnchorContext = createContext<ChatAnchor>(NONE);

export const useChatAnchor = (): ChatAnchor => use(ChatAnchorContext);
