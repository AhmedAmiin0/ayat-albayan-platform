import type { TemplateView, WaLine } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import {
  MessageDispatch,
  type SendVia,
} from '@/modules/messaging/whatsapp/sender/message.dispatch';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import {
  answered,
  heldStep,
  HOLD_MS,
  holdable,
  reopenUsable,
} from './window-rules';

export { isWindowClosedError } from './window-rules';
import { DAY_MS, expectedCode, EXPIRED, reopenRow, UNAVAILABLE } from './window-reopen';
import { RELEASE_BATCH, WindowRepo } from './window.repo';
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

/** At most this many pages per pass (RELEASE_BATCH each): the rest wait for the next tick. */
const RELEASE_PAGES = 10;
const last4 = (phone: string): string => `…${phone.slice(-4)}`;
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

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
    expire: (at) => this.expire(at.row),
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
      const out = await this.hold(at);
      // Not held (not ready now, or moved): fail it as planned, never left marked SENDING.
      return out === 'skipped' ? null : out;
    } catch (e) {
      this.log.warn(`hold failed for ${last4(at.row.phone_e164)}: ${messageOf(e)}`);
      return null;
    }
  }

  /** Every waiting row whose family has written on the chat line since: due now. Never throws. */
  async release(): Promise<number> {
    try {
      const released = await this.releaseFrom(null, RELEASE_PAGES);
      if (released > 0) this.log.log(`released ${released} held message(s)`);
      return released;
    } catch (e) {
      this.log.error(`held messages release failed: ${messageOf(e)}`);
      return 0;
    }
  }

  /** One page (after `after`), then the next while pages are full: at most `pages` per pass. */
  private async releaseFrom(after: string | null, pages: number): Promise<number> {
    const rows = await this.repo.waiting(after);
    const inbound = await this.repo.lastChatInbound([...new Set(rows.map((r) => r.phone_e164))]);
    const released = await this.repo.release(answered(rows, inbound));
    const next = rows.length === RELEASE_BATCH && pages > 1 ? rows.at(-1)?.created_at : undefined;
    return next ? released + (await this.releaseFrom(next, pages - 1)) : released;
  }

  private async hold(at: WindowAt): Promise<HoldOutcome> {
    if (!this.ready(at)) return 'skipped';
    const until = new Date(Date.parse(at.row.created_at ?? at.now.toISOString()) + HOLD_MS);
    if (until <= at.now) return this.expire(at.row);
    const template = await this.reopenTemplate();
    if (!template) return this.unavailable(at.row);
    await this.request(at, template.key);
    const from = expectedCode(at.row);
    const held = await this.repo.hold({ id: at.row.id, from, since: new Date(), until });
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

  /** One reopen template per phone per 24 h (or while an older one is queued), deduped per day. */
  private async request(at: WindowAt, key: string): Promise<void> {
    const { row, now } = at;
    if (await this.repo.reopenSince(row.phone_e164, new Date(now.getTime() - DAY_MS))) return;
    await this.repo.queueReopen(reopenRow(row, key, now));
    this.log.log(`reopen template ${key} queued for ${last4(row.phone_e164)}`);
  }

  private async unavailable(row: DueMessage): Promise<HoldOutcome> {
    await this.repo.fail(row.id, { ...UNAVAILABLE, from: expectedCode(row) });
    return 'failed';
  }

  private async expire(row: DueMessage): Promise<HoldOutcome> {
    await this.repo.fail(row.id, { ...EXPIRED, from: expectedCode(row) });
    return 'expired';
  }
}
