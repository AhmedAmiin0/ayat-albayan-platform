import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { addDays } from './horizon';
import { OccurrenceGenerator } from './occurrence-generator';
import { ScheduleQueries } from '@/modules/teaching/scheduling/schedule.queries';
import { SchedulingSettings } from '@/modules/teaching/scheduling/scheduling.settings';
import { BackgroundJob } from '@/config/role/background-job';

const DAY_MS = 86_400_000;
/** Not on boot: every API test boots AppModule, and a restart loop must not hammer the DB. */
const FIRST_RUN_MS = 5 * 60_000;

export type RunSummary = { rules: number; inserted: number; failed: number; ended: number };

/**
 * Daily horizon refresh (R-SCH-02): ends the rules whose end date has passed (R-SCH-07), then
 * tops every active rule up to booking_horizon_weeks ahead; the generator flags clashes (R-SCH-04).
 * ponytail: in-process timer on the single API instance, no advisory lock. A second instance
 * only repeats work: inserts are `on conflict do nothing` and each rule is row-locked while it
 * is generated, so nothing duplicates. Move to pg_cron / pg-boss when the API scales out.
 */
@BackgroundJob({ name: 'horizon' })
@Injectable()
export class HorizonJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(HorizonJob.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly rules: ScheduleQueries,
    private readonly generator: OccurrenceGenerator,
    private readonly settings: SchedulingSettings,
  ) {}

  onApplicationBootstrap(): void {
    const tick = () => void this.runOnce();
    this.timers.push(setTimeout(tick, FIRST_RUN_MS).unref(), setInterval(tick, DAY_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /** One pass over the active rules. Never throws: one bad rule doesn't stop the others. */
  async runOnce(now = new Date()): Promise<RunSummary> {
    const summary: RunSummary = { rules: 0, inserted: 0, failed: 0, ended: 0 };
    try {
      const weeks = (await this.settings.read()).booking_horizon_weeks;
      // UTC yesterday: every tz's local date is at least this, so no rule ends a day early.
      const today = addDays(now.toISOString().slice(0, 10), -1);
      summary.ended = await this.rules.endExpired(today);
      for (const { id } of await this.rules.activeRuleIds(today)) {
        summary.rules += 1;
        const inserted = await this.refresh(id, { weeks, now });
        summary.inserted += inserted ?? 0;
        summary.failed += Number(inserted === null);
      }
    } catch (e) {
      this.log.error(`horizon refresh aborted: ${String(e)}`);
    }
    this.log.log(`horizon refresh: ${JSON.stringify(summary)}`);
    return summary;
  }

  /** One rule topped up: lessons inserted (0 once it is not active), null when it failed. */
  private async refresh(id: string, o: { weeks: number; now: Date }): Promise<number | null> {
    try {
      const rule = await this.rules.rule(id);
      if (rule?.status !== 'active') return 0;
      const options = { weeks: o.weeks, actorId: null, now: o.now };
      const { lessons } = await this.generator.topUp(rule, options);
      return lessons.length;
    } catch (e) {
      this.log.warn(`horizon refresh failed for rule ${id}: ${String(e)}`);
      return null;
    }
  }
}
