import { defineRoute } from '@ab/core';
import { threadSyncQuerySchema, threadSyncSchema } from '../../thread-sync';

const reader = { permissions: ['inbox.read'], tags: ['inbox'] } as const;

/** The inbox's reads; each caller sees only the chats it may read (docs/12 §4, docs/43 §5). */
export const threadReadRoutes = {
  /**
   * 200; the phone store's delta from `since` (none = the first row), at most `limit` rows. It
   * sits beside GET /threads/:phone: the static segment wins.
   */
  sync: defineRoute({
    method: 'GET',
    path: '/threads/sync',
    query: threadSyncQuerySchema,
    response: threadSyncSchema,
    ...reader,
  }),
};
