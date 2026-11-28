import { defineRoute } from '@ab/core';
import { academySettingsSchema, gateCutoverSchema, gateSwitchSchema } from '@ab/settings';

const WRITE = {
  method: 'PUT',
  response: academySettingsSchema,
  permissions: ['settings.write'],
  tags: ['messaging'],
} as const;

/**
 * The only writers of the three gate settings (docs/26 §2f); each answers the full settings. ON
 * needs the exact confirmation text, checked by the API (428), so OFF is never refused over it.
 */
export const sendGateRoutes = {
  sending: defineRoute({ ...WRITE, path: '/messages/gate/sending', body: gateSwitchSchema }),
  auto: defineRoute({ ...WRITE, path: '/messages/gate/auto', body: gateSwitchSchema }),
  cutover: defineRoute({ ...WRITE, path: '/messages/gate/cutover', body: gateCutoverSchema }),
};
