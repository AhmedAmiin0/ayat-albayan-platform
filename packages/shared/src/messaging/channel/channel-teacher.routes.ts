import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { channelPageQuerySchema, channelPostSchema, channelReadMarkSchema } from './channel';
import {
  channelMessageViewSchema,
  channelPageSchema,
  teacherChannelRowSchema,
} from './channel.schemas';

const byStudent = z.object({ studentId: id() });
const CHATS = '/teachers/me/channels';
const access = { permissions: ['self.teacher'], tags: ['student-channels'] } as const;

/** The teacher's chats with the families of their current students (docs/31 §2). */
export const channelTeacherRoutes = {
  list: defineRoute({
    method: 'GET',
    path: CHATS,
    response: z.array(teacherChannelRowSchema),
    ...access,
  }),
  page: defineRoute({
    method: 'GET',
    path: `${CHATS}/:studentId/messages`,
    params: byStudent,
    query: channelPageQuerySchema,
    response: channelPageSchema,
    ...access,
  }),
  post: defineRoute({
    method: 'POST',
    path: `${CHATS}/:studentId/messages`,
    params: byStudent,
    body: channelPostSchema,
    response: channelMessageViewSchema,
    ...access,
  }),
  read: defineRoute({
    method: 'POST',
    path: `${CHATS}/:studentId/read`,
    params: byStudent,
    body: channelReadMarkSchema,
    response: 'empty',
    ...access,
  }),
};
