import { isOpenLesson, type CancelRequest, type RuleCancelRequest } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { badRequest, conflict } from '../scheduling/errors';
import { addDays, localDateOf, startOfLocalDay } from '../scheduling/horizon';
import { ScheduleQueries, type RuleWithLinks } from '../scheduling/schedule.queries';
import { LessonStore } from './lesson-store';
import { LessonsSettings } from './lessons.settings';
import { CANCEL_EVENT, cancelChange, invalidTransition, type CancelContext } from './transition';

export type CancelInput = { lessonId: string; body: CancelRequest; actor: AuthUser };
export type RuleCancelInput = { ruleId: string; body: RuleCancelRequest; actor: AuthUser };

type Cancel = { by: CancelRequest['by']; reason: string };
type EndRule = {
  rule: RuleWithLinks;
  /** First local day without lessons; the rule's ends_on becomes the day before. */
  from: string;
  /** Open lessons starting at or after this instant are cancelled. */
  cutoff: Date;
  body: Cancel;
  actor: AuthUser;
};

/**
 * Cancel one occurrence, or this one and the rest of its rule (R-SCH-07). Returns the ids of
 * every cancelled lesson. No WhatsApp message: no approved cancellation template yet (TODO(R-MSG-01)).
 */
@Injectable()
export class LessonCancelService {
  constructor(
    private readonly store: LessonStore,
    private readonly rules: ScheduleQueries,
    private readonly settings: LessonsSettings,
  ) {}

  /** POST /lessons/:id/cancel. */
  async cancel({ lessonId, body, actor }: CancelInput): Promise<string[]> {
    const lesson = await this.store.get(lessonId);
    const event = CANCEL_EVENT[body.by];
    if (!isOpenLesson(lesson.status)) throw invalidTransition(lesson.status, event);
    if (body.scope === 'rule') {
      const rule = lesson.rule_id ? await this.rules.rule(lesson.rule_id) : null;
      if (!rule) throw badRequest('no_rule');
      const from = localDateOf(new Date(lesson.starts_at), rule.tz);
      return this.endRule({ rule, from, cutoff: new Date(lesson.starts_at), body, actor });
    }
    const change = cancelChange(lesson, await this.context(body));
    await this.store.commit({
      change: { actor: actor.id, changes: [change] },
      audit: {
        entity: 'lessons',
        entityId: lesson.id,
        action: 'cancel',
        before: { status: lesson.status },
        after: { status: change.to_status, by: body.by, reason: body.reason, chargeable: change.chargeable },
      },
      transition: { from: lesson.status, event },
    });
    return [lesson.id];
  }

  /**
   * POST /schedule-rules/:id/cancel: from `from` (default today in the rule's tz) on. A past
   * `from` → 400 date_in_past (it would close lessons nobody marked, issue B2). A future one
   * keeps the rule active until then, so the lessons it still owes are generated (R-SCH-07).
   */
  async cancelRule({ ruleId, body, actor }: RuleCancelInput): Promise<string[]> {
    const rule = await this.rules.rule(ruleId);
    if (!rule) throw new NotFoundException();
    if (rule.status !== 'active') throw conflict('rule_not_active');
    const today = localDateOf(new Date(), rule.tz);
    if (body.from && body.from < today) throw badRequest('date_in_past');
    const from = body.from ?? today;
    return this.endRule({ rule, from, cutoff: startOfLocalDay(from, rule.tz), body, actor });
  }

  /** Cancels the rule's open lessons from `cutoff` and ends it, in one transaction. */
  private async endRule({ rule, from, cutoff, body, actor }: EndRule): Promise<string[]> {
    const open = await this.store.queries.openOfRule(rule.id, cutoff);
    const ctx = await this.context(body);
    // ponytail: the open list is read before the RPC locks the rule, so a lesson the daily job
    // generates in that gap stays scheduled. Add a recheck inside the RPC if that is ever seen.
    await this.store.commit({
      change: {
        actor: actor.id,
        end_rule: { id: rule.id, ends_on: addDays(from, -1) },
        changes: open.map((l) => cancelChange(l, ctx)),
      },
      audit: {
        entity: 'schedule_rules',
        entityId: rule.id,
        action: 'cancel',
        before: { status: rule.status, ends_on: rule.ends_on },
        after: { ends_on: addDays(from, -1), from, by: body.by, reason: body.reason, cancelled: open.map((l) => l.id) },
      },
      transition: { from: open[0]?.status ?? 'scheduled', event: CANCEL_EVENT[body.by] },
    });
    return open.map((l) => l.id);
  }

  private async context(body: Cancel): Promise<CancelContext> {
    return { ...body, now: new Date(), lateCancelHours: (await this.settings.read()).late_cancel_hours };
  }
}
