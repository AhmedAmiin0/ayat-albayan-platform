import type { Conflict, LessonTimeEdit, TimeEditResult } from '@ab/schedule';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import type { ScheduleChange } from '@/common/infra/events/lesson-events';
import { ConflictChecker, type TimeEditChange } from '@/modules/teaching/scheduling';
import { errorCode } from '@/common/http/errors';
import { studentIdsOf, type LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { TimeEditPayout } from './time-edit.payout';
import { isSameTime, planTimeEdit, type TimeEditPlan } from './time-edit.plan';
import { admit, changeOf, iso, movedNotice, overrideOf } from './time-edit.change';
import { forMessages } from '@/modules/teaching/lessons/status/confirmation-messages';
import { timeEditMessages } from './time-edit.messages';

interface TimeEditArgs { lessonId: string; body: LessonTimeEdit; actor: AuthUser }
interface RetimeArgs {
  change: TimeEditChange;
  notice: ScheduleChange | undefined;
  lessonId: string;
  body: LessonTimeEdit;
}
/** What the edit set in motion; the controller adds the lesson view. */
type TimeEditEffects = Omit<TimeEditResult, 'lesson'>;

const NOTHING: TimeEditEffects = { notified: 0, payout: 'none', pdf_refresh: false };

/** R-SCH-11, docs/10 §10: edited in place, admin only; approved or paid payouts block it. */
@Injectable()
export class LessonTimeService {
  constructor(
    private readonly store: LessonStore,
    private readonly checker: ConflictChecker,
    private readonly payout: TimeEditPayout,
  ) {}

  async edit({ lessonId, body, actor }: TimeEditArgs): Promise<TimeEditEffects> {
    const row = await this.store.get(lessonId);
    const input = admit(row, body);
    // A replay (the edit already holds) is a 200 that writes nothing.
    if (!input) return NOTHING;
    const plan = planTimeEdit(input);
    const overrideReason = overrideOf(await this.clashes(row, plan), body);
    const payout = await this.payout.check(row, plan);
    const messages = plan.notify ? await this.notices(row, plan) : [];
    const change = changeOf({ row, plan, actor, messages, overrideReason });
    const notice = movedNotice({ row, plan, actor });
    if (!(await this.retime({ change, notice, lessonId, body }))) return NOTHING;
    return { notified: messages.length, payout, pdf_refresh: plan.refreshPdf };
  }

  /** False when this is the loser of two identical requests and its edit is already in place. */
  private async retime(w: RetimeArgs): Promise<boolean> {
    try {
      await this.store.retime(w.change, w.notice);
      return true;
    } catch (e) {
      const held = errorCode(e) === 'stale_time' && (await this.alreadyHolds(w.lessonId, w.body));
      if (held) return false;
      throw e;
    }
  }

  private async alreadyHolds(lessonId: string, body: LessonTimeEdit): Promise<boolean> {
    const now = await this.store.get(lessonId);
    return isSameTime(
      { startsAt: new Date(now.starts_at), endsAt: new Date(now.ends_at) },
      { ...body, startsAt: new Date(body.startsAt) },
    );
  }

  /**
   * One confirmation per guardian for the new start (queued even with auto messages off), naming
   * no fixed link when the lesson's teacher holds it in our classroom (meetingLinkAuto).
   */
  private async notices(row: LessonRow, plan: TimeEditPlan): Promise<TimeEditChange['messages']> {
    const contacts = await this.store.queries.contacts(studentIdsOf(row));
    const linkAuto = await this.store.queries.meetingLinkAuto({ teacherId: row.teacher_id });
    const lesson = forMessages({ ...row, starts_at: iso(plan.start) }, linkAuto);
    return timeEditMessages(lesson, contacts);
  }

  private async clashes(row: LessonRow, plan: TimeEditPlan): Promise<Conflict[]> {
    const found = await this.checker.check({
      teacherId: row.teacher_id,
      studentIds: studentIdsOf(row),
      proposed: [{ starts_at: plan.start, ends_at: plan.end }],
      excludeIds: [row.id],
    });
    return found.filter((c) => !plan.ignoredConflicts.includes(c.kind));
  }
}
