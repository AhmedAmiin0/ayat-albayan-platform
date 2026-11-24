import {
  addDays,
  DAY_MS,
  startOfLocalDay,
  type CourseExtendPreview,
  type CourseExtendResult,
} from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import { CourseDraftRepo } from '@/modules/teaching/booking/sales/course-draft/course-draft.repo';
import { RuleExtendService } from '@/modules/teaching/scheduling';
import { CourseExtendReader, type ExtendTarget, type PlannedExtend } from './course-extend.reader';
import { CourseExtendRepo } from './course-extend.repo';

const WEEK = 7 * DAY_MS;

/** Whole weeks from now to the start of the day after `endsOn` (the top-up's horizon). */
function weeksTo(endsOn: string, tz: string, now: Date): number {
  const end = startOfLocalDay(addDays(endsOn, 1), tz).getTime();
  return Math.max(1, Math.ceil((end - now.getTime()) / WEEK));
}

/** Clashes are stored, never blocking; idempotent; no message is sent. */
@Injectable()
export class CourseExtend {
  constructor(
    @Inject(CourseExtendReader) private readonly reader: CourseExtendReader,
    @Inject(CourseExtendRepo) private readonly repo: CourseExtendRepo,
    @Inject(RuleExtendService) private readonly rules: RuleExtendService,
    @Inject(CourseDraftRepo) private readonly packages: CourseDraftRepo,
  ) {}

  async preview(target: ExtendTarget): Promise<CourseExtendPreview> {
    const { id, plan } = await this.planned(target);
    const starts = plan.starts.map((d) => d.toISOString());
    return { subscriptionId: id, starts, tz: plan.tz, endsOn: plan.endsOn, notified: [] };
  }

  async extend(target: ExtendTarget & { subscriptionId: string }): Promise<CourseExtendResult> {
    const { id, plan } = await this.planned(target);
    const result = { subscriptionId: id, inserted: 0, endsOn: plan.courseEnd, conflicts: 0 };
    if (plan.endsOn === null) return result;
    await this.repo.extendRules(plan.ruleIds, plan.endsOn);
    const weeks = weeksTo(plan.endsOn, plan.tz, new Date());
    const actorId = target.user.id;
    for (const ruleId of plan.ruleIds) {
      const out = await this.rules.extend({ ruleId, weeks, actorId });
      result.inserted += out.inserted;
      result.conflicts += out.conflicts.length;
    }
    return { ...result, endsOn: plan.endsOn };
  }

  /** The reader's plan; 409 already_cancelled for a stopped package (it is never extended). */
  private async planned(target: ExtendTarget): Promise<PlannedExtend> {
    const planned = await this.reader.plan(target);
    const status = await this.packages.status(planned.id);
    if (status === 'cancelled') throw conflict('already_cancelled');
    return planned;
  }
}
