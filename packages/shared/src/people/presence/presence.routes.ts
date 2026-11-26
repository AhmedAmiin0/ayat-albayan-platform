import { defineRoute } from '@ab/core';
import { presenceSelfSchema, staffPresenceSchema } from './presence.schemas';

/** Online now (docs/33), written once for the api and its clients. */
export const presenceRoutes = {
  self: defineRoute({ method: 'GET', path: '/presence/me', response: presenceSelfSchema }),
  staff: defineRoute({ method: 'GET', path: '/presence/staff', response: staffPresenceSchema }),
};
