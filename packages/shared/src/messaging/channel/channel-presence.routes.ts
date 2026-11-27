import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { channelPresenceSchema } from '../../people/presence';

const byStudent = z.object({ id: id() });
const tags = ['student-channels'] as const;
const presence = { method: 'GET', params: byStudent, response: channelPresenceSchema, tags } as const;

/** A chat's presence per audience, behind the same access check as its messages (docs/33 §2). */
export const channelPresenceRoutes = {
  teacher: defineRoute({
    ...presence,
    path: '/teachers/me/channels/:id/presence',
    permissions: ['self.teacher'],
  }),
  portal: defineRoute({
    ...presence,
    path: '/portal/students/:id/channel/presence',
    permissions: ['self.portal'],
  }),
  monitor: defineRoute({
    ...presence,
    path: '/students/:id/channel/presence',
    permissions: ['student_channels.monitor'],
  }),
  sales: defineRoute({
    ...presence,
    path: '/sales/students/:id/channel/presence',
    permissions: ['self.sales'],
  }),
};
