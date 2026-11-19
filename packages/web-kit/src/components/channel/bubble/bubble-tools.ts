import type { ChannelMessageView } from '@ab/shared';
import { createContext, use } from 'react';

/**
 * What the open thread lets a bubble do beyond its own edit and delete: «ردّ» (the composer's
 * reply bar) and «معلومات الرسالة» (who read it). A bubble outside a thread offers neither.
 */
export interface BubbleTools {
  reply: (message: ChannelMessageView) => void;
  info: (message: ChannelMessageView) => void;
}

export const BubbleToolsContext = createContext<BubbleTools | null>(null);

/** The thread's tools, or null (a bubble shown alone: edit and delete only). */
export const useBubbleTools = (): BubbleTools | null => use(BubbleToolsContext);
