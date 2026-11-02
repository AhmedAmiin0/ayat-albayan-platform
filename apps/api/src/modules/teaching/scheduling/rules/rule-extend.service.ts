import type { Conflict } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import { OccurrenceGenerator } from '@/modules/teaching/scheduling/occurrences/occurrence-generator';
import { ScheduleRepo } from '@/modules/teaching/scheduling/schedule.repo';
import { SchedulingSettings } from '@/modules/teaching/scheduling/scheduling.settings';

type ExtendInput = { ruleId: string; weeks?: number; actorId: string };
/** POST /schedule-rules/:id/extend 200 (docs/10 route 11). */
export type ExtendResult = { rule_id: string; until: string; inserted: number; conflicts: Conflict[] };

/**
 * Admin "مدّ الجدول": tops the rule up (R-SCH-02). Never blocks on a clash: the generator stores
 * each new row's clashes on it (lessons.conflicts) and they are returned here (R-SCH-04).
 */
@Injectable()
export class RuleExtendService {
  constructor(
    private readonly rules: ScheduleRepo,
    private readonly generator: OccurrenceGenerator,
    private readonly settings: SchedulingSettings,
  ) {}

  async extend(input: ExtendInput): Promise<ExtendResult> {
    const rule = await this.rules.rule(input.ruleId);
    if (!rule) throw new NotFoundException();
    if (rule.status !== 'active') throw conflict('rule_not_active');
    const weeks = input.weeks ?? (await this.settings.read()).booking_horizon_weeks;
    const { until, lessons, conflicts } = await this.generator.topUp(rule, { weeks, actorId: input.actorId });
    return { rule_id: rule.id, until: until.toISOString(), inserted: lessons.length, conflicts };
  }
}
