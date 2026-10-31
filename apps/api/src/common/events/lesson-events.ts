import { Global, Injectable, Logger, Module } from '@nestjs/common';
import type { ScheduleChange, ScheduleChangeListener } from './schedule-change';

export type { ScheduleChange } from './schedule-change';

export type LessonsChangedListener = (lessonIds: readonly string[]) => Promise<void>;

/**
 * "These lessons' outcome or charge changed" (attendance, cancel, move, a submitted report).
 * The lesson writers call `changed` after their transaction commits; Phase 3's balance alerts
 * (R-SUB-02) subscribe with `onChanged` in onModuleInit, so neither side imports the other.
 * A failing listener is logged, never thrown: the change is already committed and the alerts
 * sweep job (idempotent, dedup keys) catches up.
 */
@Injectable()
export class LessonEvents {
  private readonly log = new Logger(LessonEvents.name);
  private readonly listeners: LessonsChangedListener[] = [];
  private readonly scheduleListeners: ScheduleChangeListener[] = [];

  onChanged(listener: LessonsChangedListener): void {
    this.listeners.push(listener);
  }

  async changed(lessonIds: readonly string[]): Promise<void> {
    if (lessonIds.length === 0) return;
    for (const listener of this.listeners) {
      try {
        await listener(lessonIds);
      } catch (e) {
        this.log.error(`lessons-changed listener failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  /** The schedule-change notices (ScheduleNotices) subscribe here. */
  onScheduleChange(listener: ScheduleChangeListener): void {
    this.scheduleListeners.push(listener);
  }

  /** After the commit: a lesson moved or cancelled, a course paused or resumed. Never throws. */
  async scheduleChanged(change: ScheduleChange): Promise<void> {
    for (const listener of this.scheduleListeners) {
      try {
        await listener(change);
      } catch (e) {
        const why = e instanceof Error ? e.message : String(e);
        this.log.error(`schedule-change ${change.kind} listener failed: ${why}`);
      }
    }
  }
}

@Global()
@Module({ providers: [LessonEvents], exports: [LessonEvents] })
export class LessonEventsModule {}
