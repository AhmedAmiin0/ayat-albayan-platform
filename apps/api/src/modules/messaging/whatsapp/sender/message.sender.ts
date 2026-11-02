import {
  Inject, Injectable, Logger, Optional, type OnApplicationBootstrap, type OnModuleDestroy,
} from '@nestjs/common';
import { overlayNumbers, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { loadEnv } from '@/config/env/env';
import { MessageWorker, type PassJob, type SendOutcome } from './message.worker';
import { routeOf } from '@/modules/messaging/whatsapp/numbers/number-route';
import { NumberRoutes } from '@/modules/messaging/whatsapp/numbers/number-routes';
import { lineOf } from './send-line';
import { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { SenderRepo } from './sender.repo';
import { SENDER_FIRST_RUN_MS, SENDER_POLL_MS, senderTiming } from './sender-timing';
import { Ticker } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';

/** ponytail: 50 per pass, one at a time; batch the Graph calls if volume ever needs it. */
const BATCH = 50;

export type SendSummary = Record<SendOutcome, number>;
const EMPTY: SendSummary = {
  sent: 0, retry: 0, failed: 0, expired: 0, stale: 0, held: 0, paused: 0, skipped: 0, waiting: 0,
};

/** One due row of a pass and the line (legacy) or number (module mode) a pause applies to. */
interface PassItem { job: PassJob; pause: string | null }

/**
 * The outbound sender (R-MSG-01/02, docs/12 §3.3): drains due queued `messages` (a session text or
 * an approved template). Gate closed (config or kill switch) → nothing is read, rows wait; it is
 * asked again before every row. Single-flight; safe across instances (each row is claimed by
 * compare-and-set). Module mode (docs/23c) routes each row to a number; legacy is today's pass.
 */
@BackgroundJob({ name: 'message-sender', kick: 'kick' })
@Injectable()
export class MessageSender implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(MessageSender.name);
  /** Timers kick too: a tick during a run queues one more, as an enqueue does. */
  private readonly ticker = new Ticker({
    name: MessageSender.name,
    firstMs: SENDER_FIRST_RUN_MS,
    everyMs: SENDER_POLL_MS,
    run: () => this.runOnce(),
    timer: 'kick',
  });

  constructor(
    private readonly gate: SendGate,
    private readonly queries: SenderRepo,
    private readonly worker: MessageWorker,
    /** Absent = module mode sends nothing. */
    @Optional() @Inject(NumberRoutes) private readonly routes?: NumberRoutes,
  ) {}

  onApplicationBootstrap(): void {
    this.ticker.start(senderTiming(loadEnv().MESSAGE_SENDER_POLL_MS));
  }

  onModuleDestroy(): void {
    this.ticker.stop();
  }

  /** Run now (after an enqueue or an admin retry); a kick during a run queues exactly one more. */
  kick(): Promise<void> {
    return this.ticker.kick();
  }

  /** One pass over the due rows. Never throws. */
  async runOnce(now = new Date()): Promise<SendSummary> {
    const summary: SendSummary = { ...EMPTY };
    try {
      const gate = await this.gate.switches();
      if (!gate.open) return summary;
      // Automatic messages OFF: hold every job-made row first, read by due() or not (unapproved template).
      if (!gate.automaticOn) summary.held += await this.queries.holdAutomatic();
      await this.worker.release(); // held texts the family answered (window/): due again
      // Idle (the usual tick): one cheap read instead of the templates + the queue (+ the routes).
      if (!(await this.queries.anyDue(now))) return this.report(summary);
      await this.pass(summary, now);
      // A text just held queued its reopen template: one more pass sends it now, not next tick.
      if (summary.waiting > 0) await this.pass(summary, new Date());
    } catch (e) {
      this.log.error(`send pass aborted: ${e instanceof Error ? e.message : String(e)}`);
    }
    return this.report(summary);
  }

  private pass(summary: SendSummary, now: Date): Promise<void> {
    const numbers = overlayNumbers();
    if (numbers === null) return this.linesPass(summary, now);
    return this.numbersPass({ summary, now, numbers });
  }

  /** Legacy (comms_source = legacy): today's pass, line by line. */
  private async linesPass(summary: SendSummary, now: Date): Promise<void> {
    const templates = new Map((await this.queries.approvedTemplates()).map((t) => [t.key, t]));
    const rows = await this.queries.due({ keys: [...templates.keys()], now, limit: BATCH });
    await this.drain(summary, rows.map((row) => {
      const template = templates.get(row.template_key ?? '') ?? null;
      return { job: { row, template, now }, pause: lineOf(row, template, this.queries.chatConfigured) };
    }));
  }

  /**
   * Module mode (docs/23c): each row's number from routeOf (none = the worker leaves it queued). A
   * broken token pauses that NUMBER for the rest of the pass; the role's other numbers keep sending.
   */
  private async numbersPass(input: { summary: SendSummary; now: Date; numbers: readonly OverlayNumber[] }): Promise<void> {
    const { summary, now } = input;
    if (!this.routes) return;
    const { pass, templates: rows } = await this.routes.pass(input.numbers);
    const templates = new Map(rows.map((t) => [t.key, t]));
    const due = await this.queries.due({ keys: [...templates.keys()], now, limit: BATCH });
    await this.drain(summary, due.map((row) => {
      const template = templates.get(row.template_key ?? '') ?? null;
      const route = routeOf(pass, { row, template });
      return { job: { row, template, now, route }, pause: route?.numberId ?? null };
    }));
  }

  /**
   * A broken token (or Meta's 131042) pauses ITS line (number) for the rest of the pass; the other
   * keeps sending. A 131042-held line's later rows in the batch are deferred in one write.
   */
  private async drain(summary: SendSummary, items: readonly PassItem[]): Promise<void> {
    const paused = new Set<string>();
    for (const [i, { job, pause }] of items.entries()) {
      if (pause !== null && paused.has(pause)) continue;
      // Both switches are read (one uncached read) before every row, so OFF stops a long pass at once (docs/09).
      const gate = await this.gate.switches();
      if (!gate.open) break;
      const outcome = await this.worker.process({ ...job, autoOn: gate.automaticOn });
      summary[outcome] += 1;
      if (outcome !== 'paused' || pause === null) continue;
      paused.add(pause);
      const rest = items.slice(i + 1).filter((o) => o.pause === pause);
      await this.worker.deferRest(job, rest.map((o) => o.job.row));
    }
  }

  /** Logged only when a pass did something (skipped rows alone stay quiet). */
  private report(summary: SendSummary): SendSummary {
    if (Object.entries(summary).some(([outcome, n]) => outcome !== 'skipped' && n > 0)) {
      this.log.log(`outbound messages: ${JSON.stringify(summary)}`);
    }
    return summary;
  }
}
