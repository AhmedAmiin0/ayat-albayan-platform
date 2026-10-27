import { retry } from '@ab/shared';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { sleep } from '../../../common/async/sleep';
import { NotificationPolicy } from '../../messaging/notification-rules/policy/policy';
import { ReportPdfPublisher } from './report-pdf.publisher';
import { ReportPdfQueries } from './report-pdf.queries';
import { BackgroundJob } from '../../../config/role/background-job';

const POLL_MS = 60_000;
/** Soon after boot, not at once: every API test boots AppModule (as HorizonJob notes). */
const FIRST_RUN_MS = 30_000;
/** ponytail: 20 a minute is far above a few dozen reports a day; loop the batch if that changes. */
const BATCH = 20;
/** A `rendering` row older than this was orphaned by a crash or a deploy. */
const STALE_MS = 10 * 60_000;
/** Three attempts per claim, 2 s then 8 s apart; then `failed` and the admin retries (R12). */
export const RETRY_DELAYS_MS = [2_000, 8_000] as const;

export type RunSummary = { recovered: number; rendered: number; failed: number; skipped: number; held: number };
type Outcome = 'rendered' | 'failed' | 'skipped' | 'held';

/** The notification rules could not be read: hold the report (back to pending), never fail or send it. */
export class RulesUnreadError extends Error {
  constructor() {
    super('notification rules unread: report_ready held for the next run');
  }
}

/**
 * R-REP-03 report PDF worker (docs/11 §5): claims `pending` reports one by one, renders the
 * template with Chromium, uploads reports/{student_id}/{lesson_id}.pdf (overwrite), queues the
 * guardian's report_ready message, then marks the claimed version `ready`. Idempotent by report
 * id + version: every state change is a compare-and-set, the message is deduped per report.
 * In-process and single-flight; safe across instances because the claim is atomic per row.
 */
@BackgroundJob({ name: 'report-pdf', kick: 'kick' })
@Injectable()
export class ReportPdfJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(ReportPdfJob.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private running: Promise<void> | null = null;
  private again = false;
  /** Backoff wait; tests replace it. */
  wait: (ms: number) => Promise<void> = sleep;

  constructor(
    private readonly queries: ReportPdfQueries,
    private readonly publisher: ReportPdfPublisher,
    private readonly policy: NotificationPolicy,
  ) {}

  onApplicationBootstrap(): void {
    const tick = () => void this.kick();
    this.timers.push(setTimeout(tick, FIRST_RUN_MS).unref(), setInterval(tick, POLL_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /**
   * Run now (after a submit or an admin retry) instead of waiting for the next tick. A kick during
   * a run queues exactly one more run, so a report submitted mid-run is not left for a minute.
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

  /** One pass over the queue. Never throws. */
  async runOnce(now = new Date()): Promise<RunSummary> {
    const summary: RunSummary = { recovered: 0, rendered: 0, failed: 0, skipped: 0, held: 0 };
    try {
      // Idle (the usual tick): one cheap read, no stale-recovery update and no pending read.
      if (!(await this.queries.hasWork())) return summary;
      summary.recovered = await this.queries.recoverStale(new Date(now.getTime() - STALE_MS));
      for (const id of await this.queries.pendingIds(BATCH)) {
        summary[await this.process(id)] += 1;
      }
    } catch (e) {
      this.log.error(`report PDF run aborted: ${String(e)}`);
    } finally {
      if (summary.rendered + summary.failed + summary.held > 0) await this.publisher.close();
    }
    if (summary.recovered + summary.rendered + summary.failed + summary.held > 0) {
      this.log.log(`report PDFs: ${JSON.stringify(summary)}`);
    }
    return summary;
  }

  private async process(id: string): Promise<Outcome> {
    const version = await this.queries.claim(id);
    if (version === null) return 'skipped';
    try {
      const giveUp = (e: unknown) => e instanceof RulesUnreadError;
      await retry(() => this.publish(id, version), { delays: RETRY_DELAYS_MS, sleep: this.wait, giveUp });
      return 'rendered';
    } catch (e) {
      if (e instanceof RulesUnreadError) {
        this.log.warn(`report ${id} v${version} held: ${e.message}`);
        await this.queries.finish({ id, version, status: 'pending' });
        return 'held';
      }
      const error = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      this.log.warn(`report ${id} v${version} PDF failed: ${error}`);
      await this.queries.finish({ id, version, status: 'failed', error });
      return 'failed';
    }
  }

  /**
   * Upload, then queue the message, then `ready`: a crash in between leaves `rendering`, which the
   * stale sweep re-queues; the re-render overwrites the same object and the message insert no-ops.
   * The message only while the report_ready rule is on (off: the PDF is still ready, logged). Unreadable
   * rules throw RulesUnreadError before `ready`: process() puts the row back to `pending` (not `failed`),
   * so a later run renders and sends it once the rules read: an essential row is never dropped.
   */
  private async publish(id: string, version: number): Promise<void> {
    const { path, message } = await this.publisher.publish(id, new Date());
    const rule = await this.policy.known('report_ready');
    if (!rule) throw new RulesUnreadError();
    if (rule.enabled) await this.queries.queueMessage(message);
    else this.log.log(`report_ready off: report ${id} v${version} not sent to the guardian`);
    if (!(await this.queries.finish({ id, version, status: 'ready', path }))) {
      this.log.log(`report ${id} changed while v${version} rendered; the newer version renders next`);
    }
  }
}
