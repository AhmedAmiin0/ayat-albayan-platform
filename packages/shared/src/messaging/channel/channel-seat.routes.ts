import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { channelSeatSchema } from './channel.schemas';

const byStudent = z.object({ id: id() });
const SEAT = '/sales/students/:id/channel/seat';
const access = { permissions: ['self.sales'], tags: ['student-channels'] } as const;
const seat = { path: SEAT, params: byStudent, ...access };

/** The one assistant seat of a student chat: read, take and leave (docs/31 §2). */
export const channelSeatRoutes = {
  view: defineRoute({ method: 'GET', ...seat, response: channelSeatSchema }),
  take: defineRoute({ method: 'PUT', ...seat, response: channelSeatSchema }),
  leave: defineRoute({ method: 'DELETE', ...seat, response: 'empty' }),
};
