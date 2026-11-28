import { defineRoute } from '@ab/core';
import { gateCutoverSchema, gateSwitchSchema } from '../gate';
import { academySettingsSchema } from './academy.schemas';

const access = { permissions: ['settings.write'], tags: ['messaging'] } as const;

/**
 * The only writers of the sending switches and the CRM cut-over tick (docs/26 §2f, 26-P0). ON needs
 * the exact confirmation text, checked by the API; each answers the full academy settings.
 */
export const gateRoutes = {
  sending: defineRoute({
    method: 'PUT',
    path: '/messages/gate/sending',
    body: gateSwitchSchema,
    response: academySettingsSchema,
    ...access,
  }),
  auto: defineRoute({
    method: 'PUT',
    path: '/messages/gate/auto',
    body: gateSwitchSchema,
    response: academySettingsSchema,
    ...access,
  }),
  cutover: defineRoute({
    method: 'PUT',
    path: '/messages/gate/cutover',
    body: gateCutoverSchema,
    response: academySettingsSchema,
    ...access,
  }),
};
