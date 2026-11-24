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

interface CorrectInput {
  lessonId: string;
  to: CorrectTo;
  actor: AuthUser;
}

const endedOpen = (lesson: LessonRow, now: Date): boolean =>
  isOpenLesson(lesson.status) && Date.parse(lesson.ends_at) <= now.getTime();

const recentOutcome = (lesson: LessonRow, now: Date): boolean =>
  (CORRECT_TO as readonly string[]).includes(lesson.status) &&
  Date.parse(lesson.ends_at) >= now.getTime() - AUTO_HELD_MAX_AGE_MS;

/** Status correction: ended in the last 14 days with no report since; 409s otherwise; audited. */
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
