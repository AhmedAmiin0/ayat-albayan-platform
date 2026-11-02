import { AUTO_HELD_REASON, OPEN_LESSON_STATUSES } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { readAll, readChunked } from '@/common/db/read-all';
import type { OpenEndedLesson, PackageRow } from './auto-held.plan';

const OPEN_SELECT = 'id, status, ends_at, lesson_students(student_id, student:students(tz))';

/** Reads of the auto-held job and of its correction (service role; the routes guard). */
@Injectable()
export class AutoHeldRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Scheduled / confirmed lessons that ended in [from, until], oldest end first. */
  openEnded(w: { from: Date; until: Date }): Promise<OpenEndedLesson[]> {
    return readAll((from, to) =>
      this.db
        .from('lessons')
        .select(OPEN_SELECT)
        .in('status', [...OPEN_LESSON_STATUSES])
        .gte('ends_at', w.from.toISOString())
        .lte('ends_at', w.until.toISOString())
        .order('ends_at')
        .order('id')
        .range(from, to),
    );
  }

  /** Every package of these students (the plan keeps the current one). */
  packages(studentIds: readonly string[]): Promise<PackageRow[]> {
    return readChunked(studentIds, (chunk) =>
      this.db.from('subscriptions').select('student_id, starts_on, status').in('student_id', chunk),
    );
  }

  /** Of these lessons, the ids the job closed (an audit row with after.reason = auto_held). */
  async autoHeld(lessonIds: readonly string[]): Promise<Set<string>> {
    const rows = await readChunked(lessonIds, (chunk) =>
      this.db
        .from('audit_log')
        .select('entity_id')
        .eq('entity', 'lessons')
        .in('entity_id', chunk)
        .eq('after->>reason', AUTO_HELD_REASON),
    );
    return new Set(rows.map((r) => r.entity_id));
  }

  /** Of these lessons, the ids with a submitted تقرير الحلقة (its outcome is the report's). */
  async reported(lessonIds: readonly string[]): Promise<Set<string>> {
    const rows = await readChunked(lessonIds, (chunk) =>
      this.db.from('lesson_reports').select('lesson_id').in('lesson_id', chunk).eq('status', 'submitted'),
    );
    return new Set(rows.map((r) => r.lesson_id));
  }

  /** Completed lessons the job closed and no report has spoken for since: «لم تنعقد؟» may correct them. */
  async correctable(lessonIds: readonly string[]): Promise<Set<string>> {
    if (lessonIds.length === 0) return new Set();
    const [held, reported] = await Promise.all([this.autoHeld(lessonIds), this.reported(lessonIds)]);
    return new Set([...held].filter((id) => !reported.has(id)));
  }
}
