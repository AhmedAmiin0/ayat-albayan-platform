import type { EventKind, EventOf } from '@ab/shared';
import type { EventHandler, EventHandlers } from './event-handlers.types';

export const EVENT_HANDLER_MAP: EventHandlers = {
  'events.probe': () => Promise.resolve(),
};

export function runHandler<K extends EventKind>(
  handlers: EventHandlers,
  kind: K,
  event: EventOf<K>,
): Promise<void> {
  const handler: EventHandler<K> = handlers[kind];
  return handler(event);
}
