import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '../../common/db/db.module';
import type { ChangeSet } from './change-set';
import { callRpc } from './rpc';

/** One occurrence to persist for a rule (UTC ISO instants + the link copied onto the lesson). */
export type OccurrenceRow = { starts_at: string; ends_at: string; meeting_link: string | null };
export type GeneratedLesson = { id: string; starts_at: string; ends_at: string };
export type GenerateInput = {
  ruleId: string;
  lessons: readonly OccurrenceRow[];
  actorId: string | null;
};

const generated = z.array(z.object({ id: z.string(), starts_at: z.string(), ends_at: z.string() }));

/** Every multi-row lesson write, each one transaction in Postgres (docs/10 invariant 5). */
@Injectable()
export class LessonWriter {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Idempotent upsert of a rule's occurrences on (rule_id, starts_at) with `do nothing`
   * (migration 080, R-SCH-02, issue B1): returns only the rows that were new, so a re-run
   * returns [] and a cancelled / rescheduled slot is never re-created or overwritten.
   * 409 rule_not_active when the rule is no longer active.
   */
  async generate(input: GenerateInput): Promise<GeneratedLesson[]> {
    if (input.lessons.length === 0) return [];
    const data = await callRpc(this.db, 'generate_rule_lessons', {
      p_rule: input.ruleId,
      p_lessons: input.lessons,
      p_actor: input.actorId,
    });
    return generated.parse(data);
  }

  /** Applies a change set atomically (migration 100); 409 invalid_transition / rule_not_active / slot_taken. */
  async apply(change: ChangeSet): Promise<void> {
    await callRpc(this.db, 'apply_lesson_changes', { p: change });
  }
}
