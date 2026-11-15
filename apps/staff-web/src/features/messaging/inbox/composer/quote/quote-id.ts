import { createPinStore } from '@ab/client-core';

/**
 * «أرسل العرض»'s pinned clientRequestId per chat, kept outside the dialog (it unmounts on close):
 * after an offer with no answer, every next offer of the chat reuses that id until a send with it
 * gets an answer (2xx or 4xx), so a retry is never a second message (docs/44 BUG7). Its
 * generation drops what a send settling after a sign-out would write (tab-memory clears it).
 */
export const quotePins = createPinStore();
