import type { EventKind, EventOf } from '@ab/shared';

/** Must be idempotent by event.id: a delivery repeats after a crash between handler and finish. */
export type EventHandler<K extends EventKind> = (event: EventOf<K>) => Promise<void>;

/** One handler per catalogued kind: a new kind does not compile until it has one. */
export type EventHandlers = { readonly [K in EventKind]: EventHandler<K> };
