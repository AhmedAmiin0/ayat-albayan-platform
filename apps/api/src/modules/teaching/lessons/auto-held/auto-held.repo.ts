import { AUTO_OUTCOME_REASONS, OPEN_LESSON_STATUSES } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { DB, type Db } from '@/common/db/db.module';
import { readAll, readChunked } from '@/common/db/read-all';
import { dbError } from '@/common/http/http';
import type { OpenEndedLesson, PackageRow } from './auto-held.plan';

const DAY_MS = 86_400_000;
/** A family reminder the platform got out (owner 2026-11-03: sent, delivered or read). */
const REMINDER_OUT = ['sent', 'delivered', 'read'] as const;
const sinceSchema = z.iso.datetime({ offset: true });
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
        // starts_at is indexed (ends_at is not): no lesson runs longer than a day.
        .gte('starts_at', new Date(w.from.getTime() - DAY_MS).toISOString())
        .lte('starts_at', w.until.toISOString())
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
      this.db.from('subscriptions').select('student_id, starts_on, status, cancel_kind').in('student_id', chunk),
    );
  }

  /** lesson_outcomes_since() (migration 999): the job never settles a lesson that ended before. */
  async outcomesSince(): Promise<Date> {
    const { data, error } = await this.db.rpc('lesson_outcomes_since');
    if (error) throw dbError(error);
    return new Date(sinceSchema.parse(data));
  }

  /** Of these lessons, the ids whose family reminder (lesson_reminder*) the platform sent. */
  async reminded(lessonIds: readonly string[]): Promise<Set<string>> {
    const rows = await readChunked(lessonIds, (chunk) =>
      this.db
        .from('messages')
        .select('lesson_id')
        .in('lesson_id', chunk)
        .eq('direction', 'outbound')
        .not('guardian_id', 'is', null)
        .like('template_key', 'lesson_reminder%')
        .in('status', [...REMINDER_OUT]),
    );
    return new Set(rows.flatMap((r) => (r.lesson_id === null ? [] : [r.lesson_id])));
  }

  /** Of these lessons, the ids the job settled (an audit after.reason auto_held | auto_no_show). */
  async autoHeld(lessonIds: readonly string[]): Promise<Set<string>> {
    const rows = await readChunked(lessonIds, (chunk) =>
      this.db
        .from('audit_log')
        .select('entity_id')
        .eq('entity', 'lessons')
        .in('entity_id', chunk)
        .in('after->>reason', [...AUTO_OUTCOME_REASONS]),
    );
    return new Set(rows.map((r) => r.entity_id));
  }

  /** Of these lessons, the ids with a submitted تقرير الحلقة (its outcome is the report's). */
  async reported(lessonIds: readonly string[]): Promise<Set<string>> {
    const rows = await readChunked(lessonIds, (chunk) =>
      this.db
        .from('lesson_reports')
        .select('lesson_id')
        .in('lesson_id', chunk)
        .eq('status', 'submitted'),
    );
    return new Set(rows.map((r) => r.lesson_id));
  }

  /**
   * Completed lessons the job closed and no report has spoken for since: «لم تنعقد؟» may correct
   * them.
   */
  async correctable(lessonIds: readonly string[]): Promise<Set<string>> {
    if (lessonIds.length === 0) return new Set();
    const [held, reported] = await Promise.all([
      this.autoHeld(lessonIds),
      this.reported(lessonIds),
    ]);
    return new Set([...held].filter((id) => !reported.has(id)));
  }

  /** The lesson's teacher earning has money paid out on it (a per-session payment). */
  async paid(lessonId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('teacher_session_earnings')
      .select('paid_amount')
      .eq('lesson_id', lessonId)
      .gt('paid_amount', 0)
      .limit(1);
    if (error) throw dbError(error);
    return data.length > 0;
  }
}
