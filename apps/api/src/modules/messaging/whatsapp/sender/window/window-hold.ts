import {
  HOLD_EXPIRED,
  REOPEN_UNAVAILABLE,
  reopenDedupKey,
  type TemplateView,
  type WaLine,
} from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import {
  MessageDispatch,
  type SendVia,
} from '@/modules/messaging/whatsapp/sender/message.dispatch';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import { answered, heldStep, HOLD_MS, holdable, reopenUsable } from './window-rules';

export { isWindowClosedError } from './window-rules';
import { WindowRepo } from './window.repo';
import { WindowSettings } from './window.settings';

/** What the hold returns to the worker: held, failed for good, expired, or not now. */
export type HoldOutcome = 'waiting' | 'failed' | 'expired' | 'skipped';

/** One row where the worker is: its line, and its number in module mode (absent under legacy). */
export interface WindowAt {
  row: DueMessage;
  now: Date;
  line: WaLine;
  route?: NumberRoute | null;
}

const DAY_MS = 24 * 60 * 60_000;
const last4 = (phone: string): string => `…${phone.slice(-4)}`;
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const UNAVAILABLE = {
  code: REOPEN_UNAVAILABLE,
  text: 'chat_reopen_template is not an approved chat-line starter template without variables',
};
const EXPIRED = { code: HOLD_EXPIRED, text: 'the family did not reply within 7 days' };

/**
 * The 24 h window on the chat line (owner 2026-11-03, «not sent after 24h»). A staff text whose
 * window is closed (the inbox marked it AWAITING_REPLY, or WhatsApp refused it: Kapso 422 / Meta
 * 131047) is never sent as free text: ONE reopen template (`chat_reopen_template`, reopenUsable)
 * is queued for that phone per 24 h, and the text is held until the family writes on the chat
 * line (release), then sent through the normal sender and its gates. After 7 days it fails.
 * The worker only runs with the send gate open; a phone off the allow-list or an unconfigured
 * line holds nothing and queues nothing (ready).
 */
@Injectable()
export class WindowHold {
  private readonly log = new Logger('WindowHold');

  constructor(
    private readonly repo: WindowRepo,
    private readonly templates: TemplateRegistry,
    private readonly settings: WindowSettings,
    private readonly dispatch: MessageDispatch,
  ) {}

  private readonly steps: Record<'hold' | 'expire', (at: WindowAt) => Promise<HoldOutcome>> = {
    hold: (at) => this.hold(at),
    expire: (at) => this.expire(at.row.id),
  };

  /** A due AWAITING_REPLY row: held now, or expired at its deadline. null = not such a row. */
  async due(at: WindowAt): Promise<HoldOutcome | null> {
    const step = heldStep(at.row);
    return step ? this.steps[step](at) : null;
  }

  /** WhatsApp refused it for the window: a staff chat text is held; null = fail it as planned. */
  async closed(at: WindowAt): Promise<HoldOutcome | null> {
    if (!holdable(at.row, at.line)) return null;
    try {
      return await this.hold(at);
    } catch (e) {
      this.log.warn(`hold failed for ${last4(at.row.phone_e164)}: ${messageOf(e)}`);
      return null;
    }
  }

  /** Every waiting row whose family has written on the chat line since: due now. Never throws. */
  async release(): Promise<number> {
    try {
      const rows = await this.repo.waiting();
      const last = await this.repo.lastChatInbound([...new Set(rows.map((r) => r.phone_e164))]);
      const released = await this.repo.release(answered(rows, last));
      if (released > 0) this.log.log(`released ${released} held message(s)`);
      return released;
    } catch (e) {
      this.log.error(`held messages release failed: ${messageOf(e)}`);
      return 0;
    }
  }

  private async hold(at: WindowAt): Promise<HoldOutcome> {
    if (!this.ready(at)) return 'skipped';
    const until = new Date(Date.parse(at.row.created_at ?? at.now.toISOString()) + HOLD_MS);
    if (until <= at.now) return this.expire(at.row.id);
    const template = await this.reopenTemplate();
    if (!template) return this.unavailable(at.row.id);
    await this.request(at, template.key);
    const held = await this.repo.hold({ id: at.row.id, since: at.now, until });
    return held ? 'waiting' : 'skipped';
  }

  /** The line (number) can send to this phone now: configured and on the allow-list. */
  private ready(at: WindowAt): boolean {
    const via: SendVia | null = at.route === undefined ? at.line : at.route;
    return via !== null && this.dispatch.ready(at.row, via);
  }

  private async reopenTemplate(): Promise<TemplateView | null> {
    const key = (await this.settings.read()).chat_reopen_template.trim();
    const template = key ? await this.templates.approved(key) : null;
    return reopenUsable(template) ? template : null;
  }

  /** One reopen template per phone per 24 h (or while one is queued), deduped per Riyadh day. */
  private async request(at: WindowAt, key: string): Promise<void> {
    const { row, now } = at;
    if (await this.repo.reopenSince(row.phone_e164, new Date(now.getTime() - DAY_MS))) return;
    await this.repo.queueReopen({
      direction: 'outbound',
      status: 'queued',
      phone_e164: row.phone_e164,
      lead_id: row.lead_id,
      guardian_id: row.guardian_id ?? null,
      created_by: row.created_by,
      template_key: key,
      template_params: {},
      dedup_key: reopenDedupKey(row.phone_e164, now),
    });
    this.log.log(`reopen template ${key} queued for ${last4(row.phone_e164)}`);
  }

  private async unavailable(id: string): Promise<HoldOutcome> {
    await this.repo.fail(id, UNAVAILABLE);
    return 'failed';
  }

  private async expire(id: string): Promise<HoldOutcome> {
    await this.repo.fail(id, EXPIRED);
    return 'expired';
  }
}
