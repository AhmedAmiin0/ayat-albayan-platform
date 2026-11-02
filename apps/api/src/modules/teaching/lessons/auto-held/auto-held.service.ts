import { AUTO_HELD_REASON, autoHeldWindow } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { errorCode } from '@/common/http/errors';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { LessonStore } from '@/modules/teaching/lessons/store/lesson-store';
import { dueLessons, studentIdsOf, type OpenEndedLesson } from './auto-held.plan';
import { AutoHeldRepo } from './auto-held.repo';

export interface AutoHeldSummary {
  due: number;
  held: number;
  /** confirmation_required: settings.lesson_confirmation_required is ON, nothing is read. */
  skipped: 'confirmation_required' | null;
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * «انعقدت» by default (owner 2026-11-02): while settings.lesson_confirmation_required is OFF, every
 * lesson still scheduled / confirmed 30 min after its end (14 days back at most, never before a
 * student's current package) moves to completed through apply_lesson_changes: compare-and-set on its
 * status (the per-lesson dedup: a second pass, or a report / cancel meanwhile, finds it no longer
 * open and changes nothing), audited with actor null and after.reason auto_held. Attendance and
 * chargeable stay as they are (a report later fills attendance and re-derives the outcome).
 * LessonEvents then runs the balance alerts, the trial → «بانتظار الاشتراك» move and the rating.
 */
@Injectable()
export class AutoHeldService {
  private readonly log = new Logger(AutoHeldService.name);

  constructor(
    private readonly repo: AutoHeldRepo,
    private readonly store: LessonStore,
    private readonly settings: LessonsSettings,
  ) {}

  async runOnce(now = new Date()): Promise<AutoHeldSummary> {
    const { lesson_confirmation_required: required } = await this.settings.read();
    if (required) return { due: 0, held: 0, skipped: 'confirmation_required' };
    const open = await this.repo.openEnded(autoHeldWindow(now));
    const packages = await this.repo.packages(studentIdsOf(open));
    const due = dueLessons({ lessons: open, packages, now });
    let held = 0;
    for (const lesson of due) held += Number(await this.hold(lesson));
    return { due: due.length, held, skipped: null };
  }

  /** True when this pass closed it; a lost compare-and-set (someone changed it meanwhile) is false. */
  private async hold(lesson: OpenEndedLesson): Promise<boolean> {
    try {
      await this.store.commit({
        change: { actor: null, changes: [{ id: lesson.id, from_status: lesson.status, to_status: 'completed' }] },
        audit: {
          entity: 'lessons',
          entityId: lesson.id,
          action: 'status_change',
          before: { status: lesson.status },
          after: { status: 'completed', reason: AUTO_HELD_REASON },
        },
        transition: { from: lesson.status, event: 'complete' },
      });
      return true;
    } catch (e) {
      if (errorCode(e) !== 'invalid_transition') this.log.warn(`lesson ${lesson.id} not held: ${messageOf(e)}`);
      return false;
    }
  }
}
