import { defineRoute, id, type RouteList } from '@ab/core';
import { z } from 'zod';
import {
  channelPageQuerySchema,
  channelPostSchema,
  channelReadMarkSchema,
  channelUnreadSchema,
} from './channel';
import { channelMessageViewSchema, channelPageSchema } from './channel.schemas';

interface ChatAt {
  /** The chat's base path, ending in `/students/:id/channel`. */
  chat: string;
  permissions: RouteList;
}

const byStudent = z.object({ id: id() });

/** A participant's page, send, read mark and unread count at one chat path (docs/31 §2). */
const participantChatRoutes = ({ chat, permissions }: ChatAt) => {
  const access = { params: byStudent, permissions, tags: ['student-channels'] } as const;
  return {
    page: defineRoute({
      method: 'GET',
      path: `${chat}/messages`,
      query: channelPageQuerySchema,
      response: channelPageSchema,
      ...access,
    }),
    post: defineRoute({
      method: 'POST',
      path: `${chat}/messages`,
      body: channelPostSchema,
      response: channelMessageViewSchema,
      ...access,
    }),
    read: defineRoute({
      method: 'POST',
      path: `${chat}/read`,
      body: channelReadMarkSchema,
      response: 'empty',
      ...access,
    }),
    unread: defineRoute({
      method: 'GET',
      path: `${chat}/unread`,
      response: channelUnreadSchema,
      ...access,
    }),
  };
};

/** The family's chat with their own student's teacher. */
export const channelPortalRoutes = participantChatRoutes({
  chat: '/portal/students/:id/channel',
  permissions: ['self.portal'],
});

/** The assistant in the chat whose seat she holds. */
export const channelSalesRoutes = participantChatRoutes({
  chat: '/sales/students/:id/channel',
  permissions: ['self.sales'],
});
