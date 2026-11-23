import { createContext, use } from 'react';

/** Null beside the chat on wide screens, where there is nothing to close. */
export const SideSheetCloseContext = createContext<(() => void) | null>(null);

export const useSideSheetClose = (): (() => void) | null => use(SideSheetCloseContext);
