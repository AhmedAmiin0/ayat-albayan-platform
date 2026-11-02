import { AUTO_HELD_CORRECTION_REASON, type CancelBy } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict } from '@/common/http/errors';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import type { LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { CANCEL_EVENT, cancelChange } from '@/modules/teaching/lessons/status/transition';
import { AutoHeldRepo } from './auto-held.repo';

/**
 * body.by: its teacher (not counted) or the student (excused); isAutoHeldCorrection keeps out
 * 'admin'.
 */
export interface CorrectionInput {
  lesson: LessonRow;
  body: { by: CancelBy; reason: string | null };
  actor: AuthUser;
}

/** A cancel request that corrects an auto-held lesson instead of cancelling an open one. */
export const isAutoHeldCorrection = (
  lesson: Pick<LessonRow, 'status'>,
  body: { by: CancelBy; scope?: string },
): boolean => lesson.status === 'completed' && body.by !== 'admin' && body.scope !== 'rule';

/**
 * «لم تنعقد؟» (owner 2026-11-02): a lesson the auto-held job closed and no report has spoken for
 * since
 * (AutoHeldRepo.correctable) becomes «ألغاها المعلم/ة» (cancelled_by_teacher, not counted) or
 * «اعتذر
 * الطالب» (excused, counted exactly per isChargeable / late_cancel_hours at the time of the
 * correction,
 * like any excuse). The only way out of `completed` outside a report; compare-and-set on completed,
 * audited (action cancel, after.correction auto_held_correction). Any other completed lesson: 409
 * not_auto_held (its outcome is the report's). The lesson is over: nobody is messaged.
 */
@Injectable()
export class AutoHeldCorrection {
  constructor(
    private readonly repo: AutoHeldRepo,
    private readonly store: LessonStore,
    private readonly settings: LessonsSettings,
  ) {}

  async correct({ lesson, body, actor }: CorrectionInput): Promise<string> {
    if (!(await this.repo.correctable([lesson.id])).has(lesson.id)) throw conflict('not_auto_held');
    const { late_cancel_hours: lateCancelHours } = await this.settings.read();
    const change = cancelChange(lesson, { ...body, now: new Date(), lateCancelHours });
    await this.store.commit({
      change: { actor: actor.id, changes: [change] },
      audit: {
        entity: 'lessons',
        entityId: lesson.id,
        action: 'cancel',
        before: { status: lesson.status },
        after: {
          status: change.to_status,
          by: body.by,
          reason: body.reason,
          chargeable: change.chargeable,
          correction: AUTO_HELD_CORRECTION_REASON,
        },
      },
      transition: { from: lesson.status, event: CANCEL_EVENT[body.by] },
    });
    return lesson.id;
  }
}
