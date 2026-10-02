import type { LessonEvent, LessonStatus } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuditEntry } from '../../common/audit/audit.service';
import { LessonEvents } from '../../common/events/lesson-events';
import type { ChangeSet } from '../scheduling/change-set';
import { errorCode } from '../scheduling/errors';
import { LessonWriter } from '../scheduling/lesson-writer';
import type { LessonRow } from './lesson-row';
import { LessonsQueries } from './lessons.queries';
import { invalidTransition } from './transition';

export type Commit = {
  change: ChangeSet;
  /** Written by apply_lesson_changes in the same transaction; its actor is change.actor. */
  audit: Omit<AuditEntry, 'actorId'>;
  /** Reported in the 409 when the compare-and-set loses (the lesson changed meanwhile). */
  transition: { from: LessonStatus; event: LessonEvent };
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
  async commit({ change, audit, transition }: Commit): Promise<void> {
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
  }
}
