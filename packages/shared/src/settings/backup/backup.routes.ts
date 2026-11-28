import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { backupStatusViewSchema } from './backup.schemas';

/** Same permission as the storage probe (docs/45 §5). */
export const backupRoutes = {
  status: defineRoute({
    method: 'GET',
    path: '/settings/integrations/storage-backup',
    response: z.object({ data: backupStatusViewSchema }),
    permissions: ['settings.write'],
    tags: ['settings'],
  }),
};
