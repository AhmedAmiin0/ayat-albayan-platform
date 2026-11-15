import type { ChatSearchControls } from '@ab/client-core';
import { createContext, use } from 'react';

/**
 * The open chat's «بحث» (ChatSearchProvider): its bar, its hits and the words to light up. A hit
 * the chat cannot reach is said in the log's status line (useThreadLog's `lost`, docs/37).
 */
export type ChatSearchValue = ChatSearchControls;

export const ChatSearchContext = createContext<ChatSearchValue | null>(null);

/** null outside a chat (a bubble rendered alone, the channel's chat). */
export const useChatSearch = (): ChatSearchValue | null => use(ChatSearchContext);
