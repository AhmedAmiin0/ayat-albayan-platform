import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  configDescriptionSchema,
  configEntriesResponseSchema,
  configEntryPatchSchema,
  configEntryResultSchema,
} from './entries.schemas';

const PATH = '/config/entries/:key';
const tags = ['config'] as const;
const writer = { permissions: ['settings.write'], tags } as const;
const params = z.object({ key: z.string() });

/** The values page (docs/26 §2f): per-key versioned saves; Google rows are base-admin only. */
export const configEntriesRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/config/entries',
    response: configEntriesResponseSchema,
    permissions: ['settings.read'],
    tags,
  }),
  patch: defineRoute({
    method: 'PATCH',
    path: PATH,
    params,
    body: configEntryPatchSchema,
    response: configEntryResultSchema,
    ...writer,
  }),
  describe: defineRoute({
    method: 'PUT',
    path: `${PATH}/description`,
    params,
    body: configDescriptionSchema,
    response: configEntryResultSchema,
    ...writer,
  }),
};
