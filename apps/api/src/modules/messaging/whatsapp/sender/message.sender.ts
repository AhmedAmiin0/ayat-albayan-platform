import {
  Inject, Injectable, Logger, Optional, type OnApplicationBootstrap, type OnModuleDestroy,
} from '@nestjs/common';
import { overlayNumbers, type OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { loadEnv } from '@/config/env/env';
import type { KickOptions } from '@/config/role/kick-options';
import { MessageWorker } from './message.worker';
import { routeOf } from '@/modules/messaging/whatsapp/numbers/number-route';
import { NumberRoutes } from '@/modules/messaging/whatsapp/numbers/number-routes';
import { lineOf } from './send-line';
import { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { SenderRepo } from './sender.repo';
import { onPaceDue } from './pace';
import { emptySummary, reportPass, type SendSummary } from './pass';
import {
  drainLanes, LaneLocks, LaneTickers, pooledKeys, type Lane, type PassItem, type PassRun,
} from './drain';
import { senderTiming } from './sender-timing';
import { BackgroundJob } from '@/config/role/background-job';

/** ponytail: 50 per pass; lanes in parallel, one row at a time per lane unless pooled (drain/). */
const BATCH = 50;

export type { SendSummary } from './pass';

/** A runOnce: its lane (absent = every row, as before the lanes) and whether a kick started it. */
interface PassOptions { lane?: Lane; kicked?: boolean }
type SenderRun = PassRun & { lane?: Lane };
type Numbers = readonly OverlayNumber[] | null;

/**
 * The outbound sender (R-MSG-01/02, docs/12 §3.3): drains due queued `messages` (a session text or
 * an approved template). Gate closed (config or kill switch) → nothing is read, rows wait; it is
 * asked again before every row. Two lanes (docs/42 42-7), each single-flight: `chat` (its own
 * ticker) never waits behind a `main` burst. Safe across instances (each row is claimed by
 * compare-and-set). Module mode (docs/23c) routes each row to a number; legacy is today's pass.
 */
@BackgroundJob({ name: 'message-sender', kick: 'kick' })
@Injectable()
export class MessageSender implements OnApplicationBootstrap, OnModuleDestroy {
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

  onModuleDestroy(): void {
    this.tickers.stop();
  }

  /**
   * Run now (after an enqueue or an admin retry): the named lane, or both. A kick during a lane's
   * run queues exactly one more of it. `wait` matters only on an API copy (worker-kick).
   */
  kick(options: KickOptions = {}): Promise<void> {
    return this.tickers.kick(options.lane);
  }

  /** One pass over the due rows (of `lane`). Never throws. A kick skips the idle probe (42-4). */
  async runOnce(now = new Date(), options: PassOptions = {}): Promise<SendSummary> {
    const summary = emptySummary();
    try {
      const gate = await this.gate.switches();
      if (!gate.open) return summary;
      // Automatic messages OFF: hold every job-made row first, read by due() or not (unapproved template).
      if (!gate.automaticOn) summary.held += await this.queries.holdAutomatic();
      await this.worker.release(); // held texts the family answered (window/): due again
      if (!(await this.anyWork(options, now))) return this.report(summary);
      const run: SenderRun = { summary, paused: new Set<string>(), lane: options.lane };
      await this.pass(run, now);
      // A text just held queued its reopen template: one more pass sends it now, not next tick.
      if (summary.waiting > 0) await this.pass(run, new Date());
    } catch (e) {
      this.log.error(`send pass aborted: ${e instanceof Error ? e.message : String(e)}`);
    }
    return this.report(summary);
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
    await this.drain(run, null, rows.map((row) => {
      const template = templates.get(row.template_key ?? '') ?? null;
      return { job: { row, template, now }, pause: lineOf(row, template, this.queries.chatConfigured) };
    }));
  }

  /**
   * Module mode (docs/23c): each row's number from routeOf (none = the worker leaves it queued). A
   * broken token pauses that NUMBER for the rest of the pass; the role's other numbers keep sending.
   */
  private async numbersPass(input: { run: SenderRun; now: Date; numbers: readonly OverlayNumber[] }): Promise<void> {
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
  private drain(run: PassRun, numbers: Numbers, items: PassItem[]): Promise<void> {
    const size = loadEnv().MESSAGE_SENDER_CONCURRENCY;
    const pooled = pooledKeys(numbers);
    const deps = { gate: this.gate, worker: this.worker, locks: this.locks, pooled, size };
    return drainLanes(deps, run, items);
  }

  private report(summary: SendSummary): SendSummary {
    return reportPass(this.log, summary);
  }
}
