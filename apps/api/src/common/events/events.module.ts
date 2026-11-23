import { Module } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { DomainEventsJob } from './domain-events.job';
import { EVENT_HANDLER_MAP } from './event-handlers';
import { transportFor } from './event-transport.registry';
import { EVENT_HANDLERS, EVENT_TRANSPORT } from './events.tokens';
import { DomainEventsRepo } from './outbox/domain-events.repo';

@Module({
  providers: [
    DomainEventsRepo,
    { provide: EVENT_HANDLERS, useValue: EVENT_HANDLER_MAP },
    {
      provide: EVENT_TRANSPORT,
      inject: [DomainEventsRepo],
      useFactory: (outbox: DomainEventsRepo) =>
        transportFor(loadEnv().EVENTS_TRANSPORT, { outbox }),
    },
    DomainEventsJob,
  ],
})
export class EventsModule {}
