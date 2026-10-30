import type { Attendance, LessonStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { WEEKLY_RULE_COLUMNS, type WeeklyRuleRow } from '@/modules/sales/sales/schedule/weekly-slot';

/** An active rule of one of the page's students (never its link or subscription). */
export interface RosterRuleRow {
  student_id: string;
  rule: WeeklyRuleRow;
}

/** A student's active package start: of subscriptions the date only, never a price or payment. */
export interface RosterPackageRow {
  student_id: string;
  starts_on: string;
}

/** A past lesson of one of the page's students: its status and the student's own attendance. */
export interface RosterLessonRow {
  student_id: string;
  attendance: Attendance | null;
  lesson: { starts_at: string; status: LessonStatus };
}

const RULE_SELECT = `student_id, rule:schedule_rules!inner(${WEEKLY_RULE_COLUMNS})` as const;
const LESSON_SELECT = 'student_id, attendance, lesson:lessons!inner(starts_at, status)' as const;

/** PostgREST answers at most 1000 rows (config.toml max_rows): lessons are read in such pages. */
const PAGE = 1000;
const MAX_PAGES = 10;

/**
 * «كل الطلاب»'s schedule and attendance (owner 2026-10-30): one read per kind for the WHOLE page of
 * students, never one per row. Service role, whitelisted columns: never a price, payment or link.
 */
@Injectable()
export class SalesRosterRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async rules(studentIds: readonly string[]): Promise<RosterRuleRow[]> {
    if (studentIds.length === 0) return [];
    const { data, error } = await this.db
      .from('schedule_rule_students')
      .select(RULE_SELECT)
      .in('student_id', [...studentIds])
      .eq('rule.status', 'active');
    if (error) throw dbError(error);
    return data;
  }

  /** The students' active packages (status active), the start date only. */
  async packages(studentIds: readonly string[]): Promise<RosterPackageRow[]> {
    if (studentIds.length === 0) return [];
    const { data, error } = await this.db
      .from('subscriptions')
      .select('student_id, starts_on')
      .in('student_id', [...studentIds])
      .eq('status', 'active');
    if (error) throw dbError(error);
    return data;
  }

  /** The students' lessons that started inside [from, to), in pages of PAGE rows. */
  async lessons(
    studentIds: readonly string[],
    w: { from: Date; to: Date },
  ): Promise<RosterLessonRow[]> {
    const out: RosterLessonRow[] = [];
    for (let page = 0; studentIds.length > 0 && page < MAX_PAGES; page += 1) {
      const rows = await this.lessonPage(studentIds, { ...w, page });
      out.push(...rows);
      if (rows.length < PAGE) break;
    }
    return out;
  }

  private async lessonPage(
    studentIds: readonly string[],
    w: { from: Date; to: Date; page: number },
  ): Promise<RosterLessonRow[]> {
    const { data, error } = await this.db
      .from('lesson_students')
      .select(LESSON_SELECT)
      .in('student_id', [...studentIds])
      .gte('lesson.starts_at', w.from.toISOString())
      .lt('lesson.starts_at', w.to.toISOString())
      .order('lesson_id')
      .order('student_id')
      .range(w.page * PAGE, w.page * PAGE + PAGE - 1)
      .overrideTypes<RosterLessonRow[], { merge: false }>();
    if (error) throw dbError(error);
    return data;
  }
}
