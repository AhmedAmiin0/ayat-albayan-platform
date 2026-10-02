import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InboundService } from './webhook.inbound.service';
import { parseWebhook } from './webhook.parse';
import { StatusService } from './webhook.status.service';

/** WhatsApp webhook settings from env (docs/12 §3.1); a token so tests can swap them. */
export const WEBHOOK_CONFIG = Symbol('WEBHOOK_CONFIG');
export interface WebhookConfig {
  /** WA_APP_SECRET: X-Hub-Signature-256 key. Unset → every POST is 401. */
  appSecret: string | undefined;
  /** WA_VERIFY_TOKEN: GET subscribe handshake. Unset → 403. */
  verifyToken: string | undefined;
  /** WA_PHONE_NUMBER_ID: changes for another number of the WABA are ignored. */
  phoneNumberId: string | undefined;
}

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

  constructor(
    @Inject(WEBHOOK_CONFIG) private readonly config: WebhookConfig,
    private readonly inbound: InboundService,
    private readonly statuses: StatusService,
  ) {}

  async handle(body: unknown): Promise<void> {
    const batch = parseWebhook(body, { now: new Date(), phoneNumberId: this.config.phoneNumberId });
    let failed = 0;
    for (const m of batch.messages) failed += await this.safely(m.waMessageId, () => this.inbound.handle(m));
    for (const s of batch.statuses) failed += await this.safely(s.waMessageId, () => this.statuses.handle(s));
    if (failed > 0) throw new InternalServerErrorException({ code: 'webhook_items_failed', failed });
  }

  /** 1 when the item failed (logged), else 0. */
  private async safely(waMessageId: string, work: () => Promise<void>): Promise<number> {
    try {
      await work();
      return 0;
    } catch (e) {
      this.log.error(`webhook item ${waMessageId} failed: ${e instanceof Error ? e.message : String(e)}`);
      return 1;
    }
  }
}
