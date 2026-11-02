import { AUTO_HELD_CORRECTION_REASON, AUTO_HELD_MAX_AGE_MS, type CancelBy } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict } from '@/common/http/errors';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import type { LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { cancelChange, cancelCommit } from '@/modules/teaching/lessons/status/transition';
import { AutoHeldRepo } from './auto-held.repo';

/**
 * body.by: its teacher (not counted) or the student (excused); isAutoHeldCorrection keeps out
 * 'admin'.
 */
interface CorrectionInput {
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
 * audited (action cancel, after.correction auto_held_correction). Any other completed lesson, or
 * one that ended over 14 days ago: 409 not_auto_held (its outcome is the report's); its earning
 * already paid per session: 409 earning_paid. The lesson is over: nobody is messaged.
 * ponytail: the report check is read before the commit; a report filed in that instant keeps the
 * correction (no migration here). Move the check into an RPC if that is ever seen.
 */
@Injectable()
export class AutoHeldCorrection {
  constructor(
    private readonly repo: AutoHeldRepo,
    private readonly store: LessonStore,
    private readonly settings: LessonsSettings,
  ) {}

  async correct({ lesson, body, actor }: CorrectionInput): Promise<string> {
    const recent = Date.parse(lesson.ends_at) >= Date.now() - AUTO_HELD_MAX_AGE_MS;
    const held = recent && (await this.repo.correctable([lesson.id])).has(lesson.id);
    if (!held) throw conflict('not_auto_held');
    if (await this.repo.paid(lesson.id)) throw conflict('earning_paid');
    const { late_cancel_hours: lateCancelHours } = await this.settings.read();
    const change = cancelChange(lesson, { ...body, now: new Date(), lateCancelHours });
    const input = { lesson, change, body, actorId: actor.id };
    await this.store.commit(cancelCommit(input, { correction: AUTO_HELD_CORRECTION_REASON }));
    return lesson.id;
  }
}
