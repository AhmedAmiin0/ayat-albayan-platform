import type { Tables } from '@ab/db';
import { OPEN_LESSON_STATUSES } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { dbError } from '../../../../common/http/http';

/** Whitelisted lesson columns for sales: never meeting_link, reasons, attendance, notes or money. */
const SALES_SCHEDULE_SELECT =
  'id, starts_at, ends_at, status, makeup_of_id, rule:schedule_rules!lessons_rule_id_fkey(package), teacher:teachers(id, display_name_ar, display_name_en, tz), lesson_students(student:students(id, code, name, tz))' as const;

export interface SalesScheduleRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: Tables<'lessons'>['status'];
  makeup_of_id: string | null;
  rule: { package: string | null } | null;
  /** tz optional in test fakes. */
  teacher: { id: string; display_name_ar: string; display_name_en: string | null; tz?: string } | null;
  lesson_students: { student: { id: string; code: string | null; name: string; tz?: string } | null }[];
}

export interface UpcomingRow {
  starts_at: string;
  lesson_students: { student_id: string }[];
}

interface DayRange {
  from: Date;
  to: Date;
  teacherId?: string | undefined;
}

/**
 * The salesperson's read-only schedule (owner report 2026-10-12), read with the service role: one
 * Riyadh day of lessons and the next open lessons (for «الحلقة القادمة»). Each select is a whitelist.
 */
@Injectable()
export class SalesScheduleQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Lessons starting inside [from, to), by start; a moved-away lesson (`rescheduled`) is left out. */
  async day(range: DayRange): Promise<SalesScheduleRow[]> {
    let query = this.db
      .from('lessons')
      .select(SALES_SCHEDULE_SELECT)
      .gte('starts_at', range.from.toISOString())
      .lt('starts_at', range.to.toISOString())
      .neq('status', 'rescheduled');
    if (range.teacherId) query = query.eq('teacher_id', range.teacherId);
    const { data, error } = await query.order('starts_at');
    if (error) throw dbError(error);
    return data;
  }

  /** Open lessons starting inside [from, to), by start, with their students' ids only. */
  async upcoming(range: DayRange): Promise<UpcomingRow[]> {
    const { data, error } = await this.db
      .from('lessons')
      .select('starts_at, lesson_students(student_id)')
      .gte('starts_at', range.from.toISOString())
      .lt('starts_at', range.to.toISOString())
      .in('status', [...OPEN_LESSON_STATUSES])
      .order('starts_at');
    if (error) throw dbError(error);
    return data;
  }
}
