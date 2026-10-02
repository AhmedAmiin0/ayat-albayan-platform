import type { Conflict } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConflictChecker } from './conflict-checker';
import { conflict } from './errors';
import type { GeneratedLesson } from './lesson-writer';
import { OccurrenceGenerator } from './occurrence-generator';
import { ruleStudents, ScheduleQueries } from './schedule.queries';

export type ExtendInput = { ruleId: string; weeks?: number; actorId: string };
/** POST /schedule-rules/:id/extend 200 (docs/10 route 11). */
export type ExtendResult = { rule_id: string; until: string; inserted: number; conflicts: Conflict[] };

const toOccurrence = (l: GeneratedLesson) => ({
  starts_at: new Date(l.starts_at),
  ends_at: new Date(l.ends_at),
});

/** Admin "مدّ الجدول": tops the rule up and reports clashes of the new rows (R-SCH-02, R-SCH-04). */
@Injectable()
export class RuleExtendService {
  constructor(
    private readonly rules: ScheduleQueries,
    private readonly generator: OccurrenceGenerator,
    private readonly checker: ConflictChecker,
  ) {}

  /** Never blocks on a clash; the new rows are excluded from "busy" so they don't clash with themselves. */
  async extend(input: ExtendInput): Promise<ExtendResult> {
    const rule = await this.rules.rule(input.ruleId);
    if (!rule) throw new NotFoundException();
    if (rule.status !== 'active') throw conflict('rule_not_active');
    const { until, lessons } = await this.generator.topUp(rule, {
      weeks: input.weeks,
      actorId: input.actorId,
    });
    const conflicts = await this.checker.check({
      teacherId: rule.teacher_id,
      studentIds: ruleStudents(rule).ids,
      proposed: lessons.map(toOccurrence),
      excludeIds: lessons.map((l) => l.id),
    });
    return { rule_id: rule.id, until: until.toISOString(), inserted: lessons.length, conflicts };
  }
}
