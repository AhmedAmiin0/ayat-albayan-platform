import { defineRoute, phoneE164 } from '@ab/core';
import { z } from 'zod';
import { threadReopenViewSchema } from './thread-reopen.schemas';

const access = { permissions: ['inbox.send'], tags: ['inbox'] } as const;

/** Kept for app builds that call it when a closed chat opens; current clients never call it. */
export const threadReopenRoutes = {
  /** 200; answers the window state and sends nothing; 400 invalid_phone. */
  reopen: defineRoute({
    method: 'POST',
    path: '/threads/:phone/reopen',
    params: z.object({ phone: phoneE164 }),
    response: threadReopenViewSchema,
    ...access,
  }),
};
