import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { MessageWorker, type SendOutcome } from './message.worker';
import { SendGate } from './send-gate';
import { SenderQueries } from './sender.queries';

const POLL_MS = 30_000;
/** Soon after boot, not at once: every API test boots AppModule (as ReportPdfJob notes). */
const FIRST_RUN_MS = 30_000;
/** ponytail: 50 per pass, one at a time; batch the Graph calls if volume ever needs it. */
const BATCH = 50;

export type SendSummary = Record<SendOutcome, number>;

/**
 * The outbound sender (R-MSG-01/02, docs/12 §3.3): drains `messages` where status = queued, due,
 * and either a session text or an approved template. Gate closed (env, WhatsApp config or the
 * admin's kill switch) → nothing is read, rows wait; the gate is asked again before every row. In-process and single-flight; safe across
 * instances because each row is claimed by compare-and-set.
 */
@Injectable()
export class MessageSender implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(MessageSender.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private running: Promise<void> | null = null;
  private again = false;

  constructor(
    private readonly gate: SendGate,
    private readonly queries: SenderQueries,
    private readonly worker: MessageWorker,
  ) {}

  onApplicationBootstrap(): void {
    const tick = () => void this.kick();
    this.timers.push(setTimeout(tick, FIRST_RUN_MS).unref(), setInterval(tick, POLL_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /**
   * Run now (after an enqueue or an admin retry) instead of waiting for the next tick. A kick
   * during a run queues exactly one more run.
   */
  kick(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    const loop = async () => {
      do {
        this.again = false;
        await this.runOnce();
      } while (this.again);
    };
    this.running = loop().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** One pass over the due rows. Never throws. */
  async runOnce(now = new Date()): Promise<SendSummary> {
    const summary: SendSummary = { sent: 0, retry: 0, failed: 0, expired: 0, stale: 0, held: 0, paused: 0, skipped: 0 };
    try {
      if (!(await this.gate.open())) return summary;
      const templates = new Map((await this.queries.approvedTemplates()).map((t) => [t.key, t]));
      const autoOn = await this.gate.automaticOn(); // once per pass; the kill switch stays per row
      for (const row of await this.queries.due({ keys: [...templates.keys()], now, limit: BATCH })) {
        // The kill switch is read before every row, so OFF stops a long pass at once (docs/09).
        if (!(await this.gate.open())) break;
        const template = row.template_key ? (templates.get(row.template_key) ?? null) : null;
        const outcome = await this.worker.process({ row, template, now, autoOn });
        summary[outcome] += 1;
        if (outcome === 'paused') break; // a broken token fails every row the same way
      }
    } catch (e) {
      this.log.error(`send pass aborted: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (summary.sent + summary.retry + summary.failed + summary.expired + summary.stale + summary.held + summary.paused > 0) {
      this.log.log(`outbound messages: ${JSON.stringify(summary)}`);
    }
    return summary;
  }
}
