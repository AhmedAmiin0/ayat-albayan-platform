import type { LessonEvent, LessonStatus } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuditEntry } from '../../../../common/audit/audit.service';
import { LessonEvents, type ScheduleChange } from '../../../../common/events/lesson-events';
import type { ChangeSet, TimeEditChange } from '../../scheduling/change-set';
import { errorCode } from '../../../../common/http/errors';
import { LessonWriter } from '../../scheduling/occurrences/lesson-writer';
import type { LessonRow } from './lesson-row';
import { LessonsQueries } from '../lessons.queries';
import { invalidTransition } from '../status/transition';

export type Commit = {
  change: ChangeSet;
  /** Written by apply_lesson_changes in the same transaction; its actor is change.actor. */
  audit: Omit<AuditEntry, 'actorId'>;
  /** Reported in the 409 when the compare-and-set loses (the lesson changed meanwhile). */
  transition: { from: LessonStatus; event: LessonEvent };
  /** The teacher and the family hear it after the commit (ScheduleNotices, owner 2026-10-30). */
  notice?: ScheduleChange;
};

/** Lesson reads + audited atomic writes, shared by the lesson services. R-NFR-03. */
@Injectable()
export class LessonStore {
  constructor(
    readonly queries: LessonsQueries,
    private readonly writer: LessonWriter,
    private readonly events: LessonEvents,
  ) {}

  async get(id: string): Promise<LessonRow> {
    const row = await this.queries.get(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  /**
   * One transaction (apply_lesson_changes) with its audit row: never committed unaudited. After it
   * commits, LessonEvents tells the balance alerts (R-SUB-02) which lessons changed.
   */
  async commit({ change, audit, transition, notice }: Commit): Promise<void> {
    const { entity, entityId, action, before, after } = audit;
    try {
      await this.writer.apply({ ...change, audit: { entity, entity_id: entityId, action, before, after } });
    } catch (e) {
      if (errorCode(e) === 'invalid_transition') {
        throw invalidTransition(transition.from, transition.event);
      }
      throw e;
    }
    await this.events.changed((change.changes ?? []).map((c) => c.id));
    if (notice) await this.events.scheduleChanged(notice);
  }

  /**
   * «عدّل الوقت» (R-SCH-11): edit_lesson_time carries its own audit row. A time edit has no
   * `changes[]`, so the balance alerts (R-SUB-02) are told explicitly. 409 stale_time on a lost race.
   */
  async retime(change: TimeEditChange, notice?: ScheduleChange): Promise<void> {
    await this.writer.retime(change);
    await this.events.changed([change.lesson_id]);
    if (notice) await this.events.scheduleChanged(notice);
  }
}
