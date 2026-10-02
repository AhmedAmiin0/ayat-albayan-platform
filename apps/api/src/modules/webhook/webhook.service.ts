import { Inject, Injectable, Logger } from '@nestjs/common';
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
 * fails the batch (Meta would re-send all of it). Never throws.
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
    for (const m of batch.messages) await this.safely(m.waMessageId, () => this.inbound.handle(m));
    for (const s of batch.statuses) await this.safely(s.waMessageId, () => this.statuses.handle(s));
  }

  /**
   * ponytail: a failed item is logged, not retried — Meta gets its 200 either way. Replays are
   * safe (wamid dedup), so answering 500 to get Meta's retry is the upgrade if items get lost.
   */
  private async safely(waMessageId: string, work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (e) {
      this.log.error(`webhook item ${waMessageId} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
