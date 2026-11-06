import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import { CourseDue } from '@/modules/finance/subscriptions/course-due/course-due';
import { AlertsRepo } from './alerts.repo';
import { SubscriptionAlertsService } from './alerts.service';
import { Ticker } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';

const EVERY_MS = 15 * 60_000;
/** Not on boot: every API test boots AppModule, and a restart loop must not hammer the DB. */
const FIRST_RUN_MS = 5 * 60_000;

/**
 * R-SUB-02 triggers: every lesson change (LessonEvents: attendance, cancel, move, a submitted
 * report) evaluates the lessons' students right away, awaited by the writer, so it stays one
 * balance read per student. The sweep (docs/11 §6) runs every 15 minutes over every student with a
 * package, so a missed event (a failed listener, a direct DB edit) still raises its alert. The
 * sweep also moves a student whose renewal date passed to «بانتظار التجديد» (StudentRenewal),
 * leaving a status the admin set by hand. Idempotent through the dedup keys and the
 * compare-and-set. Each sweep also tells the staff of an active package still without its weekly
 * course 2 hours on (CourseDue, owner 2026-11-06). ponytail: in-process timer on the single API
 * instance, like HorizonJob; pg_cron when it scales.
 */
@BackgroundJob({ name: 'subscription-alerts' })
@Injectable()
export class AlertsJob implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(AlertsJob.name);
  private readonly ticker = new Ticker({
    name: AlertsJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });

  constructor(
    private readonly queries: AlertsRepo,
    private readonly alerts: SubscriptionAlertsService,
    private readonly events: LessonEvents,
    private readonly courseDue: CourseDue,
  ) {}

  onModuleInit(): void {
    this.events.onChanged((lessonIds) => this.alerts.evaluateLessons(lessonIds));
  }

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  onModuleDestroy(): void {
    this.ticker.stop();
  }

  /** Never throws. */
  async runOnce(now = new Date()): Promise<{ students: number; failed: number }> {
    try {
      const ids = await this.queries.studentsWithPackages();
      const failed = await this.alerts.evaluateStudents(ids, { now, cause: { via: 'sweep' } });
      await this.courseDue.sweep(now);
      return { students: ids.length, failed };
    } catch (e) {
      this.log.error(`alerts sweep aborted: ${String(e)}`);
      return { students: 0, failed: 0 };
    }
  }
}
