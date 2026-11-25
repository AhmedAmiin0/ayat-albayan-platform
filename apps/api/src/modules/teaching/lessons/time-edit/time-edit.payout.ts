import { payoutStatuses } from '@ab/money';
import type { TimeEditResult } from '@ab/schedule';
import { Injectable } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import type { LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { isPayoutLocked, payoutScope, type TimeEditPlan } from './time-edit.plan';
import { TimeEditRepo } from './time-edit.repo';

/** E3, R-PAY-02: approved or paid months are frozen; a draft month is flagged stale. */
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
