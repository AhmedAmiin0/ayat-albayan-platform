import { defineRoute } from '@ab/core';
import { threadDeltaQuerySchema, threadPageQuerySchema } from './thread-detail-query.schemas';
import { threadReadRoutes } from './thread-reads.routes';
import { threadDeltaSchema, threadDetailSchema } from './thread-page.schemas';

const { method, path, params, permissions, tags } = threadReadRoutes.detail;
const chat = { method, path, params, permissions, tags };

/**
 * The client's two asks of GET /threads/:phone, each with its own answer; the api serves both
 * through `threadReadRoutes.detail`, whose query tells them apart by `after` alone.
 */
export const threadModeRoutes = {
  /** The newest page, an older one (`before` + `before_id`) or the window `around` a message. */
  page: defineRoute({ ...chat, query: threadPageQuerySchema, response: threadDetailSchema }),
  /** What changed after `after`, with the outgoing rows whose status may still move. */
  delta: defineRoute({ ...chat, query: threadDeltaQuerySchema, response: threadDeltaSchema }),
};
