import { SETTING_DEFAULTS } from '@ab/settings';
import { addCalendarMonths, localDateIn } from '@ab/time';
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { ExpensesRepo } from './expenses.repo';
import { ExpensesSettings } from './expenses.settings';
import { BackgroundJob } from '@/config/role/background-job';
import { beatTick } from '@/common/jobs/beats';

const EVERY_MS = 6 * 3_600_000;
/** Not on boot: every API test boots AppModule (the AlertsJob rule). */
const FIRST_RUN_MS = 10 * 60_000;

/** The first day of the month after `now` in `tz` (settings.academy_timezone), YYYY-MM-01. */
export function nextMonthStart(now: Date, tz: string = SETTING_DEFAULTS.academy_timezone): string {
  return addCalendarMonths(localDateIn(now, tz), 1);
}

/** Copies recurring expenses into next month as drafts; unique (template_id, month) dedups. */
@BackgroundJob({ name: 'expenses' })
@Injectable()
export class ExpensesJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(ExpensesJob.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly expenses: ExpensesRepo,
    private readonly settings: ExpensesSettings,
  ) {}

  onApplicationBootstrap(): void {
    const plan = { name: ExpensesJob.name, firstMs: FIRST_RUN_MS, everyMs: EVERY_MS };
    const tick = beatTick(plan, () => this.runOnce());
    this.timers.push(setTimeout(tick, FIRST_RUN_MS).unref(), setInterval(tick, EVERY_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /** Never throws; the number of drafts written. */
  async runOnce(now = new Date()): Promise<number> {
    try {
      const { academy_timezone: tz } = await this.settings.read();
      return await this.expenses.createRecurringDrafts(nextMonthStart(now, tz));
    } catch (e) {
      this.log.error(`recurring expenses failed: ${String(e)}`);
      return 0;
    }
  }
}
