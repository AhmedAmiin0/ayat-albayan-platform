import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type BeforeApplicationShutdown,
} from '@nestjs/common';
import { stopWithin, Ticker } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import { CrmInbound } from './crm-inbound.service';

// The CRM inbound mirror's runs (docs/19 «crm driver»): kicked by POST /webhooks/wacrm right after
// a message.received is queued (in an `api` process the kick goes to the worker), and once a
// minute for the rows waiting out a backoff. Single flight; a kick during a run queues one more.

/** Not on boot: every API test boots AppModule (the AlertsJob rule). */
const FIRST_RUN_MS = 20_000;
const EVERY_MS = 60_000;

@BackgroundJob({ name: 'crm-inbound', kick: 'kick' })
@Injectable()
export class CrmInboundJob implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly ticker = new Ticker({
    name: CrmInboundJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    timer: 'kick',
    run: () => this.inbox.drain(),
  });

  constructor(@Inject(CrmInbound) private readonly inbox: CrmInbound) {}

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  async beforeApplicationShutdown(): Promise<void> {
    await stopWithin(this.ticker);
  }

  /** Run now (a message was just queued) instead of waiting for the next minute. */
  kick(): Promise<void> {
    return this.ticker.kick();
  }
}
