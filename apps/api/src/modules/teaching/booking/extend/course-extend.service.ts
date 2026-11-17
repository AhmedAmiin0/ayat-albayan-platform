import {
  addDays,
  DAY_MS,
  startOfLocalDay,
  type CourseExtendPreview,
  type CourseExtendResult,
} from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { RuleExtendService } from '@/modules/teaching/scheduling';
import { CourseExtendReader, type ExtendTarget } from './course-extend.reader';
import { CourseExtendRepo } from './course-extend.repo';

const WEEK = 7 * DAY_MS;

/** Whole weeks from now to the start of the day after `endsOn` (the top-up's horizon). */
function weeksTo(endsOn: string, tz: string, now: Date): number {
  const end = startOfLocalDay(addDays(endsOn, 1), tz).getTime();
  return Math.max(1, Math.ceil((end - now.getTime()) / WEEK));
}

/**
 * «مدّ الجدول» (owner 2026-11-17), admins and assistants (courses.reschedule; an assistant her own
 * students while the ownership rule holds): the package's lessons with no date yet are booked
 * after the course's planned end on its own days and times. The rules of its latest set end on
 * the new last day and the generator tops each up (RuleExtendService: the clashes are stored on
 * the new lessons, never blocking; audited). Idempotent: once booked, nothing is left to book.
 * No message is sent; the sheet says so.
 */
@Injectable()
export class CourseExtend {
  constructor(
    @Inject(CourseExtendReader) private readonly reader: CourseExtendReader,
    @Inject(CourseExtendRepo) private readonly repo: CourseExtendRepo,
    @Inject(RuleExtendService) private readonly rules: RuleExtendService,
  ) {}

  async preview(target: ExtendTarget): Promise<CourseExtendPreview> {
    const { id, plan } = await this.reader.plan(target, this.repo);
    const starts = plan.starts.map((d) => d.toISOString());
    return { subscriptionId: id, starts, tz: plan.tz, endsOn: plan.endsOn, notified: [] };
  }

  async extend(target: ExtendTarget & { subscriptionId: string }): Promise<CourseExtendResult> {
    const { id, plan } = await this.reader.plan(target, this.repo);
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
}
