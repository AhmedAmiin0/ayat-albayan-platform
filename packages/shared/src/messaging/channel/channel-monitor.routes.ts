import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { channelPageQuerySchema } from './channel';
import { channelPageSchema } from './channel.schemas';

/** The monitor's read-only page of any student's chat: no send or read mark (docs/31 §2). */
export const channelMonitorRoutes = {
  page: defineRoute({
    method: 'GET',
    path: '/students/:id/channel/messages',
    params: z.object({ id: id() }),
    query: channelPageQuerySchema,
    response: channelPageSchema,
    permissions: ['student_channels.monitor'],
    tags: ['student-channels'],
  }),
};
