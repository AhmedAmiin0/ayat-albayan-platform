import type { ChannelMessageView } from '@ab/shared';
import { createContext, use } from 'react';

/** A bubble outside a thread offers neither reply nor info. */
export interface BubbleTools {
  reply: (message: ChannelMessageView) => void;
  info: (message: ChannelMessageView) => void;
}

export const BubbleToolsContext = createContext<BubbleTools | null>(null);

/** The thread's tools, or null (a bubble shown alone: edit and delete only). */
export const useBubbleTools = (): BubbleTools | null => use(BubbleToolsContext);
