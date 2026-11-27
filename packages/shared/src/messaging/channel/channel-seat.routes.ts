import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { channelSeatSchema } from './channel.schemas';

const byStudent = z.object({ id: id() });
const SEAT = '/sales/students/:id/channel/seat';

/** The one assistant seat of a student chat: read, take and leave (docs/31 §2). */
export const channelSeatRoutes = {
  view: defineRoute({ method: 'GET', path: SEAT, params: byStudent, response: channelSeatSchema }),
  take: defineRoute({ method: 'PUT', path: SEAT, params: byStudent, response: channelSeatSchema }),
  leave: defineRoute({ method: 'DELETE', path: SEAT, params: byStudent, response: 'empty' }),
};
