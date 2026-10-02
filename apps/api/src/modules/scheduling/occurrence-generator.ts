import { Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { SettingsService } from '../../common/settings/settings.service';
import { horizonWindow } from './horizon';
import { LessonWriter, type GeneratedLesson } from './lesson-writer';
import { resolveMeetingLink } from './meeting-link';
import { ruleOccurrences } from './occurrences';
import { ruleStudents, type RuleWithLinks } from './schedule.queries';

export type TopUpOptions = {
  /** Weeks ahead of now; default settings.booking_horizon_weeks. */
  weeks?: number;
  /** null for the daily job. */
  actorId: string | null;
  now?: Date;
};
export type TopUp = { until: Date; lessons: GeneratedLesson[] };

/** OccurrenceGenerator (docs/04 §4): keeps a rule booked over the rolling horizon. R-SCH-02. */
@Injectable()
export class OccurrenceGenerator {
  constructor(
    private readonly writer: LessonWriter,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Inserts the rule's occurrences in [max(now, starts_on), now + weeks) that don't exist yet,
   * each with the link of docs/10 invariant 3. Re-running inserts nothing, and a cancelled or
   * rescheduled row keeps its slot (issue B1). Audited for every admin call; the daily job
   * (actorId null) only when it inserted rows, or it would log every rule every day.
   */
  async topUp(rule: RuleWithLinks, opts: TopUpOptions): Promise<TopUp> {
    const now = opts.now ?? new Date();
    const weeks = opts.weeks ?? (await this.settings.bookingHorizonWeeks());
    const window = horizonWindow({ now, startsOn: rule.starts_on, tz: rule.tz, weeks });
    const link = resolveMeetingLink({
      explicit: rule.meeting_link,
      studentOverrides: ruleStudents(rule).overrides,
      teacherLink: rule.teacher?.meeting_link,
    });
    const rows = ruleOccurrences(rule, window).map((o) => ({
      starts_at: o.starts_at.toISOString(),
      ends_at: o.ends_at.toISOString(),
      meeting_link: link,
    }));
    const lessons = await this.writer.generate({ ruleId: rule.id, lessons: rows, actorId: opts.actorId });
    if (lessons.length > 0 || opts.actorId !== null) {
      await this.audit.record({
        actorId: opts.actorId,
        entity: 'schedule_rules',
        entityId: rule.id,
        action: 'extend',
        after: { until: window.to.toISOString(), inserted: lessons.map((l) => l.id) },
      });
    }
    return { until: window.to, lessons };
  }
}
