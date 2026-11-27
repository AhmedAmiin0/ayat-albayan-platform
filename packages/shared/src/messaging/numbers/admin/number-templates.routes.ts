import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { templateNumberSyncViewSchema } from './number-templates.schemas';

/** Template managers only, never a sales, assistant or teacher role (docs/23c decision 9). */
export const numberTemplatesRoutes = {
  /** That number's WABA list written as its template approvals. */
  sync: defineRoute({
    method: 'POST', path: '/admin/numbers/:id/templates/sync', params: z.object({ id: id() }),
    response: templateNumberSyncViewSchema, permissions: ['templates.manage'], tags: ['messaging'],
  }),
};
