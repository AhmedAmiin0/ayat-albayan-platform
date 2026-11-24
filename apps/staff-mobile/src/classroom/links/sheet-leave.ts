import { createContext } from 'react';

/** Join closes the sheet before the room opens, else Android keeps the Modal above it. */
export const SheetLeave = createContext<(() => void) | null>(null);
