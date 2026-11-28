import { Inject, Injectable, InternalServerErrorException, Logger, Optional } from '@nestjs/common';
import { InboundService } from './inbound/webhook.inbound.service';
import { WebhookConfigReload } from './lines/webhook.reload';
import { parseWebhook } from './parse/webhook.parse';
import { StatusService } from './status/webhook.status.service';
import { CALL_EVENTS, type CallEventsPort } from '@/modules/messaging/calls';
import { WEBHOOK_CONFIG } from '@/modules/messaging/webhook/shared/webhook.config';
import type { WebhookConfig } from '@/modules/messaging/webhook/shared/webhook.types';
import type { WebhookBatch } from './webhook.events';

/**
 * the work runs inline; after this budget Meta gets its 200 and the rest finishes in
 * the background, so a failure past the budget is only logged (no 500, no re-send). Meta re-sends
 * after ~20 s without an answer. Move to a pg-boss queue if a batch ever needs longer.
 */
export const RESPONSE_BUDGET_MS = 5_000;

type BatchItem = readonly [id: string, work: () => Promise<unknown>];

/** Waits for `work` at most `ms`; past that the caller moves on and `work` finishes on its own. */
export async function within(work: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  try {
    return await Promise.race([work.then(() => true), late]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Handles one signed webhook body: every message and status on its own, so one bad item never
 * stops the others. If any item failed (DB down, a timeout) it throws once all were tried: the
 * controller answers 500 and Meta re-sends the batch. Replays are no-ops for the items that went
 * through (wamid is unique, statuses only move forward), so only the failed ones get another go.
 */
@Injectable()
export class WebhookService {
  private readonly log = new Logger(WebhookService.name);
  /** phone_number_ids already warned about: one warning per distinct id per process. */
  private readonly ignored = new Set<string>();
  /**
   * WhatsApp Calling items (docs/28; property-injected: the constructor is at the 3-parameter
   * limit).
   */
  @Optional() @Inject(CALL_EVENTS) private readonly calls?: CallEventsPort;
  /**
   * Reloads the config once before a change for an unknown number is ignored (absent in unit
   * tests).
   */
  @Optional() @Inject(WebhookConfigReload) private readonly reload?: WebhookConfigReload;

  constructor(
    @Inject(WEBHOOK_CONFIG) private readonly config: WebhookConfig,
    private readonly inbound: InboundService,
    private readonly statuses: StatusService,
  ) {}

  async handle(body: unknown): Promise<void> {
    const now = new Date();
    const batch = await this.parse(body, now);
    // When the controller stops waiting (within), so an item knows whether Meta can still re-send
    // it.
    const deadline = now.getTime() + RESPONSE_BUDGET_MS;
    let failed = 0;
    for (const [id, work] of this.items(batch, deadline)) failed += await this.safely(id, work);
    if (failed > 0)
      throw new InternalServerErrorException({ code: 'webhook_items_failed', failed });
  }

  /** Every item in order: messages, statuses, echoes, calls, then call permission replies. */
  private items(batch: WebhookBatch, deadline: number): BatchItem[] {
    const calls = batch.calls ?? [];
    const permissions = batch.permissions ?? [];
    return [
      ...batch.messages.map((m): BatchItem => [
        m.waMessageId,
        () => this.inbound.handle(m, { deadline }),
      ]),
      ...batch.statuses.map((s): BatchItem => [s.waMessageId, () => this.statuses.handle(s)]),
      ...batch.echoes.map((e): BatchItem => ['echo', () => this.statuses.echo(e)]),
      ...calls.map((c): BatchItem => [
        c.waCallId,
        () => this.calls?.handle(c) ?? Promise.resolve(),
      ]),
      ...permissions.map((p): BatchItem => [
        'call_permission',
        () => this.calls?.permissionReply(p) ?? Promise.resolve(),
      ]),
    ];
  }

  /**
   * The batch for the numbers this copy knows. An unknown phone_number_id may be one the other API
   * copy just saved: reload the config once and parse again before its changes are ignored (and
   * warned about).
   */
  private async parse(body: unknown, now: Date): Promise<ReturnType<typeof parseWebhook>> {
    const ignored: string[] = [];
    const read = () => {
      ignored.length = 0;
      const onIgnored = (id: string) => ignored.push(id);
      const { numbers, overlay, calls } = this.config;
      return parseWebhook(body, { now, numbers, onIgnored, overlay, calls });
    };
    let batch = read();
    if (ignored.length > 0 && (await this.reload?.once())) batch = read();
    for (const id of ignored) this.warnIgnored(id);
    return batch;
  }

  /** The id only (no secrets): tells the owner which phone_number_id Meta really sends. */
  private warnIgnored(id: string): void {
    if (this.ignored.has(id)) return;
    this.ignored.add(id);
    this.log.warn(`webhook ignored a change for phone_number_id ${id}: it is neither line`);
  }

  /** 1 when the item failed (logged), else 0. */
  private async safely(waMessageId: string, work: () => Promise<unknown>): Promise<number> {
    try {
      await work();
      return 0;
    } catch (e) {
      this.log.error(`webhook item ${waMessageId} failed: ${e instanceof Error ? e.message : String(e)}`);
      return 1;
    }
  }
}
