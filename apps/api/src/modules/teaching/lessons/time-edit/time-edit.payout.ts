import { payoutStatuses, type TimeEditResult } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import type { LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { isPayoutLocked, payoutScope, type TimeEditPlan } from './time-edit.plan';
import { TimeEditRepo } from './time-edit.repo';

/**
 * The payout side of «عدّل الوقت» (E3, R-PAY-02): an approved or paid month is frozen, so an edit
 * that would have to re-price or re-home a lesson in it is refused; a draft month is allowed and
 * flagged stale (the admin presses «احسب مستحقات الشهر» again, nothing regenerates automatically).
 */
@Injectable()
export class TimeEditPayout {
  constructor(
    private readonly settings: LessonsSettings,
    private readonly queries: TimeEditRepo,
  ) {}

  /** 409 `payout_locked { month, status }`, else `draft_stale` for a corrected lesson in a draft month. */
  async check(row: LessonRow, plan: TimeEditPlan): Promise<TimeEditResult['payout']> {
    const scope = payoutScope({
      plan,
      status: row.status,
      teacherTz: row.teacher?.tz ?? 'UTC',
      paidStatuses: await this.paidStatuses(plan),
    });
    if (!scope) return 'none';
    const status = await this.queries.payoutStatus(row.teacher_id, scope.month);
    if (isPayoutLocked(status)) throw conflict('payout_locked', { month: scope.month, status });
    return plan.mode === 'correct' && status === 'draft' ? 'draft_stale' : 'none';
  }

  /** Only a correction depends on which statuses are paid; a move never reads the settings. */
  private async paidStatuses(plan: TimeEditPlan) {
    if (plan.mode !== 'correct') return [];
    const s = await this.settings.read();
    return payoutStatuses({ countLate: s.payout_count_late, countNoShow: s.payout_count_no_show });
  }
}
