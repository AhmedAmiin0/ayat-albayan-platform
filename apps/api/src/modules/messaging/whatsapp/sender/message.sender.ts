import {
  Inject, Injectable, Logger, Optional, type BeforeApplicationShutdown,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { stopWithin } from '@/common/jobs';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { loadEnv } from '@/config/env/env';
import type { KickOptions } from '@/config/role/kick-options';
import { MessageWorker } from './message.worker';
import { routeOf } from '@/modules/messaging/whatsapp/numbers/number-route';
import { NumberRoutes } from '@/modules/messaging/whatsapp/numbers/number-routes';
import { lineOf } from './send-line';
import { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { SenderRepo } from './sender.repo';
import { onPaceDue } from './pace';
import {
  emptySummary, reportPass, type NumbersPassInput, type PassNumbers, type PassOptions,
  type SenderRun, type SendSummary,
} from './pass';
import {
  drainLanes, LaneLocks, LaneTickers, pooledKeys, type PassItem, type PassRun,
} from './drain';
import { senderTiming } from './sender-timing';
import { BackgroundJob } from '@/config/role/background-job';

/** 50 per pass; lanes in parallel, one row at a time per lane unless pooled (drain/). */
const BATCH = 50;

export type { SendSummary } from './pass';

/**
 * The outbound sender (R-MSG-01/02, docs/12 §3.3): drains due queued `messages`. Gate closed →
 * nothing is read, rows wait; it is asked again before every row. Two lanes (docs/42 42-7), each
 * single-flight: `chat` never waits behind a `main` burst. Safe across instances (each row is
 * claimed by compare-and-set). Module mode (docs/23c) routes each row to a number.
 */
@BackgroundJob({ name: 'message-sender', kick: 'kick' })
@Injectable()
export class MessageSender implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly log = new Logger(MessageSender.name);
  private readonly tickers = new LaneTickers(MessageSender.name, (lane, kicked) =>
    this.runOnce(new Date(), { lane, kicked }));
  private readonly locks = new LaneLocks();

  constructor(
    private readonly gate: SendGate,
    private readonly queries: SenderRepo,
    private readonly worker: MessageWorker,
    /** Absent = module mode sends nothing. */
    @Optional() @Inject(NumberRoutes) private readonly routes?: NumberRoutes,
  ) {}

  onApplicationBootstrap(): void {
    this.tickers.start(senderTiming(loadEnv().MESSAGE_SENDER_POLL_MS));
    onPaceDue(() => void this.kick()); // an Evolution row's own slot (pace/): due before the poll
  }

  /** A deploy waits (bounded) for the row between its claim and 'sent' (BE-14). */
  async beforeApplicationShutdown(): Promise<void> {
    await stopWithin(this.tickers);
  }

  /** Run now (an enqueue, an admin retry): the named lane, or both; mid-run, exactly one more. */
  kick(options: KickOptions = {}): Promise<void> {
    return this.tickers.kick(options.lane);
  }

  /** One pass over the due rows (of `lane`). Never throws. A kick skips the idle probe (42-4). */
  async runOnce(now = new Date(), options: PassOptions = {}): Promise<SendSummary> {
    const summary = emptySummary();
    const opened = await this.passes(summary, now, options).catch((e: unknown) => {
      this.log.error(`send pass aborted: ${e instanceof Error ? e.message : String(e)}`);
      return true;
    });
    return opened ? this.report(summary) : summary;
  }

  /** false = the gate is closed: nothing was read, nothing is reported. */
  private async passes(summary: SendSummary, now: Date, options: PassOptions): Promise<boolean> {
    const gate = await this.gate.switches();
    if (!gate.open) return false;
    // Automatic messages OFF: hold every job-made row first, read by due() or not (unapproved).
    if (!gate.automaticOn) summary.held += await this.queries.holdAutomatic();
    await this.worker.release(); // held texts the family answered (window/): due again
    if (!(await this.anyWork(options, now))) return true;
    const run: SenderRun = { summary, paused: new Set<string>(), lane: options.lane };
    await this.pass(run, now);
    // A text just held queued its reopen template: one more pass sends it now, not next tick.
    if (summary.waiting > 0) await this.pass(run, new Date());
    return true;
  }

  /** Idle (the usual tick): one cheap read (of its lane) instead of the templates + the queue. */
  private async anyWork(options: PassOptions, now: Date): Promise<boolean> {
    if (options.kicked) return true;
    return this.queries.anyDue(now, options.lane);
  }

  private pass(run: SenderRun, now: Date): Promise<void> {
    const numbers = overlayNumbers();
    if (numbers === null) return this.linesPass(run, now);
    return this.numbersPass({ run, now, numbers });
  }

  private due(run: SenderRun, input: { keys: string[]; now: Date }) {
    return this.queries.due({ ...input, limit: BATCH, ...(run.lane ? { lane: run.lane } : {}) });
  }

  /** Legacy (comms_source = legacy): line by line. */
  private async linesPass(run: SenderRun, now: Date): Promise<void> {
    const templates = new Map((await this.queries.approvedTemplates()).map((t) => [t.key, t]));
    const rows = await this.due(run, { keys: [...templates.keys()], now });
    const chatOn = this.queries.chatConfigured;
    await this.drain(run, null, rows.map((row) => {
      const template = templates.get(row.template_key ?? '') ?? null;
      return { job: { row, template, now }, pause: lineOf(row, template, chatOn) };
    }));
  }

  /**
   * Module mode (docs/23c): each row's number from routeOf (none = the worker leaves it queued). A
   * broken token pauses that NUMBER for the rest of the pass; the role's other numbers keep going.
   */
  private async numbersPass(input: NumbersPassInput): Promise<void> {
    const { run, now } = input;
    if (!this.routes) return;
    const { pass, templates: rows } = await this.routes.pass(input.numbers);
    const templates = new Map(rows.map((t) => [t.key, t]));
    const due = await this.due(run, { keys: [...templates.keys()], now });
    await this.drain(run, input.numbers, due.map((row) => {
      const template = templates.get(row.template_key ?? '') ?? null;
      const route = routeOf(pass, { row, template });
      return { job: { row, template, now, route }, pause: route?.numberId ?? null };
    }));
  }

  /** drain/: lanes by pause key in parallel, the switches read before every row. */
  private drain(run: PassRun, numbers: PassNumbers, items: PassItem[]): Promise<void> {
    const size = loadEnv().MESSAGE_SENDER_CONCURRENCY;
    const pooled = pooledKeys(numbers);
    const stopping = () => this.tickers.stopping;
    const { gate, worker, locks } = this;
    const deps = { gate, worker, locks, pooled, size, stopping };
    return drainLanes(deps, run, items);
  }

  private report(summary: SendSummary): SendSummary {
    return reportPass(this.log, summary);
  }
}
