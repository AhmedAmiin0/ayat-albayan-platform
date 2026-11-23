import { z } from 'zod';
import { blankIsUnset } from '@/config/env/env.blank';

/** Each name has an adapter factory in event-transport.registry.ts. */
export const transportName = z.enum(['outbox']);
export type TransportName = z.infer<typeof transportName>;

export const EVENTS_SHAPE = {
  /** Which EventTransport delivers domain events; unset = the outbox ticker. */
  EVENTS_TRANSPORT: z.preprocess(blankIsUnset, transportName.default('outbox')),
};
