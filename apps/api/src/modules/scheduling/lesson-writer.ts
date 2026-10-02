import type { Conflict } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '../../common/db/db.module';
import type { ChangeSet } from './change-set';
import { callRpc } from './rpc';
import { dbError } from '../teachers/http';

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

  /**
   * Stores the clashes of freshly generated lessons on them (lessons.conflicts, R-SCH-04) so the
   * schedule shows what the daily job booked over a conflict. Conflicts match lessons by start.
   */
  async flagConflicts(lessons: readonly GeneratedLesson[], conflicts: readonly Conflict[]): Promise<void> {
    const byStart = new Map<string, Conflict[]>();
    for (const c of conflicts) byStart.set(c.startsAt, [...(byStart.get(c.startsAt) ?? []), c]);
    const flagged = lessons.flatMap((l) => {
      const found = byStart.get(new Date(l.starts_at).toISOString());
      return found ? [{ id: l.id, conflicts: found.map((c) => ({ ...c })) }] : [];
    });
    for (const f of flagged) {
      const { error } = await this.db.from('lessons').update({ conflicts: f.conflicts }).eq('id', f.id);
      if (error) throw dbError(error);
    }
  }

  /** Applies a change set atomically (migration 100); 409 invalid_transition / rule_not_active / slot_taken. */
  async apply(change: ChangeSet): Promise<void> {
    await callRpc(this.db, 'apply_lesson_changes', { p: change });
  }
}
