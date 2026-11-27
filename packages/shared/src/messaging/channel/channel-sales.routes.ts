import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { channelPostSchema, channelReadSchema, channelUnreadSchema } from './channel';
import { channelMessageViewSchema } from './channel.schemas';

const byStudent = z.object({ id: id() });
const CHAT = '/sales/students/:id/channel';
const access = { permissions: ['self.sales'], tags: ['student-channels'] } as const;

/** A read mark sent without a body reads up to now. */
const readMarkSchema = z.preprocess((body) => body ?? {}, channelReadSchema);

/** The assistant in the chat whose seat she holds: send, read mark, unread (docs/31 §2). */
export const channelSalesRoutes = {
  post: defineRoute({
    method: 'POST',
    path: `${CHAT}/messages`,
    params: byStudent,
    body: channelPostSchema,
    response: channelMessageViewSchema,
    ...access,
  }),
  read: defineRoute({
    method: 'POST',
    path: `${CHAT}/read`,
    params: byStudent,
    body: readMarkSchema,
    response: 'empty',
    ...access,
  }),
  unread: defineRoute({
    method: 'GET',
    path: `${CHAT}/unread`,
    params: byStudent,
    response: channelUnreadSchema,
    ...access,
  }),
};
