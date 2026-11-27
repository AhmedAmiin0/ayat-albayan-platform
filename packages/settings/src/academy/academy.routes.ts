import { defineRoute } from '@ab/core';
import { settingsPatchBodySchema } from '../validation/patch';
import { academySettingsSchema, settingsPatchResultSchema } from './academy.schemas';

const path = '/settings';
const tags = ['settings'] as const;

/** The academy settings (admin); a write is applied key by key and audited by the API. */
export const settingsRoutes = {
  view: defineRoute({
    method: 'GET',
    path,
    response: academySettingsSchema,
    permissions: ['settings.read'],
    tags,
  }),
  update: defineRoute({
    method: 'PATCH',
    path,
    body: settingsPatchBodySchema,
    response: settingsPatchResultSchema,
    permissions: ['settings.write'],
    tags,
  }),
};
