import { defineRoute } from '@ab/core';
import {
  chatListBodySchema,
  chatListParamsSchema,
  chatListSchema,
  chatListThreadParamsSchema,
} from './chat-lists.schemas';

/** The academy's shared chat lists (docs/22 §3); a list only organises chats, nothing sends. */
export const chatListRoutes = {
  all: defineRoute({ method: 'GET', path: '/chat-lists', response: chatListSchema.array() }),
  /** 201; 409 list_name_taken or list_limit. */
  create: defineRoute({
    method: 'POST',
    path: '/chat-lists',
    body: chatListBodySchema,
    response: chatListSchema,
  }),
  rename: defineRoute({
    method: 'PATCH',
    path: '/chat-lists/:id',
    params: chatListParamsSchema,
    body: chatListBodySchema,
    response: chatListSchema,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/chat-lists/:id',
    params: chatListParamsSchema,
    response: 'empty',
  }),
  /** Idempotent, like dropThread. */
  addThread: defineRoute({
    method: 'PUT',
    path: '/chat-lists/:id/threads/:phone',
    params: chatListThreadParamsSchema,
    response: 'empty',
  }),
  dropThread: defineRoute({
    method: 'DELETE',
    path: '/chat-lists/:id/threads/:phone',
    params: chatListThreadParamsSchema,
    response: 'empty',
  }),
};
