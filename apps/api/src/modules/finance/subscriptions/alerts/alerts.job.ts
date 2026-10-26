import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { LessonEvents } from '../../../../common/events/lesson-events';
import { AlertsQueries } from './alerts.queries';
import { SubscriptionAlertsService } from './alerts.service';

const EVERY_MS = 15 * 60_000;
/** Not on boot: every API test boots AppModule, and a restart loop must not hammer the DB. */
const FIRST_RUN_MS = 5 * 60_000;

/**
 * R-SUB-02 triggers: every lesson change (LessonEvents: attendance, cancel, move, a submitted
 * report) evaluates the lessons' students right away, awaited by the writer, so it stays one
 * balance read per student. The sweep (docs/11 §6) runs every 15 minutes over every student with
 * a package, so a missed event (a failed listener, a direct DB edit) still raises its alert.
 * The sweep also moves a student whose renewal date passed to «بانتظار التجديد» (StudentRenewal), leaving a
 * status the admin set by hand. Idempotent through the dedup keys and the compare-and-set.
 * ponytail: in-process timer on the single API instance, like HorizonJob; pg_cron when it scales.
 */
@Injectable()
export class AlertsJob implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(AlertsJob.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly queries: AlertsQueries,
    private readonly alerts: SubscriptionAlertsService,
    private readonly events: LessonEvents,
  ) {}

  onModuleInit(): void {
    this.events.onChanged((lessonIds) => this.alerts.evaluateLessons(lessonIds));
  }

  onApplicationBootstrap(): void {
    const tick = () => void this.runOnce();
    this.timers.push(setTimeout(tick, FIRST_RUN_MS).unref(), setInterval(tick, EVERY_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /** Never throws. */
  async runOnce(now = new Date()): Promise<{ students: number; failed: number }> {
    try {
      const ids = await this.queries.studentsWithPackages();
      const failed = await this.alerts.evaluateStudents(ids, { now, cause: { via: 'sweep' } });
      return { students: ids.length, failed };
    } catch (e) {
      this.log.error(`alerts sweep aborted: ${String(e)}`);
      return { students: 0, failed: 0 };
    }
  }
}
