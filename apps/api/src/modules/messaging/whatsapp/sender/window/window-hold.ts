import type { WaLine } from '@ab/shared';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  MessageDispatch,
  type SendVia,
} from '@/modules/messaging/whatsapp/sender/message.dispatch';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import { KapsoHold } from './kapso-hold';
import { ReopenRequest } from './reopen-request';
import { heldStep, holdable } from './window-rules';
import { checkedAt, EXPIRED, expectedCode, holdDeadline, type FailWhy } from './window-reopen';
import { WindowRelease } from './window-release';
import { WindowRepo } from './window.repo';

export { isWindowClosedError } from './window-rules';

/** What the hold returns to the worker: held, failed for good, expired, or not now. */
type HoldOutcome = 'waiting' | 'failed' | 'expired' | 'skipped';

/** One row where the worker is: its line, and its number in module mode (absent under legacy). */
interface WindowAt {
  row: DueMessage;
  now: Date;
  line: WaLine;
  route?: NumberRoute | null;
}

const last4 = (phone: string): string => `…${phone.slice(-4)}`;
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * The 24 h window on the chat line (owner 2026-11-03, «not sent after 24h»). A staff text whose
 * window is closed (the inbox marked it AWAITING_REPLY, or WhatsApp refused it: Kapso 422 / Meta
 * 131047) is never sent as free text: ONE reopen template (`chat_reopen_template`, reopenUsable)
 * is pending or sent for that phone per 24 h (ReopenRequest), and the text is held until the
 * family writes on the chat line (WindowRelease), then sent through the normal sender and its
 * gates. No reopen live and none can be queued: it fails at once. After 7 days it fails.
 * The worker only runs with the send gate open; a phone off the allow-list or an unconfigured
 * line holds nothing and queues nothing (ready). «بدون قالب» (owner 2026-11-06): no template, the
 * text waits all the same. Each hold on a Kapso line reopens Kapso's conversation once (KapsoHold).
 */
@Injectable()
export class WindowHold {
  private readonly log = new Logger('WindowHold');
  /** Property-injected (the constructor is at its limit); absent (a bare test): no Kapso PATCH. */
  @Optional() @Inject(KapsoHold) kapso?: KapsoHold;

  constructor(
    private readonly repo: WindowRepo,
    private readonly reopen: ReopenRequest,
    private readonly releases: WindowRelease,
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
  release(): Promise<number> {
    return this.releases.run();
  }

  private async hold(at: WindowAt): Promise<HoldOutcome> {
    if (!this.ready(at)) return 'skipped';
    const until = holdDeadline(at.row, at.now);
    if (until <= at.now) return this.expire(at.row);
    const plan = await this.reopen.ensure(at.row, at.now);
    if (plan.fail) return this.refuse(at.row, plan.fail);
    const since = checkedAt(at.row, at.now);
    const from = expectedCode(at.row);
    const held = await this.repo.hold({ id: at.row.id, from, since, until, note: plan.note });
    if (!held) return 'skipped';
    await this.reopenKapso(at, plan.note);
    return 'waiting';
  }

  /** Once per hold, after it is written: a Kapso failure is noted on the row, never blocks it. */
  private async reopenKapso(at: WindowAt, note: string | null): Promise<void> {
    try {
      const failed = await this.kapso?.reopen({ ...at, phone: at.row.phone_e164 });
      const text = [note, failed].filter(Boolean).join('; ');
      if (failed) await this.repo.note(at.row.id, text);
    } catch (e) {
      this.log.warn(`Kapso note not kept for ${last4(at.row.phone_e164)}: ${messageOf(e)}`);
    }
  }

  /** The line (number) can send to this phone now: configured and on the allow-list. */
  private ready(at: WindowAt): boolean {
    const via: SendVia | null = at.route === undefined ? at.line : at.route;
    return via !== null && this.dispatch.ready(at.row, via);
  }

  /** No reopen template can reach the family: failed now, with why (unavailable / failed). */
  private async refuse(row: DueMessage, why: FailWhy): Promise<HoldOutcome> {
    await this.repo.fail([row.id], { ...why, from: expectedCode(row) });
    this.log.warn(`held text not kept for ${last4(row.phone_e164)}: ${why.code}`);
    return 'failed';
  }

  private async expire(row: DueMessage): Promise<HoldOutcome> {
    await this.repo.fail([row.id], { ...EXPIRED, from: expectedCode(row) });
    return 'expired';
  }
}
