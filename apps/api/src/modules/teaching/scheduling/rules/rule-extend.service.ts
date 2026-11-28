import type { RuleExtendResult } from '@ab/schedule';
import { Injectable, NotFoundException } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import { OccurrenceGenerator } from '@/modules/teaching/scheduling/occurrences/occurrence-generator';
import { ScheduleRepo } from '@/modules/teaching/scheduling/schedule.repo';
import { SchedulingSettings } from '@/modules/teaching/scheduling/scheduling.settings';

interface ExtendInput {
  ruleId: string;
  weeks?: number;
  actorId: string;
}

/** R-SCH-02: never blocks on a clash; clashes are stored on each row and returned (R-SCH-04). */
@Injectable()
export class RuleExtendService {
  constructor(
    private readonly rules: ScheduleRepo,
    private readonly generator: OccurrenceGenerator,
    private readonly settings: SchedulingSettings,
  ) {}

  async extend(input: ExtendInput): Promise<RuleExtendResult> {
    const rule = await this.rules.rule(input.ruleId);
    if (!rule) throw new NotFoundException();
    if (rule.status !== 'active') throw conflict('rule_not_active');
    const weeks = input.weeks ?? (await this.settings.read()).booking_horizon_weeks;
    const { until, lessons, conflicts } = await this.generator.topUp(rule, {
      weeks,
      actorId: input.actorId,
    });
    return { rule_id: rule.id, until: until.toISOString(), inserted: lessons.length, conflicts };
  }
}
