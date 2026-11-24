import type { ChatSearchControls } from '@ab/client-core';
import { createContext, use } from 'react';

/** A hit the chat cannot reach is reported in the log's status line (docs/37). */
export type ChatSearchValue = ChatSearchControls;

export const ChatSearchContext = createContext<ChatSearchValue | null>(null);

/** null outside a chat (a bubble rendered alone, the channel's chat). */
export const useChatSearch = (): ChatSearchValue | null => use(ChatSearchContext);
