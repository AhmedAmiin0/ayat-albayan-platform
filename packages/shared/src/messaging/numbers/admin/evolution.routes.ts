import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { evolutionConfigSchema } from '../evolution-config';
import { evolutionSyncSchema } from '../evolution-sync';
import { evolutionQrViewSchema, evolutionStateViewSchema } from './evolution-view.schemas';

const MANAGE = { permissions: ['numbers.manage'], tags: ['numbers'] } as const;
const params = z.object({ id: id() });

/** An Evolution number's live checks and options (docs/19); the QR links a WhatsApp account. */
export const evolutionRoutes = {
  state: defineRoute({
    method: 'GET', path: '/admin/numbers/:id/evolution/state', params,
    response: evolutionStateViewSchema, ...MANAGE,
  }),
  qr: defineRoute({
    method: 'GET', path: '/admin/numbers/:id/evolution/qr', params,
    response: evolutionQrViewSchema, ...MANAGE,
  }),
  /** Saved, then pushed and read back; a save stands when Evolution is unreachable (502). */
  saveConfig: defineRoute({
    method: 'PUT', path: '/admin/numbers/:id/evolution/config', params,
    body: evolutionConfigSchema, response: evolutionSyncSchema, ...MANAGE,
  }),
  push: defineRoute({
    method: 'POST', path: '/admin/numbers/:id/evolution/sync', params,
    response: evolutionSyncSchema, ...MANAGE,
  }),
  /** Reads Evolution back only; nothing is written to it. */
  verify: defineRoute({
    method: 'GET', path: '/admin/numbers/:id/evolution/sync', params,
    response: evolutionSyncSchema, ...MANAGE,
  }),
};
