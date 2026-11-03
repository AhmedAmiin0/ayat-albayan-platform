import { AUTO_HELD_MAX_AGE_MS, CORRECT_TO, isOpenLesson, type CorrectTo } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict } from '@/common/http/errors';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import type { LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { invalidTransition } from '@/modules/teaching/lessons/status/transition';
import { AutoHeldRepo } from './auto-held.repo';
import { CORRECT_EVENT, correctionCommit } from './correction-change';

export interface CorrectInput {
  lessonId: string;
  to: CorrectTo;
  actor: AuthUser;
}

const endedOpen = (lesson: LessonRow, now: Date): boolean =>
  isOpenLesson(lesson.status) && Date.parse(lesson.ends_at) <= now.getTime();

const recentOutcome = (lesson: LessonRow, now: Date): boolean =>
  (CORRECT_TO as readonly string[]).includes(lesson.status) &&
  Date.parse(lesson.ends_at) >= now.getTime() - AUTO_HELD_MAX_AGE_MS;

/**
 * «تصحيح الحالة» (owner 2026-11-03): assistants and admins record what happened to a lesson,
 * held / absent / excused / cancelled by its teacher. Allowed on a lesson still open after its end
 * («يحتاج تأكيد» the job left), or on one the job settled or staff corrected (AutoHeldRepo.
 * correctable: no submitted report since) that ended in the last 14 days. Otherwise 409
 * not_auto_held (its outcome is the report's); the same status: 409 invalid_transition; the
 * teacher's earning already paid per session: 409 earning_paid. Compare-and-set, audited; the
 * balance views recount at once and LessonEvents runs the alerts. Nobody is messaged.
 */
@Injectable()
export class OutcomeCorrection {
  constructor(
    private readonly repo: AutoHeldRepo,
    private readonly store: LessonStore,
    private readonly settings: LessonsSettings,
  ) {}

  async correct({ lessonId, to, actor }: CorrectInput): Promise<string> {
    const lesson = await this.store.get(lessonId);
    const now = new Date();
    await this.assertCorrectable(lesson, now);
    assertChanges(lesson, to);
    if (await this.repo.paid(lesson.id)) throw conflict('earning_paid');
    const { late_cancel_hours: lateCancelHours } = await this.settings.read();
    const commit = correctionCommit({ lesson, to, actorId: actor.id }, { now, lateCancelHours });
    await this.store.commit(commit);
    return lesson.id;
  }

  private async assertCorrectable(lesson: LessonRow, now: Date): Promise<void> {
    const settled = recentOutcome(lesson, now) && (await this.settledByJob(lesson.id));
    const ok = endedOpen(lesson, now) || settled;
    if (!ok) throw conflict('not_auto_held');
  }

  private async settledByJob(id: string): Promise<boolean> {
    return (await this.repo.correctable([id])).has(id);
  }
}

function assertChanges(lesson: LessonRow, to: CorrectTo): void {
  if (lesson.status === to) throw invalidTransition(lesson.status, CORRECT_EVENT[to]);
}
