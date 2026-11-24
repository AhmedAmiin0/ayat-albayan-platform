import { chatListErrorWords } from '@ab/client-core';
import { t } from '@ab/mobile-kit';

/** Mirrors the web's wording (docs/27 E6). */
export const listErrorText: (error: unknown) => string = chatListErrorWords(() => t.inbox.lists);
