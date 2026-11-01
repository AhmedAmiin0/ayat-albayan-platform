import { riyadhToday } from '@ab/shared';
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { BackgroundJob } from '@/config/role/background-job';
import { CoursePauseRepo } from './course-pause.repo';
import { CoursePauseService } from './course-pause.service';

const HOUR_MS = 3_600_000;
/** Not on boot: every API test boots AppModule. */
const FIRST_RUN_MS = 6 * 60_000;

type ResumeSummary = { begun: number; due: number; resumed: number; failed: number };

/**
 * The pause calendar (docs/11 §7b), hourly with the job as actor null: a pause from a later day begins on its from
 * day (course_pause_begin: rules, package and student paused), and every open pause whose until day is before
 * Riyadh today is resumed as of the day after it (the automatic «استئناف»). Idempotent: each RPC locks the pause
 * and one already begun / resumed changes nothing (the dates move exactly once), so a re-run is harmless.
 */
@BackgroundJob({ name: 'course-pause-resume' })
@Injectable()
export class CoursePauseJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(CoursePauseJob.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly queries: CoursePauseRepo,
    private readonly pauses: CoursePauseService,
  ) {}

  onApplicationBootstrap(): void {
    const tick = () => void this.runOnce();
    this.timers.push(setTimeout(tick, FIRST_RUN_MS).unref(), setInterval(tick, HOUR_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /** One pass. Never throws: one bad pause does not stop the others. */
  async runOnce(now = new Date()): Promise<ResumeSummary> {
    const summary: ResumeSummary = { begun: 0, due: 0, resumed: 0, failed: 0 };
    const today = riyadhToday(now);
    try {
      for (const id of await this.queries.dueStarts(today)) {
        if (await this.step(() => this.pauses.beginPause(id), id)) summary.begun += 1;
        else summary.failed += 1;
      }
      const due = await this.queries.due(today);
      summary.due = due.length;
      for (const id of due) {
        if (await this.step(() => this.pauses.resumePause(id, null), id)) summary.resumed += 1;
        else summary.failed += 1;
      }
    } catch (e) {
      this.log.error(`course pause pass aborted: ${String(e)}`);
    }
    if (summary.begun + summary.due > 0) this.log.log(`course pause pass: ${JSON.stringify(summary)}`);
    return summary;
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
