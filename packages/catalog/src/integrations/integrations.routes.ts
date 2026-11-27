import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { integrationSecretSchema, integrationValuesSchema } from './checks';
import {
  integrationConfigListSchema,
  integrationSecretKeySchema,
  storageProbeResultSchema,
} from './views.schemas';

const BASE = '/settings/integrations';
const tags = ['settings'] as const;
const writer = { permissions: ['settings.write'], tags } as const;
const secretParams = z.object({ key: integrationSecretKeySchema });
const items = integrationConfigListSchema;

/** Integration keys kept in the DB; secrets are write-only and never in an answer. */
export const integrationRoutes = {
  list: defineRoute({
    method: 'GET',
    path: BASE,
    response: items,
    permissions: ['settings.read'],
    tags,
  }),
  saveValues: defineRoute({
    method: 'PUT',
    path: BASE,
    body: integrationValuesSchema,
    response: items,
    ...writer,
  }),
  saveSecret: defineRoute({
    method: 'PUT',
    path: `${BASE}/secrets/:key`,
    params: secretParams,
    body: integrationSecretSchema,
    response: items,
    ...writer,
  }),
  clearSecret: defineRoute({
    method: 'DELETE',
    path: `${BASE}/secrets/:key`,
    params: secretParams,
    response: items,
    ...writer,
  }),
  storageProbe: defineRoute({
    method: 'POST',
    path: `${BASE}/storage-probe`,
    response: z.object({ data: storageProbeResultSchema }),
    ...writer,
  }),
};
