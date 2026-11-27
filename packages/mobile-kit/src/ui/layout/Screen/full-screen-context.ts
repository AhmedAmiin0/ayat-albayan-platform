import { createContext } from 'react';

export const FullScreenContext = createContext(false);

/** Set by a stack above the tabs (ChatStack): no tab bar under its screens, they own the bottom. */
export const FullScreenProvider = FullScreenContext.Provider;
