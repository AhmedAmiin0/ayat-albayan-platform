import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import { CourseDue } from '@/modules/finance/subscriptions/course-due/course-due';
import { AlertsRepo } from './alerts.repo';
import { SubscriptionAlertsService } from './alerts.service';
import { Ticker, TickerJob } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';

const EVERY_MS = 15 * 60_000;
/** Not on boot: every API test boots AppModule, and a restart loop must not hammer the DB. */
const FIRST_RUN_MS = 5 * 60_000;

/** R-SUB-02: lesson changes evaluate at once; a 15-minute sweep catches missed events. */
@BackgroundJob({ name: 'subscription-alerts' })
@Injectable()
export class AlertsJob extends TickerJob implements OnModuleInit {
  private readonly log = new Logger(AlertsJob.name);
  protected readonly ticker = new Ticker({
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
  ) {
    super();
  }

  onModuleInit(): void {
    this.events.onChanged((lessonIds) => this.alerts.evaluateLessons(lessonIds));
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
