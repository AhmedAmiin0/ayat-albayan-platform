import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import {
  numberCreateSchema,
  numberSecretNameSchema,
  numberSecretSchema,
  numbersImportSchema,
  numberUpdateSchema,
} from '../schemas';
import { importResultSchema } from './import.schemas';
import { numberViewSchema, ownTrafficViewSchema } from './number-view.schemas';

const READ = { permissions: ['settings.read'], tags: ['numbers'] } as const;
const MANAGE = { permissions: ['numbers.manage'], tags: ['numbers'] } as const;
const byId = z.object({ id: id() });
const secretParams = z.object({ id: id(), name: numberSecretNameSchema });

/** The academy's WhatsApp numbers (docs/23 §3); secrets are write-only. */
export const numbersRoutes = {
  list: defineRoute({
    method: 'GET', path: '/admin/numbers', response: z.array(numberViewSchema), ...READ,
  }),
  ownTraffic: defineRoute({
    method: 'GET', path: '/admin/numbers/own-traffic', response: ownTrafficViewSchema, ...READ,
  }),
  /** 201; a new number starts disabled unless asked. */
  create: defineRoute({
    method: 'POST', path: '/admin/numbers', body: numberCreateSchema,
    response: numberViewSchema, ...MANAGE,
  }),
  /** 200; a dry run shows each role's values and source, never a secret; the apply is idempotent. */
  import: defineRoute({
    method: 'POST', path: '/admin/numbers/import', body: numbersImportSchema,
    response: importResultSchema, ...MANAGE,
  }),
  update: defineRoute({
    method: 'PATCH', path: '/admin/numbers/:id', params: byId, body: numberUpdateSchema,
    response: numberViewSchema, ...MANAGE,
  }),
  remove: defineRoute({
    method: 'DELETE', path: '/admin/numbers/:id', params: byId, response: 'empty', ...MANAGE,
  }),
  /** The answer never carries the value. */
  setSecret: defineRoute({
    method: 'PUT', path: '/admin/numbers/:id/secrets/:name', params: secretParams,
    body: numberSecretSchema, response: numberViewSchema, ...MANAGE,
  }),
  clearSecret: defineRoute({
    method: 'DELETE', path: '/admin/numbers/:id/secrets/:name', params: secretParams,
    response: numberViewSchema, ...MANAGE,
  }),
};
