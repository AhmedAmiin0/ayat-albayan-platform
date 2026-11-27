import { createContext } from 'react';

/** Inside an inset group a ListRow drops its own fill and bottom rule: the group draws them. */
export const InsetContext = createContext(false);
