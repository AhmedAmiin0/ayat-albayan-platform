import { EVOLUTION_INSTANCE_RE } from '@ab/catalog';
import { defineRoute } from '@ab/core';
import { z } from 'zod';

/**
 * Provider callbacks no client calls (docs/62 part 3 §1). Each payload stays in its controller,
 * parsed only after the signature check, so no route here declares a body.
 */
export const webhookRoutes = {
  /** Meta's subscribe handshake: hub.challenge echoed as plain text. */
  metaChallenge: defineRoute({ method: 'GET', path: '/webhooks/whatsapp', response: z.string() }),
  meta: defineRoute({ method: 'POST', path: '/webhooks/whatsapp', response: 'empty' }),
  kapso: defineRoute({ method: 'POST', path: '/webhooks/kapso', response: 'empty' }),
  wacrm: defineRoute({ method: 'POST', path: '/webhooks/wacrm', response: 'empty' }),
  evolution: defineRoute({
    method: 'POST',
    path: '/webhooks/evolution/:instance',
    params: z.object({ instance: z.string().regex(EVOLUTION_INSTANCE_RE) }),
    response: 'empty',
  }),
};
