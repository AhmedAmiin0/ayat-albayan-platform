import {
  Inject,
  Injectable,
  type BeforeApplicationShutdown,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { stopWithin } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import type { EventHandlers } from './event-handlers.types';
import type { EventTransport } from './event-transport.port';
import { EVENT_HANDLERS, EVENT_TRANSPORT } from './events.tokens';

/** Only where APP_ROLE runs jobs: two API copies never deliver the same outbox. */
@BackgroundJob({ name: 'domain-events', kick: 'kick' })
@Injectable()
export class DomainEventsJob implements OnApplicationBootstrap, BeforeApplicationShutdown {
  constructor(
    @Inject(EVENT_TRANSPORT) private readonly transport: EventTransport,
    @Inject(EVENT_HANDLERS) private readonly handlers: EventHandlers,
  ) {}

  onApplicationBootstrap(): void {
    this.transport.start(this.handlers);
  }

  async beforeApplicationShutdown(): Promise<void> {
    await stopWithin(this.transport);
  }

  async kick(): Promise<void> {
    await this.transport.drainOnce();
  }
}
