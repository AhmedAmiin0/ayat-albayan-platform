import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { rulePatchSchema } from '../rules.types';
import { notificationEntryViewSchema, notificationsOverviewSchema } from './rules-overview.schemas';

/** Any text: an unknown key is answered by the handler with 404 unknown_notification. */
const keyParams = z.object({ key: z.string() });
const TAGS = { tags: ['notifications'] } as const;
const update = {
  ...TAGS,
  method: 'PATCH',
  params: keyParams,
  body: rulePatchSchema,
  response: notificationEntryViewSchema,
  permissions: ['notifications.manage'],
} as const;

/** The notification catalogue and the admin's choice per row (docs/23 §3, docs/23b). */
export const notificationRuleRoutes = {
  /** Two shapes: the first for untagged clients, v2 for clients sending X-AB-Client. */
  overview: defineRoute({
    ...TAGS,
    method: 'GET',
    path: '/admin/notifications',
    response: notificationsOverviewSchema,
    permissions: ['settings.read'],
  }),
  /** 428 before an essential row goes off without the typed word; answers the row in v2. */
  update: defineRoute({ ...update, path: '/admin/notifications/:key' }),
  /** docs/26b m7: the same write under the communications path. */
  updateAlias: defineRoute({ ...update, path: '/admin/communications/notifications/:key' }),
};
