import { Inject, Injectable, InternalServerErrorException, Logger, Optional } from '@nestjs/common';
import type { LineNumbers } from '../../../config/env/env';
import { InboundService } from './inbound/webhook.inbound.service';
import type { ReceivingNumber } from './lines/webhook.lines';
import { WebhookConfigReload } from './lines/webhook.reload';
import { parseWebhook } from './parse/webhook.parse';
import { StatusService } from './status/webhook.status.service';
import { CALL_EVENTS, type CallEventsPort } from '../calls/flow/call-events.service';

/** WhatsApp webhook settings from env (docs/12 §3.1, §13.6); a token so tests can swap them. */
export const WEBHOOK_CONFIG = Symbol('WEBHOOK_CONFIG');
export interface WebhookConfig {
  /** [WA_APP_SECRET, WA_CHAT_APP_SECRET]: X-Hub-Signature-256 keys, any may match. None → every POST is 401. */
  appSecrets: readonly string[];
  /** WA_VERIFY_TOKEN: GET subscribe handshake (one token for both Meta apps). Unset → 403. */
  verifyToken: string | undefined;
  /** Each line's phone-number id: changes for any other number are ignored. */
  numbers: LineNumbers;
  /** KAPSO_WEBHOOK_SECRET: POST /webhooks/kapso only (docs/19). Unset → every Kapso POST is 401. */
  kapsoSecret?: string;
  /** WACRM_WEBHOOK_SECRET: POST /webhooks/wacrm only (docs/19 «crm driver»). Unset → every CRM POST is 401. */
  wacrmSecret?: string;
  /** Module mode (docs/23c decision 7): every wa_numbers row, enabled or not; absent / null = legacy (`numbers`). */
  overlay?: readonly ReceivingNumber[] | null;
  /** The dedicated calls number (docs/28 §10), read per access; null / absent = none. */
  calls?: ReceivingNumber | null;
}

/**
 * ponytail: the work runs inline; after this budget Meta gets its 200 and the rest finishes in
 * the background, so a failure past the budget is only logged (no 500, no re-send). Meta re-sends
 * after ~20 s without an answer. Move to a pg-boss queue if a batch ever needs longer.
 */
export const RESPONSE_BUDGET_MS = 5_000;

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
  /** WhatsApp Calling items (docs/28; property-injected: the constructor is at the 3-parameter limit). */
  @Optional() @Inject(CALL_EVENTS) private readonly calls?: CallEventsPort;
  /** Reloads the config once before a change for an unknown number is ignored (absent in unit tests). */
  @Optional() @Inject(WebhookConfigReload) private readonly reload?: WebhookConfigReload;

  constructor(
    @Inject(WEBHOOK_CONFIG) private readonly config: WebhookConfig,
    private readonly inbound: InboundService,
    private readonly statuses: StatusService,
  ) {}

  async handle(body: unknown): Promise<void> {
    const now = new Date();
    const batch = await this.parse(body, now);
    // When the controller stops waiting (within), so an item knows whether Meta can still re-send it.
    const deadline = now.getTime() + RESPONSE_BUDGET_MS;
    let failed = 0;
    for (const m of batch.messages) failed += await this.safely(m.waMessageId, () => this.inbound.handle(m, { deadline }));
    for (const s of batch.statuses) failed += await this.safely(s.waMessageId, () => this.statuses.handle(s));
    for (const e of batch.echoes) failed += await this.safely('echo', () => this.statuses.echo(e));
    for (const c of batch.calls ?? []) failed += await this.safely(c.waCallId, () => this.calls?.handle(c) ?? Promise.resolve());
    for (const p of batch.permissions ?? []) failed += await this.safely('call_permission', () => this.calls?.permissionReply(p) ?? Promise.resolve());
    if (failed > 0) throw new InternalServerErrorException({ code: 'webhook_items_failed', failed });
  }

  /**
   * The batch for the numbers this copy knows. An unknown phone_number_id may be one the other API copy
   * just saved: reload the config once and parse again before its changes are ignored (and warned about).
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
