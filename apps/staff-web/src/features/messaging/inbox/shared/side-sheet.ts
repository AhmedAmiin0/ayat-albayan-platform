import { createContext, use } from 'react';

/**
 * Closes the phone-width side sheet (ThreadSideSheet) from inside its panel: «بحث في الرسائل»
 * shows the chat again. null beside the chat on wide screens (nothing to close).
 */
export const SideSheetCloseContext = createContext<(() => void) | null>(null);

export const useSideSheetClose = (): (() => void) | null => use(SideSheetCloseContext);
