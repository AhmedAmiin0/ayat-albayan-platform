import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { googleDriveSchema, googleSettingsSchema } from './schemas';
import { googleConnectUrlSchema, googleStatusViewSchema } from './status.schemas';
import { googleReconcileSchema, googleSyncItemViewSchema } from './sync-item.schemas';

const BASE = '/admin/google';
const tags = ['google-sync'] as const;
const reader = { permissions: ['settings.read'], tags } as const;
const writer = { permissions: ['settings.write'], tags } as const;

/** The Google sync connection, settings and log of the admin (docs/24 §3). */
export const googleAdminRoutes = {
  status: defineRoute({
    method: 'GET',
    path: `${BASE}/status`,
    response: googleStatusViewSchema,
    ...reader,
  }),
  connect: defineRoute({
    method: 'GET',
    path: `${BASE}/connect`,
    response: googleConnectUrlSchema,
    ...writer,
  }),
  disconnect: defineRoute({
    method: 'POST',
    path: `${BASE}/disconnect`,
    response: googleStatusViewSchema,
    ...writer,
  }),
  settings: defineRoute({
    method: 'PUT',
    path: `${BASE}/settings`,
    body: googleSettingsSchema,
    response: googleStatusViewSchema,
    ...writer,
  }),
  discover: defineRoute({
    method: 'POST',
    path: `${BASE}/discover`,
    response: googleStatusViewSchema,
    ...writer,
  }),
  drive: defineRoute({
    method: 'PUT',
    path: `${BASE}/drive`,
    body: googleDriveSchema,
    response: googleStatusViewSchema,
    ...writer,
  }),
  items: defineRoute({
    method: 'GET',
    path: `${BASE}/items`,
    response: z.array(googleSyncItemViewSchema),
    ...reader,
  }),
  retry: defineRoute({
    method: 'POST',
    path: `${BASE}/items/:id/retry`,
    params: z.object({ id: id() }),
    response: googleSyncItemViewSchema,
    ...writer,
  }),
  reconcile: defineRoute({
    method: 'POST',
    path: `${BASE}/reconcile`,
    response: googleReconcileSchema,
    ...writer,
  }),
};
