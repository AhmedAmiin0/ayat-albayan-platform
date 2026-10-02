import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import { addDays } from './horizon';
import { OccurrenceGenerator } from './occurrence-generator';
import { ScheduleQueries } from './schedule.queries';

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
@Injectable()
export class HorizonJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(HorizonJob.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly rules: ScheduleQueries,
    private readonly generator: OccurrenceGenerator,
    private readonly settings: SettingsService,
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
      const weeks = await this.settings.bookingHorizonWeeks();
      // UTC yesterday: every tz's local date is at least this, so no rule ends a day early.
      const today = addDays(now.toISOString().slice(0, 10), -1);
      summary.ended = await this.rules.endExpired(today);
      for (const { id } of await this.rules.activeRuleIds(today)) {
        summary.rules += 1;
        try {
          const rule = await this.rules.rule(id);
          if (rule?.status !== 'active') continue;
          const { lessons } = await this.generator.topUp(rule, { weeks, actorId: null, now });
          summary.inserted += lessons.length;
        } catch (e) {
          summary.failed += 1;
          this.log.warn(`horizon refresh failed for rule ${id}: ${String(e)}`);
        }
      }
    } catch (e) {
      this.log.error(`horizon refresh aborted: ${String(e)}`);
    }
    this.log.log(`horizon refresh: ${JSON.stringify(summary)}`);
    return summary;
  }
}
