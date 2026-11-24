import { createPinStore } from '@ab/client-core';

/** Pinned per chat until a send gets an answer, so a retry is never resent (docs/44 BUG7). */
export const quotePins = createPinStore();
