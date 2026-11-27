import { defineRoute, phoneE164 } from '@ab/core';
import { z } from 'zod';
import { threadSyncQuerySchema, threadSyncSchema } from '../../thread-sync';
import { threadDetailQuerySchema } from './thread-detail-query.schemas';
import { threadListQuerySchema, threadPageSchema } from './thread-list.schemas';
import { threadDeltaSchema, threadDetailSchema } from './thread-page.schemas';

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
  /** 200; the caller's chats, never the academy's own numbers (the nav counts read its total). */
  list: defineRoute({
    method: 'GET',
    path: '/threads',
    query: threadListQuerySchema,
    response: threadPageSchema,
    ...reader,
  }),
  /**
   * 200; a page of the chat, or with `after` only what changed since (~2 reads); 400
   * invalid_phone. Reading stamps the chat's new inbound rows read.
   */
  detail: defineRoute({
    method: 'GET',
    path: '/threads/:phone',
    params: z.object({ phone: phoneE164 }),
    query: threadDetailQuerySchema,
    response: z.union([threadDetailSchema, threadDeltaSchema]),
    ...reader,
  }),
};
