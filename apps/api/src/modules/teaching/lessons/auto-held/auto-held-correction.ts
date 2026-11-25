import { AUTO_HELD_CORRECTION_REASON, AUTO_HELD_MAX_AGE_MS, type CancelBy } from '@ab/schedule';
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

/** Correcting an auto-held lesson: the only way out of completed outside a report. */
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
