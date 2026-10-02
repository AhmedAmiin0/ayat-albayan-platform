import type { LessonEvent, LessonStatus } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService, type AuditEntry } from '../../common/audit/audit.service';
import type { ChangeSet } from '../scheduling/change-set';
import { errorCode } from '../scheduling/errors';
import { LessonWriter } from '../scheduling/lesson-writer';
import type { LessonRow } from './lesson-row';
import { LessonsQueries } from './lessons.queries';
import { invalidTransition } from './transition';

export type Commit = {
  change: ChangeSet;
  audit: AuditEntry;
  /** Reported in the 409 when the compare-and-set loses (the lesson changed meanwhile). */
  transition: { from: LessonStatus; event: LessonEvent };
};

/** Lesson reads + audited atomic writes, shared by the lesson services. R-NFR-03. */
@Injectable()
export class LessonStore {
  constructor(
    readonly queries: LessonsQueries,
    private readonly writer: LessonWriter,
    private readonly audit: AuditService,
  ) {}

  async get(id: string): Promise<LessonRow> {
    const row = await this.queries.get(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  /** One transaction (apply_lesson_changes), then the audit row (docs/10 invariant 6). */
  async commit({ change, audit, transition }: Commit): Promise<void> {
    try {
      await this.writer.apply(change);
    } catch (e) {
      if (errorCode(e) === 'invalid_transition') {
        throw invalidTransition(transition.from, transition.event);
      }
      throw e;
    }
    await this.audit.record(audit);
  }
}
