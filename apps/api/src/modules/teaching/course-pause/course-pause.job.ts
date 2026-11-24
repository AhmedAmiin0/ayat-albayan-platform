import { riyadhToday } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { Ticker, TickerJob } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import { CoursePauseRepo } from './course-pause.repo';
import { CoursePauseService } from './course-pause.service';

const HOUR_MS = 3_600_000;
/** Not on boot: every API test boots AppModule. */
const FIRST_RUN_MS = 6 * 60_000;

interface ResumeSummary {
  begun: number;
  due: number;
  resumed: number;
  failed: number;
}

/** Pause calendar (docs/11 §7b), hourly: idempotent, each RPC locks the pause; dates move once. */
@BackgroundJob({ name: 'course-pause-resume' })
@Injectable()
export class CoursePauseJob extends TickerJob {
  private readonly log = new Logger(CoursePauseJob.name);
  protected readonly ticker = new Ticker({
    name: CoursePauseJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: HOUR_MS,
    run: () => this.runOnce(),
  });

  constructor(
    private readonly queries: CoursePauseRepo,
    private readonly pauses: CoursePauseService,
  ) {
    super();
  }

  /** One pass. Never throws: one bad pause does not stop the others. */
  async runOnce(now = new Date()): Promise<ResumeSummary> {
    const summary: ResumeSummary = { begun: 0, due: 0, resumed: 0, failed: 0 };
    const today = riyadhToday(now);
    try {
      const starts = await this.queries.dueStarts(today);
      const begun = await this.steps(starts, (id) => this.pauses.beginPause(id));
      Object.assign(summary, { begun, failed: starts.length - begun });
      const due = await this.queries.due(today);
      summary.due = due.length;
      const resumed = await this.steps(due, (id) => this.pauses.resumePause(id, null));
      Object.assign(summary, { resumed, failed: summary.failed + due.length - resumed });
    } catch (e) {
      this.log.error(`course pause pass aborted: ${String(e)}`);
    }
    if (summary.begun + summary.due > 0) this.log.log(`course pause pass: ${JSON.stringify(summary)}`);
    return summary;
  }

  /** Runs `run` for each id in turn; how many succeeded (a failure is logged, never thrown). */
  private async steps(ids: string[], run: (id: string) => Promise<unknown>): Promise<number> {
    let ok = 0;
    for (const id of ids) ok += Number(await this.step(() => run(id), id));
    return ok;
  }

  private async step(run: () => Promise<unknown>, id: string): Promise<boolean> {
    try {
      await run();
      return true;
    } catch (e) {
      this.log.warn(`course pause ${id} not updated: ${String(e)}`);
      return false;
    }
  }
}
