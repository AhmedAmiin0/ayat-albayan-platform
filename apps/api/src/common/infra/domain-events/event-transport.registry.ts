import type { EventTransport } from './event-transport.port';
import type { TransportName } from './events-transport.schemas';
import { OutboxTickerTransport } from './outbox/event-transport.outbox.adapter';
import type { OutboxStore } from './outbox/outbox.types';

interface TransportDeps {
  outbox: OutboxStore;
}

const TRANSPORTS: Record<TransportName, (deps: TransportDeps) => EventTransport> = {
  outbox: (deps) => new OutboxTickerTransport(deps.outbox),
};

export const transportFor = (name: TransportName, deps: TransportDeps): EventTransport =>
  TRANSPORTS[name](deps);
