import type { Conflict } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { ConflictChecker } from '@/modules/teaching/scheduling/conflicts/conflict-checker';
import { horizonWindow } from './horizon';
import { LessonWriter, type GeneratedLesson } from './lesson-writer';
import { resolveMeetingLink } from '@/modules/teaching/scheduling/meeting-link';
import { ruleOccurrences } from './occurrences';
import { ruleStudents, type RuleWithLinks } from '@/modules/teaching/scheduling/schedule.repo';

type TopUpOptions = {
  /** Weeks ahead of now (settings.booking_horizon_weeks, resolved by the caller). */
  weeks: number;
  /** null for the daily job. */
  actorId: string | null;
  now?: Date;
};
/** `conflicts`: clashes of the inserted rows, also stored on them (lessons.conflicts). */
type TopUp = { until: Date; lessons: GeneratedLesson[]; conflicts: Conflict[] };

const toOccurrence = (l: GeneratedLesson) => ({ starts_at: new Date(l.starts_at), ends_at: new Date(l.ends_at) });

/** OccurrenceGenerator (docs/04 §4): keeps a rule booked over the rolling horizon. R-SCH-02. */
@Injectable()
export class OccurrenceGenerator {
  constructor(
    private readonly writer: LessonWriter,
    private readonly checker: ConflictChecker,
    private readonly audit: AuditService,
  ) {}

  /**
   * Inserts the rule's occurrences in [max(now, starts_on), now + weeks) that don't exist yet,
   * each with the link of docs/10 invariant 3. Re-running inserts nothing, and a cancelled or
   * rescheduled row keeps its slot (issue B1). New rows are conflict-checked and their clashes
   * stored on them (R-SCH-04, issue B3: a DST change can move a rule onto another lesson).
   * Audited for every admin call; the daily job (actorId null) only when it inserted rows.
   */
  async topUp(rule: RuleWithLinks, opts: TopUpOptions): Promise<TopUp> {
    const now = opts.now ?? new Date();
    const window = horizonWindow({ now, startsOn: rule.starts_on, tz: rule.tz, weeks: opts.weeks });
    const students = ruleStudents(rule);
    // Only the admin's explicit rule link wins; else the current teacher link (issue B8).
    const link = resolveMeetingLink({
      explicit: rule.meeting_link,
      studentOverrides: students.overrides,
      teacherLink: rule.teacher?.meeting_link,
    });
    const rows = ruleOccurrences(rule, window).map((o) => ({
      starts_at: o.starts_at.toISOString(),
      ends_at: o.ends_at.toISOString(),
      meeting_link: link,
    }));
    const lessons = await this.writer.generate({ ruleId: rule.id, lessons: rows, actorId: opts.actorId });
    const conflicts = await this.checker.check({
      teacherId: rule.teacher_id,
      studentIds: students.ids,
      proposed: lessons.map(toOccurrence),
      excludeIds: lessons.map((l) => l.id),
      excludeRuleIds: [rule.id],
    });
    await this.writer.flagConflicts(lessons, conflicts);
    if (lessons.length > 0 || opts.actorId !== null) {
      await this.audit.record({
        actorId: opts.actorId,
        entity: 'schedule_rules',
        entityId: rule.id,
        action: 'extend',
        after: { until: window.to.toISOString(), inserted: lessons.map((l) => l.id), conflicts: conflicts.length },
      });
    }
    return { until: window.to, lessons, conflicts };
  }
}
