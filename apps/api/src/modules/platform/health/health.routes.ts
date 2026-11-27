import { STORAGE_DRIVERS } from '@ab/catalog';
import { defineRoute } from '@ab/core';
import { readinessSchema } from '@ab/shared';
import { z } from 'zod';

const STORAGE_STATES = ['ok', 'down'] as const;
const storageStateSchema = z.enum(STORAGE_STATES);

const liveSchema = z.object({
  status: z.literal('ok'),
  storage: z.object({ driver: z.enum(STORAGE_DRIVERS), status: storageStateSchema }),
});

const probe = { tags: ['health'] } as const;

/** Probes no client app calls (docs/62 part 3 §1): the load balancer and monitors read them. */
export const healthRoutes = {
  health: defineRoute({ method: 'GET', path: '/health', response: liveSchema, ...probe }),
  ready: defineRoute({ method: 'GET', path: '/ready', response: readinessSchema, ...probe }),
};
