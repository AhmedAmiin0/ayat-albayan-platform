import { SETTING_DEFAULTS } from '@ab/shared';
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import { ExpensesQueries } from './expenses.queries';

const EVERY_MS = 6 * 3_600_000;
/** Not on boot: every API test boots AppModule (the AlertsJob rule). */
const FIRST_RUN_MS = 10 * 60_000;

/** The first day of the month after `now` in `tz` (settings.academy_timezone), YYYY-MM-01. */
export function nextMonthStart(now: Date, tz: string = SETTING_DEFAULTS.academy_timezone): string {
  const [y = 0, m = 1] = now.toLocaleDateString('en-CA', { timeZone: tz }).split('-').map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}

/**
 * «تكرار شهري»: every few hours, copies each recurring expense of this month into next month as a
 * draft (create_recurring_expense_drafts). Idempotent: unique (template_id, month), so the same
 * month is never pre-created twice. ponytail: in-process timer like AlertsJob; pg_cron when it scales.
 */
@Injectable()
export class ExpensesJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(ExpensesJob.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly expenses: ExpensesQueries,
    private readonly settings: SettingsService,
  ) {}

  onApplicationBootstrap(): void {
    const tick = () => void this.runOnce();
    this.timers.push(setTimeout(tick, FIRST_RUN_MS).unref(), setInterval(tick, EVERY_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /** Never throws; the number of drafts written. */
  async runOnce(now = new Date()): Promise<number> {
    try {
      const { academy_timezone: tz } = await this.settings.all();
      return await this.expenses.createRecurringDrafts(nextMonthStart(now, tz));
    } catch (e) {
      this.log.error(`recurring expenses failed: ${String(e)}`);
      return 0;
    }
  }
}
