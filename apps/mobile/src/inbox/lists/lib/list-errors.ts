import { chatListErrorWords } from '@ab/client-core';
import { t } from '@ab/mobile-kit';

/**
 * The inline line under a list's name field: the 409s (the name is taken, 30 lists already), a
 * list another assistant just deleted (404), else «تعذر حفظ التغيير». The web's words (docs/27 E6).
 */
export const listErrorText: (error: unknown) => string = chatListErrorWords(() => t.inbox.lists);
