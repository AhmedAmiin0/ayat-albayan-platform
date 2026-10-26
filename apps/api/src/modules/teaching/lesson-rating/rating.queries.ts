import { RATING_TEMPLATE } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import type { QueuedMessage } from '../../messaging/reminders/queued-row';
import { approvedTemplates, queueMessages } from '../../messaging/reminders/reminders.queries';
import { readAll } from '../scheduling/read-all';
import { dbError } from '../../../common/http/http';
import type { RatingGuardian, RatingLesson } from './rating.plan';

const LESSON_SELECT =
  'id, starts_at, status, lesson_students(attendance, student:students(id, name, guardian:guardians(id, phone_e164, tz)))' as const;
/** The lesson statuses that mean it took place (feedbackEligible). */
const HELD = ['completed', 'late'] as const;

/** Reads and the idempotent queue of lesson_rating (migration 195). Service role; callers guard. */
@Injectable()
export class RatingQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Lessons that took place and started in [since, until]. */
  async held(range: { since: Date; until: Date }): Promise<RatingLesson[]> {
    return readAll((from, to) =>
      this.db
        .from('lessons')
        .select(LESSON_SELECT)
        .in('status', [...HELD])
        .gte('starts_at', range.since.toISOString())
        .lte('starts_at', range.until.toISOString())
        .order('starts_at')
        .order('id')
        .range(from, to),
    );
  }

  /** These lessons (any status: the plan keeps the ones that took place). */
  async byIds(ids: readonly string[]): Promise<RatingLesson[]> {
    if (ids.length === 0) return [];
    const { data, error } = await this.db.from('lessons').select(LESSON_SELECT).in('id', [...ids]);
    if (error) throw dbError(error);
    return data;
  }

  /** The guardian whose phone this is; null for a lead, a teacher or an unknown number. */
  async guardianByPhone(phone: string): Promise<RatingGuardian | null> {
    const { data, error } = await this.db.from('guardians').select('id, phone_e164, tz').eq('phone_e164', phone).maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The newest lesson of this guardian's children that took place and has started (null: none yet). */
  async latestHeld(input: { guardianId: string; now: Date }): Promise<RatingLesson | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, lesson_students!inner(student:students!inner(guardian_id))')
      .in('status', [...HELD])
      .eq('lesson_students.student.guardian_id', input.guardianId)
      .lte('starts_at', input.now.toISOString())
      .order('starts_at', { ascending: false })
      .limit(1);
    if (error) throw dbError(error);
    const id = data[0]?.id;
    return id ? ((await this.byIds([id]))[0] ?? null) : null;
  }

  async approved(): Promise<boolean> {
    return (await approvedTemplates(this.db, [RATING_TEMPLATE])).has(RATING_TEMPLATE);
  }

  queue(rows: readonly QueuedMessage[]): Promise<number> {
    return queueMessages(this.db, rows);
  }
}
