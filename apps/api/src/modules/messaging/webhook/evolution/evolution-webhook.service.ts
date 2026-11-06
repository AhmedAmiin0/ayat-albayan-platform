import type { EvolutionState } from '@ab/shared';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InboundService } from '@/modules/messaging/webhook/inbound/webhook.inbound.service';
import { StatusService } from '@/modules/messaging/webhook/status/webhook.status.service';
import type { EvolutionDelivery } from '@/modules/messaging/webhook/parse/webhook.evolution';
import { RESPONSE_BUDGET_MS } from '@/modules/messaging/webhook/webhook.service';
import { EvolutionRestriction } from './evolution-restriction';
import { EvolutionStateRepo } from './evolution-state.repo';

// One authenticated Evolution delivery into the SAME paths as Meta's and Kapso's (docs/19):
// InboundService.handle (row, thread summary, broadcast, push; idempotent by message id) and
// StatusService.handle (ticks, compare-and-set). A failed item answers 500 so Evolution re-sends.

type Applied = Exclude<EvolutionDelivery, { kind: 'ignored' }>;
interface At {
  numberId: string;
  now: Date;
}

@Injectable()
export class EvolutionWebhookService {
  private readonly log = new Logger(EvolutionWebhookService.name);

  constructor(
    private readonly inbound: InboundService,
    private readonly statuses: StatusService,
    private readonly states: EvolutionStateRepo,
    private readonly restriction: EvolutionRestriction,
  ) {}

  async apply(delivery: Applied, at: At): Promise<void> {
    const failed = await this.items(delivery, at);
    // ERRORs on our sends (after the rows are marked failed): too many switch the number off.
    if (delivery.kind === 'status') await this.restriction.check(delivery.events, at);
    if (failed > 0) throw new InternalServerErrorException({ code: 'webhook_items_failed', failed });
  }

  private items(d: Applied, at: At): Promise<number> {
    if (d.kind === 'state') return this.state(d.state, at);
    const deadline = at.now.getTime() + RESPONSE_BUDGET_MS;
    return d.kind === 'inbound'
      ? this.each(d.events, (e) => this.inbound.handle(e, { deadline }))
      : this.each(d.events, (e) => this.statuses.handle(e));
  }

  /** CONNECTION_UPDATE / QRCODE_UPDATED: the number's state (an unknown one is skipped). */
  private async state(state: EvolutionState | null, at: At): Promise<number> {
    if (state) await this.states.set({ numberId: at.numberId, state, at: at.now });
    return 0;
  }

  /** Each item on its own: one failure never hides the others; the count of failures. */
  private async each<T extends { waMessageId: string }>(
    items: readonly T[],
    run: (e: T) => Promise<unknown>,
  ): Promise<number> {
    let failed = 0;
    for (const e of items) {
      try {
        await run(e);
      } catch (err) {
        failed += 1;
        const why = err instanceof Error ? err.message : String(err);
        this.log.error(`evolution item ${e.waMessageId} failed: ${why}`);
      }
    }
    return failed;
  }
}
